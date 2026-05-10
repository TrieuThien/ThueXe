import crypto from "crypto";
import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import { isPointInCoverage, getDistanceKm } from "../utils/locationUtils.js";
import {
    assignRentalDriverVehicle,
    countExistingRentalNotificationsForDrivers,
    createRentalBooking,
    createRentalPackage,
    findAvailableDriversForRental,
    findDriverById,
    findRentalBookingById,
    findRentalByIdForUpdate,
    findRentalPackageById,
    findVehicleById,
    insertDriverNotificationsBatch,
    listActivePackagesWithGeo,
    listPackageCars,
    listRentalBookings,
    listRentalDrivers,
    listRentalPackages,
    listRentalVehicles,
    listVehiclePackages,
    replaceVehiclePackages,
    updateRentalPackage,
    updateRentalStatus,
} from "../repositories/rentalRepository.js";
import { calcOwnerRequiredBalance, findWalletByActor } from "../repositories/walletRepository.js";

// n_type = 10 cho thông báo "yêu cầu thuê tài xế" trong driver_notifications
const DRIVER_RENTAL_NOTIFY_TYPE = 10;

const RENTAL_STATUSES = ["scheduled", "pending", "in_progress", "completed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "refunded"];

function toNullableString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function parseDatetime(value, fieldName) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
        throw new AppError(`${fieldName} must be a valid datetime.`, 422, "INVALID_DATETIME");
    }
    return date;
}

function generateRentalCode() {
    return crypto.createHash("md5").update(`${Date.now()}-${crypto.randomBytes(8).toString("hex")}`).digest("hex");
}

async function runInTransaction(work) {
    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

function ensureServiceType(serviceTypeInput) {
    const serviceType = Number(serviceTypeInput);
    if (![1, 2, 3].includes(serviceType)) {
        throw new AppError("service_type must be one of 1,2,3.", 422, "INVALID_SERVICE_TYPE");
    }
    return serviceType;
}

function ensureActorCanAccessRental(auth, rental) {
    if (["admin", "dispatcher"].includes(auth.role)) return;
    if (auth.role === "passenger" && Number(rental.user_id) === Number(auth.userId)) return;
    if (auth.role === "driver" && Number(rental.driver_id || 0) === Number(auth.userId)) return;
    throw new AppError("Forbidden", 403, "FORBIDDEN");
}

export async function getRentalPackageList({ query }) {
    return {
        items: await listRentalPackages({
            serviceType: query.service_type === undefined || query.service_type === "" ? undefined : Number(query.service_type),
            active: query.active === undefined || query.active === "" ? undefined : Number(query.active),
            search: toNullableString(query.search),
        }),
    };
}

/** Trích xuất và validate dữ liệu GIS từ payload */
function extractGeoPayload(payload) {
    const coverageType = payload.coverage_type || null;
    if (coverageType && !['polygon', 'circle', 'rectangle'].includes(coverageType)) {
        throw new AppError("coverage_type must be polygon, circle, or rectangle.", 422, "INVALID_COVERAGE_TYPE");
    }

    // circle: bắt buộc có center + radius
    if (coverageType === 'circle') {
        if (payload.center_lat == null || payload.center_lng == null || payload.radius_km == null) {
            throw new AppError("center_lat, center_lng, radius_km are required for circle coverage.", 422, "MISSING_CIRCLE_PARAMS");
        }
    }

    // polygon / rectangle: bắt buộc có GeoJSON
    if (coverageType === 'polygon' || coverageType === 'rectangle') {
        if (!payload.coverage_geojson) {
            throw new AppError("coverage_geojson is required for polygon/rectangle coverage.", 422, "MISSING_GEOJSON");
        }
    }

    return {
        coverage_type: coverageType,
        coverage_geojson: coverageType && coverageType !== 'circle' ? (payload.coverage_geojson || null) : null,
        center_lat: coverageType === 'circle' ? toNumber(payload.center_lat, null) : null,
        center_lng: coverageType === 'circle' ? toNumber(payload.center_lng, null) : null,
        radius_km: coverageType === 'circle' ? toNumber(payload.radius_km, null) : null,
        is_geo_enabled: payload.is_geo_enabled !== undefined ? Number(payload.is_geo_enabled) : 1,
    };
}

export async function createRentalPackageService({ payload }) {
    const serviceType = ensureServiceType(payload.service_type);
    const price = toNumber(payload.price, NaN);
    if (!(price >= 0)) {
        throw new AppError("price must be a non-negative number.", 422, "INVALID_PRICE");
    }
    const geoData = extractGeoPayload(payload);

    const packageId = await createRentalPackage({
        type_id: payload.type_id === undefined || payload.type_id === null || payload.type_id === "" ? null : Number(payload.type_id),
        service_type: serviceType,
        package_name: String(payload.package_name || "").trim(),
        duration_hours: payload.duration_hours === undefined || payload.duration_hours === null || payload.duration_hours === "" ? null : Number(payload.duration_hours),
        duration_days: payload.duration_days === undefined || payload.duration_days === null || payload.duration_days === "" ? null : Number(payload.duration_days),
        price,
        distance_limit_km: toNumber(payload.distance_limit_km, 0),
        extra_km_fee: toNumber(payload.extra_km_fee, 0),
        extra_hour_fee: toNumber(payload.extra_hour_fee, 0),
        deposit_amount: toNumber(payload.deposit_amount, 0),
        description: toNullableString(payload.description),
        active: payload.active === undefined ? 1 : Number(payload.active),
        ...geoData,
    });

    const created = await findRentalPackageById(packageId);
    return { package: created };
}

export async function updateRentalPackageService({ packageId, payload }) {
    const numericPackageId = Number(packageId);
    if (!Number.isInteger(numericPackageId) || numericPackageId < 1) {
        throw new AppError("Invalid package id.", 422, "INVALID_PACKAGE_ID");
    }
    const existing = await findRentalPackageById(numericPackageId);
    if (!existing) {
        throw new AppError("Rental package not found.", 404, "RENTAL_PACKAGE_NOT_FOUND");
    }

    const serviceType = ensureServiceType(payload.service_type ?? existing.service_type);

    // Merge GIS data: nếu gửi coverage_type mới thì dùng extractGeoPayload,
    // nếu không gửi thì giữ dữ liệu cũ.
    let geoData;
    if (payload.coverage_type !== undefined || payload.is_geo_enabled !== undefined) {
        // Admin đang cập nhật vùng → validate lại hoàn toàn
        const mergedPayload = {
            coverage_type: payload.coverage_type ?? existing.coverage_type,
            coverage_geojson: payload.coverage_geojson ?? existing.coverage_geojson,
            center_lat: payload.center_lat ?? existing.center_lat,
            center_lng: payload.center_lng ?? existing.center_lng,
            radius_km: payload.radius_km ?? existing.radius_km,
            is_geo_enabled: payload.is_geo_enabled ?? existing.is_geo_enabled,
        };
        geoData = extractGeoPayload(mergedPayload);
    } else {
        // Không chạm GIS → giữ nguyên
        geoData = {
            coverage_type: existing.coverage_type,
            coverage_geojson: existing.coverage_geojson,
            center_lat: existing.center_lat,
            center_lng: existing.center_lng,
            radius_km: existing.radius_km,
            is_geo_enabled: existing.is_geo_enabled,
        };
    }

    const data = {
        type_id: payload.type_id ?? existing.type_id,
        service_type: serviceType,
        package_name: toNullableString(payload.package_name) || existing.package_name,
        duration_hours: payload.duration_hours ?? existing.duration_hours,
        duration_days: payload.duration_days ?? existing.duration_days,
        price: payload.price !== undefined ? toNumber(payload.price, NaN) : existing.price,
        distance_limit_km: payload.distance_limit_km !== undefined ? toNumber(payload.distance_limit_km, 0) : existing.distance_limit_km,
        extra_km_fee: payload.extra_km_fee !== undefined ? toNumber(payload.extra_km_fee, 0) : existing.extra_km_fee,
        extra_hour_fee: payload.extra_hour_fee !== undefined ? toNumber(payload.extra_hour_fee, 0) : existing.extra_hour_fee,
        deposit_amount: payload.deposit_amount !== undefined ? toNumber(payload.deposit_amount, 0) : existing.deposit_amount,
        description: payload.description !== undefined ? toNullableString(payload.description) : existing.description,
        active: payload.active !== undefined ? Number(payload.active) : existing.active,
        ...geoData,
    };
    if (!(data.price >= 0)) throw new AppError("price must be non-negative.", 422, "INVALID_PRICE");

    await updateRentalPackage(numericPackageId, data);
    return { package: await findRentalPackageById(numericPackageId) };
}

export async function rentalMetaService({ query }) {
    const typeId = query.type_id === undefined || query.type_id === "" ? undefined : Number(query.type_id);
    const ownerId = query.owner_id === undefined || query.owner_id === "" ? undefined : Number(query.owner_id);
    const routeId = query.route_id === undefined || query.route_id === "" ? undefined : Number(query.route_id);
    const rideId = query.ride_id === undefined || query.ride_id === "" ? undefined : Number(query.ride_id);
    const [vehicles, drivers] = await Promise.all([
        listRentalVehicles({ typeId, ownerId }),
        listRentalDrivers({ routeId, rideId }),
    ]);
    return {
        vehicles,
        drivers,
        service_types: [
            { value: 1, label: "vehicle_rental" },
            { value: 2, label: "driver_hiring" },
            { value: 3, label: "vehicle_with_driver" },
        ],
    };
}

export async function createRentalBookingService({ payload, auth }) {
    if (auth.role !== "passenger" && !["admin", "dispatcher"].includes(auth.role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const serviceType = ensureServiceType(payload.service_type);
    const userId = auth.role === "passenger" ? Number(auth.userId) : Number(payload.user_id);
    if (!Number.isInteger(userId) || userId < 1) {
        throw new AppError("user_id is required.", 422, "INVALID_USER_ID");
    }

    const start = parseDatetime(payload.start_datetime, "start_datetime");
    const end = parseDatetime(payload.end_datetime, "end_datetime");
    if (end.getTime() <= start.getTime()) {
        throw new AppError("end_datetime must be greater than start_datetime.", 422, "INVALID_TIME_RANGE");
    }

    const packageId = payload.package_id === undefined || payload.package_id === null || payload.package_id === "" ? null : Number(payload.package_id);

    return runInTransaction(async (conn) => {
        let rentalPackage = null;
        if (packageId) {
            rentalPackage = await findRentalPackageById(packageId, conn);
            if (!rentalPackage) throw new AppError("Rental package not found.", 404, "RENTAL_PACKAGE_NOT_FOUND");
            if (rentalPackage.active !== 1) throw new AppError("Rental package is inactive.", 409, "RENTAL_PACKAGE_INACTIVE");
        }

        const vehicleId = payload.vehicle_id === undefined || payload.vehicle_id === null || payload.vehicle_id === "" ? null : Number(payload.vehicle_id);
        const driverId = payload.driver_id === undefined || payload.driver_id === null || payload.driver_id === "" ? null : Number(payload.driver_id);

        let vehicle = null;
        let driver = null;
        if (serviceType === 1 || serviceType === 3) {
            if (!vehicleId) throw new AppError("vehicle_id is required for service type.", 422, "MISSING_VEHICLE_ID");
            vehicle = await findVehicleById(vehicleId, conn);
            if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
            if (vehicle.is_verified !== 1 || vehicle.status !== "available") {
                throw new AppError("Vehicle is not available for rental.", 409, "VEHICLE_NOT_AVAILABLE");
            }
        }
        if (serviceType === 2 || serviceType === 3) {
            if (!driverId) throw new AppError("driver_id is required for service type.", 422, "MISSING_DRIVER_ID");
            driver = await findDriverById(driverId, conn);
            if (!driver) throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
            if (driver.account_deleted === 1 || driver.account_active !== 1 || driver.is_activated !== 1 || driver.available_for_rental !== 1) {
                throw new AppError("Driver is not available for rental.", 409, "DRIVER_NOT_AVAILABLE");
            }
        }

        const basePrice = rentalPackage ? rentalPackage.price : toNumber(payload.base_price, 0);
        if (!(basePrice >= 0)) throw new AppError("base_price must be non-negative.", 422, "INVALID_BASE_PRICE");
        const distanceLimitKm = rentalPackage ? rentalPackage.distance_limit_km : toNumber(payload.distance_limit_km, 0);
        const deposit = rentalPackage ? rentalPackage.deposit_amount : toNumber(payload.deposit_amount, 0);
        const totalPrice = Number((basePrice + deposit).toFixed(2));

        const rentalId = await createRentalBooking(
            {
                rental_code: generateRentalCode(),
                user_id: userId,
                vehicle_id: vehicleId,
                driver_id: driverId,
                package_id: packageId,
                owner_id: vehicle ? vehicle.owner_id : null,
                service_type: serviceType,
                start_datetime: start.toISOString().slice(0, 19).replace("T", " "),
                end_datetime: end.toISOString().slice(0, 19).replace("T", " "),
                pickup_address: String(payload.pickup_address || "").trim(),
                pickup_long: payload.pickup_long,
                pickup_lat: payload.pickup_lat,
                dropoff_address: toNullableString(payload.dropoff_address),
                dropoff_long: payload.dropoff_long,
                dropoff_lat: payload.dropoff_lat,
                distance_limit_km: distanceLimitKm,
                base_price: basePrice,
                extra_time_fee: 0,
                extra_distance_fee: 0,
                deposit_amount: deposit,
                total_price: totalPrice,
                payment_status: "pending",
                payment_type: payload.payment_type === undefined || payload.payment_type === "" ? null : Number(payload.payment_type),
                status: "scheduled",
            },
            conn
        );

        const created = await findRentalBookingById(rentalId, conn);

        // Sau khi commit, nếu đơn là thuê tài xế (service_type=2) và chưa gán driver cụ thể,
        // tìm và thông báo cho các tài xế phù hợp (bất đồng bộ, không ảnh hưởng response)
        if (serviceType === 2 && !driverId) {
            const startStr = start.toISOString().slice(0, 19).replace("T", " ");
            const endStr = end.toISOString().slice(0, 19).replace("T", " ");
            notifyAvailableDriversService({
                rentalId,
                startDatetime: startStr,
                endDatetime: endStr,
                packageInfo: rentalPackage,
            }).catch(() => { });
        }

        return { rental: created };
    });
}

export async function listRentalBookingsService({ query, auth }) {
    const filters = {
        status: toNullableString(query.status),
        search: toNullableString(query.search),
        page: query.page,
        limit: query.limit,
    };
    if (query.service_types) {
        filters.serviceTypes = String(query.service_types).split(",").map(Number).filter(Number.isFinite);
    } else if (query.service_type !== undefined && query.service_type !== "") {
        filters.serviceType = Number(query.service_type);
    }
    if (auth.role === "passenger") {
        filters.userId = Number(auth.userId);
    } else if (auth.role === "driver") {
        filters.driverId = Number(auth.userId);
    }
    return listRentalBookings(filters);
}

export async function getRentalBookingDetailService({ rentalId, auth }) {
    const numericRentalId = Number(rentalId);
    if (!Number.isInteger(numericRentalId) || numericRentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }
    const booking = await findRentalBookingById(numericRentalId);
    if (!booking) throw new AppError("Rental booking not found.", 404, "RENTAL_NOT_FOUND");
    ensureActorCanAccessRental(auth, booking);

    // Điều kiện: Chỉ trả về thông tin chủ xe/tài xế khi status = "in_progress"
    let result = { ...booking };
    if (booking.status !== "in_progress") {
        result.owner_name = null;
        result.owner_phone = null;
        result.driver_phone = null;
    }
    
    return { booking: result };
}

function calculateOvertimeHours(endDatetime, actualEndDatetime) {
    const overtimeMs = Math.max(actualEndDatetime.getTime() - endDatetime.getTime(), 0);
    return Math.ceil(overtimeMs / (60 * 60 * 1000));
}

export async function updateRentalStatusService({ rentalId, payload, auth }) {
    const numericRentalId = Number(rentalId);
    if (!Number.isInteger(numericRentalId) || numericRentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }
    const targetStatus = String(payload.status || "").trim();
    if (!RENTAL_STATUSES.includes(targetStatus)) {
        throw new AppError("Invalid rental status.", 422, "INVALID_RENTAL_STATUS");
    }

    return runInTransaction(async (conn) => {
        const rental = await findRentalByIdForUpdate(numericRentalId, conn);
        if (!rental) throw new AppError("Rental booking not found.", 404, "RENTAL_NOT_FOUND");
        ensureActorCanAccessRental(auth, rental);

        if (auth.role === "passenger" && !["cancelled"].includes(targetStatus)) {
            throw new AppError("Passenger can only cancel rental booking.", 403, "FORBIDDEN_STATUS_CHANGE");
        }
        if (rental.status === "completed" || rental.status === "cancelled") {
            throw new AppError("Rental booking is already finalized.", 409, "RENTAL_FINALIZED");
        }

        let extraTimeFee = 0;
        let extraDistanceFee = 0;
        let totalPrice = rental.total_price;
        let actualEndDatetime = null;

        if (targetStatus === "completed") {
            const actualEnd = payload.actual_end_datetime
                ? parseDatetime(payload.actual_end_datetime, "actual_end_datetime")
                : new Date();
            actualEndDatetime = actualEnd.toISOString().slice(0, 19).replace("T", " ");
            const packageInfo = rental.package_id
                ? await findRentalPackageById(Number(rental.package_id), conn).catch(() => null)
                : null;
            const overtimeHours = calculateOvertimeHours(new Date(rental.end_datetime), actualEnd);
            const extraHourFee = packageInfo ? packageInfo.extra_hour_fee : toNumber(payload.extra_hour_fee, 0);
            extraTimeFee = Number((overtimeHours * extraHourFee).toFixed(2));

            const travelledKm = toNumber(payload.distance_travelled_km, rental.distance_travelled_km);
            const exceedKm = Math.max(travelledKm - rental.distance_limit_km, 0);
            const extraKmFeeRate = packageInfo ? packageInfo.extra_km_fee : toNumber(payload.extra_km_fee, 0);
            extraDistanceFee = Number((exceedKm * extraKmFeeRate).toFixed(2));
            totalPrice = Number((rental.base_price + rental.deposit_amount + extraTimeFee + extraDistanceFee).toFixed(2));
        }

        await updateRentalStatus(
            {
                rental_id: numericRentalId,
                status: targetStatus,
                cancel_reason: targetStatus === "cancelled" ? toNullableString(payload.cancel_reason) : null,
                actual_end_datetime: actualEndDatetime,
                extra_time_fee: extraTimeFee,
                extra_distance_fee: extraDistanceFee,
                total_price: totalPrice,
            },
            conn
        );

        const updated = await findRentalBookingById(numericRentalId, conn);
        return { rental: updated };
    });
}

export async function assignRentalService({ rentalId, payload }) {
    const numericRentalId = Number(rentalId);
    if (!Number.isInteger(numericRentalId) || numericRentalId < 1) {
        throw new AppError("Invalid rental id.", 422, "INVALID_RENTAL_ID");
    }
    const driverId = payload.driver_id === undefined || payload.driver_id === null || payload.driver_id === "" ? null : Number(payload.driver_id);
    const vehicleId = payload.vehicle_id === undefined || payload.vehicle_id === null || payload.vehicle_id === "" ? null : Number(payload.vehicle_id);

    return runInTransaction(async (conn) => {
        const rental = await findRentalByIdForUpdate(numericRentalId, conn);
        if (!rental) throw new AppError("Rental booking not found.", 404, "RENTAL_NOT_FOUND");
        if (rental.status === "completed" || rental.status === "cancelled") {
            throw new AppError("Cannot assign finalized rental booking.", 409, "RENTAL_FINALIZED");
        }

        let ownerId = rental.owner_id;
        if (vehicleId) {
            const vehicle = await findVehicleById(vehicleId, conn);
            if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
            if (vehicle.is_verified !== 1 || vehicle.status !== "available") {
                throw new AppError("Vehicle is not available.", 409, "VEHICLE_NOT_AVAILABLE");
            }
            ownerId = vehicle.owner_id;
        }
        if (driverId) {
            const driver = await findDriverById(driverId, conn);
            if (!driver) throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
            if (driver.account_deleted === 1 || driver.account_active !== 1 || driver.is_activated !== 1 || driver.available_for_rental !== 1) {
                throw new AppError("Driver is not available.", 409, "DRIVER_NOT_AVAILABLE");
            }
        }

        await assignRentalDriverVehicle(
            {
                rental_id: numericRentalId,
                driver_id: driverId,
                vehicle_id: vehicleId,
                owner_id: ownerId,
            },
            conn
        );

        return { rental: await findRentalBookingById(numericRentalId, conn) };
    });
}

// ─── Owner: xem gói thuê chuẩn dành cho xe (service_type=1, active=1) ─────────

export async function listOwnerRentalPackagesService() {
    return {
        items: await listRentalPackages({ serviceType: 1, active: 1 }),
    };
}

// ─── Owner: xem gói thuê đã gán cho xe ────────────────────────────────────────

export async function getVehiclePackagesService({ ownerId, vehicleId }) {
    const numericVehicleId = Number(vehicleId);
    if (!Number.isInteger(numericVehicleId) || numericVehicleId < 1) {
        throw new AppError("Invalid vehicle id.", 422, "INVALID_VEHICLE_ID");
    }
    const vehicle = await findVehicleById(numericVehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    if (Number(vehicle.owner_id) !== Number(ownerId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const packages = await listVehiclePackages(numericVehicleId);
    return { vehicle_id: numericVehicleId, packages };
}

// ─── Owner: gán gói thuê vào xe ───────────────────────────────────────────────

export async function setVehiclePackagesService({ ownerId, vehicleId, packageIds }) {
    const numericVehicleId = Number(vehicleId);
    if (!Number.isInteger(numericVehicleId) || numericVehicleId < 1) {
        throw new AppError("Invalid vehicle id.", 422, "INVALID_VEHICLE_ID");
    }
    if (!Array.isArray(packageIds)) {
        throw new AppError("package_ids must be an array.", 422, "INVALID_PACKAGE_IDS");
    }

    return runInTransaction(async (conn) => {
        const vehicle = await findVehicleById(numericVehicleId, conn);
        if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
        if (Number(vehicle.owner_id) !== Number(ownerId)) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }

        // Loại trùng, bỏ giá trị không hợp lệ
        const uniqueIds = [...new Set(packageIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];

        for (const pid of uniqueIds) {
            const pkg = await findRentalPackageById(pid, conn);
            if (!pkg) {
                throw new AppError(`Rental package #${pid} not found.`, 404, "RENTAL_PACKAGE_NOT_FOUND");
            }
            if (pkg.active !== 1) {
                throw new AppError(`Rental package #${pid} is inactive.`, 409, "RENTAL_PACKAGE_INACTIVE");
            }
            if (pkg.service_type !== 1) {
                throw new AppError(`Rental package #${pid} is not for vehicle rental (service_type must be 1).`, 422, "INVALID_PACKAGE_SERVICE_TYPE");
            }
            // Nếu gói có ràng buộc type_id thì phải khớp với loại xe
            if (pkg.type_id !== null && pkg.type_id !== vehicle.type_id) {
                throw new AppError(
                    `Rental package #${pid} is not compatible with this vehicle type (required type_id=${pkg.type_id}, vehicle type_id=${vehicle.type_id}).`,
                    422,
                    "PACKAGE_TYPE_MISMATCH"
                );
            }
        }

        await replaceVehiclePackages(numericVehicleId, uniqueIds, conn);

        if (uniqueIds.length > 0) {
            const required = await calcOwnerRequiredBalance(ownerId, conn);
            const wallet = await findWalletByActor({ actorType: 2, actorId: Number(ownerId) }, conn);
            const balance = wallet ? Number(wallet.balance) : 0;
            if (balance < required) {
                throw new AppError(
                    `Số dư ví không đủ để đảm bảo tiền cọc. Cần tối thiểu ${required} VND, hiện có ${balance} VND.`,
                    409,
                    "OWNER_INSUFFICIENT_COLLATERAL"
                );
            }
        }

        const packages = await listVehiclePackages(numericVehicleId, conn);
        return { vehicle_id: numericVehicleId, packages };
    });
}

// ─── Gửi thông báo cho tài xế phù hợp khi có đơn thuê tài xế ────────────────

export async function notifyAvailableDriversService({ rentalId, startDatetime, endDatetime, packageInfo }) {
    // Tránh tạo thông báo trùng cho cùng 1 đơn
    const existing = await countExistingRentalNotificationsForDrivers(rentalId);
    if (existing > 0) return { notified: 0, skipped: true };

    const drivers = await findAvailableDriversForRental(startDatetime, endDatetime);
    if (!drivers.length) return { notified: 0, skipped: false };

    const content = JSON.stringify({
        rental_id: rentalId,
        package_name: packageInfo?.package_name || null,
        price: packageInfo?.price || null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        duration_hours: packageInfo?.duration_hours || null,
    });

    const notifications = drivers.map((d) => ({
        driver_id: d.driver_id,
        content,
        rental_id: rentalId,
        n_type: DRIVER_RENTAL_NOTIFY_TYPE,
    }));

    await insertDriverNotificationsBatch(notifications);
    return { notified: notifications.length };
}

// ─── Mobile: tìm gói thuê gần vị trí người dùng ─────────────────────────────

/**
 * Lấy tất cả gói đang active, lọc theo vị trí người dùng bằng thuật toán GIS.
 * Nếu gói chưa cấu hình vùng (is_geo_enabled=0 hoặc không có coverage_type)
 * thì vẫn trả về (áp dụng toàn quốc).
 */
export async function getNearbyPackagesService({ lat, lng, serviceType }) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new AppError("lat and lng must be valid numbers.", 422, "INVALID_COORDINATES");
    }

    const allPackages = await listActivePackagesWithGeo();

    // Lọc theo service_type nếu được truyền
    const filtered = serviceType !== undefined
        ? allPackages.filter((p) => p.service_type === Number(serviceType))
        : allPackages;

    // Kiểm tra từng gói: vị trí người dùng có nằm trong vùng phủ không
    const nearby = filtered.filter((pkg) => isPointInCoverage(latitude, longitude, pkg));

    // Tính khoảng cách từ user đến tâm vùng (nếu là circle) hoặc để null
    const items = nearby.map((pkg) => {
        let distanceKm = null;
        if (pkg.coverage_type === 'circle' && pkg.center_lat != null && pkg.center_lng != null) {
            distanceKm = Number(getDistanceKm(latitude, longitude, pkg.center_lat, pkg.center_lng).toFixed(2));
        }
        return { ...pkg, distance_km: distanceKm };
    });

    return { items, total: items.length };
}

// ─── Mobile: lấy xe theo gói thuê ────────────────────────────────────────────

export async function getPackageCarsService({ packageId }) {
    const numericId = Number(packageId);
    if (!Number.isInteger(numericId) || numericId < 1) {
        throw new AppError("Invalid package id.", 422, "INVALID_PACKAGE_ID");
    }

    const pkg = await findRentalPackageById(numericId);
    if (!pkg) throw new AppError("Rental package not found.", 404, "RENTAL_PACKAGE_NOT_FOUND");
    if (pkg.active !== 1) throw new AppError("Rental package is inactive.", 409, "RENTAL_PACKAGE_INACTIVE");

    const cars = await listPackageCars(numericId);
    return { package_id: numericId, package_name: pkg.package_name, cars };
}

export { PAYMENT_STATUSES, RENTAL_STATUSES };
