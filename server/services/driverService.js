import sqldb from "../config/sqldatabase.js";
import { deleteCloudinaryImage, uploadBufferToCloudinary } from "../config/cloudinary.js";
import {
    countDrivers,
    findAdminPasswordById,
    findDriverAccountById,
    findDriverById,
    findDriverBookings,
    findDriverDocuments,
    findDriverMetaRides,
    findDriverMetaRoutes,
    findDriverReviews,
    findDrivers,
    findDriverTransactions,
    findDriverWithdrawalById,
    findDriverWithdrawals,
    findExistingAccountByEmail,
    findExistingAccountByPhone,
    findLatestDriverLocation,
    insertDriver,
    rideExists,
    routeExists,
    softDeleteDriverAccount as persistDriverSoftDelete,
    summarizeDrivers,
    updateDriverAccountStatus as persistDriverAccountStatus,
    updateDriverPersonalInfo as persistDriverPersonalInfo,
    updateDriverWithdrawalStatus,
} from "../repositories/driverRepository.js";
import AppError from "../utils/appError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const DRIVER_IMAGE_FOLDER = "thuexe/drivers";
const DEFAULT_COUNTRY = "Vietnam";
const DEFAULT_COUNTRY_CODE = "vn";
const DEFAULT_COUNTRY_DIAL_CODE = "+84";
const ALLOWED_DOCUMENT_STATUS = new Set(["no_documents", "pending", "failed", "expired", "approved"]);
const SORT_BY_WHITELIST = new Set(["account_create_date", "firstname", "driver_rating", "wallet_amount", "driver_id"]);
const ALLOWED_CAR_COLORS = [
    { label: "Đen", value: "black" },
    { label: "Nâu", value: "brown" },
    { label: "Đỏ", value: "red" },
    { label: "Cam", value: "orange" },
    { label: "Vàng", value: "yellow" },
    { label: "Xanh lá", value: "green" },
    { label: "Xanh dương", value: "blue" },
    { label: "Xanh da trời", value: "sky-blue" },
    { label: "Hồng", value: "pink" },
    { label: "Tím", value: "purple" },
    { label: "Xám", value: "grey" },
    { label: "Trắng", value: "white" },
    { label: "Vàng kim", value: "gold" },
    { label: "Bạc", value: "silver" },
];
const ALLOWED_CAR_COLOR_VALUES = new Set(ALLOWED_CAR_COLORS.map((item) => item.value));
const VIETNAM_BANKS = [
    { label: "Vietcombank", value: "Vietcombank" },
    { label: "VietinBank", value: "VietinBank" },
    { label: "BIDV", value: "BIDV" },
    { label: "Agribank", value: "Agribank" },
    { label: "Techcombank", value: "Techcombank" },
    { label: "MB Bank", value: "MB Bank" },
    { label: "ACB", value: "ACB" },
    { label: "VPBank", value: "VPBank" },
    { label: "TPBank", value: "TPBank" },
    { label: "Sacombank", value: "Sacombank" },
    { label: "SHB", value: "SHB" },
    { label: "HDBank", value: "HDBank" },
    { label: "VIB", value: "VIB" },
    { label: "OCB", value: "OCB" },
    { label: "SeABank", value: "SeABank" },
    { label: "MSB", value: "MSB" },
    { label: "Eximbank", value: "Eximbank" },
    { label: "PVcomBank", value: "PVcomBank" },
    { label: "Nam A Bank", value: "Nam A Bank" },
    { label: "SCB", value: "SCB" },
    { label: "Khác", value: "other" },
];
const BOOKING_STATUS_LABELS = { 0: "Chờ xử lý", 1: "Đang chạy", 2: "Khách hủy", 3: "Hoàn thành", 4: "Tài xế hủy", 5: "Admin hủy", 6: "Tài xế đã tới" };
const PAYMENT_TYPE_LABELS = { 1: "Tiền mặt", 2: "Ví", 3: "Thẻ", 4: "POS" };
const DOCUMENT_STATUS_LABELS = { 0: "Chờ duyệt", 1: "Không đạt", 2: "Hết hạn", 3: "Đã duyệt" };
const WALLET_TRANSACTION_TYPE_LABELS = { 0: "user wallet funding", 1: "wallet funding admin", 2: "earnings wallet credit", 3: "earnings wallet debit" };
const WITHDRAWAL_STATUS_LABELS = { 0: "pending", 1: "cancelled", 2: "serviced" };

function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeUppercaseText(value) {
    const normalized = normalizeText(value);
    return normalized ? normalized.toLocaleUpperCase("vi-VN") : null;
}

function normalizeCapitalizedText(value) {
    const normalized = normalizeText(value);
    if (!normalized) return null;

    return normalized
        .toLocaleLowerCase("vi-VN")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toLocaleUpperCase("vi-VN") + word.slice(1))
        .join(" ");
}

function normalizeNameForComparison(value) {
    const normalized = normalizeText(value);
    return normalized
        ? normalized
            .replace(/\s+/g, " ")
            .toLocaleUpperCase("vi-VN")
        : null;
}

function normalizeEmail(email) {
    const normalized = normalizeText(email);
    return normalized ? normalized.toLowerCase() : null;
}

function normalizeCountryCode(value) {
    const normalized = normalizeText(value);
    return normalized ? normalized.toLowerCase() : null;
}

function normalizeCountryDialCode(value) {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    const digits = normalized.replace(/\D/g, "");
    return digits ? `+${digits}` : null;
}

function normalizeBooleanFlag(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return defaultValue;
}

function normalizeStrictBooleanFlag(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return null;
}

function normalizeOptionalInteger(value) {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
}

function normalizeOptionalNumber(value) {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
}

function normalizeQueryInteger(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return Number(value);
}

function normalizeDriverIdOrThrow(value) {
    const driverId = normalizeOptionalInteger(value);
    if (!Number.isInteger(driverId) || driverId < 1) {
        throw new AppError("Invalid driver id.", 422, "INVALID_DRIVER_ID");
    }
    return driverId;
}

function buildDocumentSummary(documentCounts) {
    return {
        total: documentCounts.total,
        pending: documentCounts.pending,
        failed: documentCounts.failed,
        expired: documentCounts.expired,
        approved: documentCounts.approved,
    };
}

function resolveBookingStatusLabel(status) {
    return BOOKING_STATUS_LABELS[status] || "Không xác định";
}

function resolvePaymentTypeLabel(paymentType) {
    if (paymentType === null || paymentType === undefined) return "Chưa xác định";
    return PAYMENT_TYPE_LABELS[paymentType] || "Khác";
}

function resolveDocumentStatusLabel(status) {
    return DOCUMENT_STATUS_LABELS[status] || "Không xác định";
}

function resolveWithdrawalStatusLabel(status) {
    return WITHDRAWAL_STATUS_LABELS[status] || "unknown";
}

function resolveCarColorLabel(colorValue) {
    return ALLOWED_CAR_COLORS.find((item) => item.value === colorValue)?.label || colorValue;
}

function buildDriverFullNameForComparison(firstname, lastname) {
    return normalizeNameForComparison([firstname, lastname].filter(Boolean).join(" "));
}

function serializeDriver(driver) {
    return {
        driver_id: driver.driver_id,
        firstname: driver.firstname,
        lastname: driver.lastname,
        full_name: driver.full_name,
        email: driver.email,
        phone: driver.phone,
        drv_address: driver.drv_address,
        state: driver.state,
        drv_country: driver.drv_country,
        car_plate_num: driver.car_plate_num,
        car_reg_num: driver.car_reg_num,
        car_model: driver.car_model,
        car_color: resolveCarColorLabel(driver.car_color),
        car_color_code: driver.car_color,
        car_year: driver.car_year,
        route_id: driver.route_id,
        route_name: driver.route_name,
        reg_route_id: driver.reg_route_id,
        reg_route_name: driver.reg_route_name,
        ride_id: driver.ride_id,
        ride_type: driver.ride_type,
        is_activated: driver.is_activated,
        account_deleted: driver.account_deleted,
        available: driver.available,
        operation_status: driver.operation_status,
        driver_rating: driver.driver_rating,
        account_active: driver.account_active,
        photo_file: driver.photo_file,
        driving_license_file: driver.driving_license_file,
        road_worthiness_file: driver.road_worthiness_file,
        wallet_amount: driver.wallet_amount,
        bank_name: driver.bank_name,
        bank_acc_holder_name: driver.bank_acc_holder_name,
        bank_acc_num: driver.bank_acc_num,
        bank_code: driver.bank_code,
        bank_swift_code: driver.bank_swift_code,
        completed_rides: driver.completed_rides,
        cancelled_rides: driver.cancelled_rides,
        rejected_rides: driver.rejected_rides,
        country_code: driver.country_code,
        country_dial_code: driver.country_dial_code,
        driver_commision: driver.driver_commision,
        account_create_date: driver.account_create_date,
        document_status: driver.document_status,
        document_summary: buildDocumentSummary(driver.document_counts),
    };
}

function serializeDriverListItem(driver) {
    return {
        driver_id: driver.driver_id,
        photo_file: driver.photo_file,
        firstname: driver.firstname,
        lastname: driver.lastname,
        full_name: driver.full_name,
        reg_route_id: driver.reg_route_id,
        route_name: driver.reg_route_name || driver.route_name,
        available: driver.available,
        wallet_amount: driver.wallet_amount,
        car_model: driver.car_model,
        driving_license_file: driver.driving_license_file,
        account_create_date: driver.account_create_date,
        account_active: driver.account_active,
        is_activated: driver.is_activated,
        driver_rating: driver.driver_rating,
        ride_id: driver.ride_id,
        ride_type: driver.ride_type,
        document_status: driver.document_status,
    };
}

function serializeDriverTransaction(transaction) {
    return {
        id: transaction.row_key,
        transaction_id: transaction.reference_id,
        reference: transaction.reference_id,
        amount: transaction.amount,
        wallet_balance: transaction.wallet_balance,
        booking_id: transaction.booking_id || null,
        type: transaction.type_code,
        type_label: WALLET_TRANSACTION_TYPE_LABELS[transaction.type_code] || "wallet transaction",
        description: transaction.description,
        transaction_date: transaction.transaction_date,
    };
}

function serializeDriverBooking(booking) {
    return {
        booking_id: booking.id,
        customer_name: booking.customer_name,
        pickup: booking.pickup_address,
        dropoff: booking.dropoff_address,
        time_booking: booking.pickup_datetime || booking.date_created,
        estimated_fare: booking.estimated_cost,
        amount_paid: booking.paid_amount,
        payment_method: booking.payment_type,
        payment_method_label: resolvePaymentTypeLabel(booking.payment_type),
        status: booking.status,
        status_label: resolveBookingStatusLabel(booking.status),
    };
}

function serializeDriverWithdrawal(withdrawal) {
    return {
        id: withdrawal.id,
        amount: withdrawal.withdrawal_amount,
        wallet_amount_before: withdrawal.wallet_amount,
        wallet_balance_after: withdrawal.wallet_balance,
        status: withdrawal.request_status,
        status_label: resolveWithdrawalStatusLabel(withdrawal.request_status),
        date_requested: withdrawal.date_requested,
        date_settled: withdrawal.date_settled,
    };
}

function serializeDriverReview(review) {
    return {
        id: review.id,
        reviewer_name: review.reviewer_name,
        booking_id: review.booking_id || null,
        rating: review.rating,
        comment: review.comment,
    };
}

function serializeDriverDocument(document) {
    return {
        id: document.id,
        doc_id: document.doc_id || null,
        vehicle_id: document.vehicle_id || null,
        title: document.title,
        id_number_title: document.id_number_title,
        id_number: document.id_number,
        can_edit: document.can_edit,
        expiry_date: document.expiry_date,
        image_url: document.image_url,
        status: document.status,
        status_label: resolveDocumentStatusLabel(document.status),
        date_created: document.date_created,
        date_updated: document.date_updated,
    };
}

function buildVehicleYears() {
    return Array.from({ length: 2040 - 1990 + 1 }, (_, index) => 1990 + index);
}

function normalizeDriverFilters(query = {}) {
    const page = Math.max(normalizeQueryInteger(query.page, 1), 1);
    const limit = Math.min(Math.max(normalizeQueryInteger(query.limit, 10), 1), 100);
    const sortBy = SORT_BY_WHITELIST.has(query.sort_by) ? query.sort_by : "account_create_date";
    const sortOrder = String(query.sort_order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const documentStatus = normalizeText(query.document_status);

    return {
        page,
        limit,
        reg_route_id: normalizeOptionalInteger(query.reg_route_id),
        ride_id: normalizeOptionalInteger(query.ride_id),
        is_activated: query.is_activated === undefined ? undefined : normalizeBooleanFlag(query.is_activated, 0),
        available: query.available === undefined ? undefined : normalizeBooleanFlag(query.available, 0),
        account_deleted: query.account_deleted === undefined ? undefined : normalizeBooleanFlag(query.account_deleted, 0),
        rating_min: normalizeOptionalNumber(query.rating_min),
        rating_max: normalizeOptionalNumber(query.rating_max),
        date_from: normalizeText(query.date_from),
        date_to: normalizeText(query.date_to),
        document_status: documentStatus && ALLOWED_DOCUMENT_STATUS.has(documentStatus) ? documentStatus : undefined,
        search: normalizeText(query.search),
        sort_by: sortBy,
        sort_order: sortOrder,
    };
}

function normalizeBankName(payload) {
    const bankName = normalizeText(payload.bank_name);
    return bankName !== "other" ? bankName : normalizeText(payload.bank_name_custom);
}

function buildDriverWritePayload(payload, options = {}) {
    const driverAccount = options.driverAccount || null;
    const bankName = normalizeBankName(payload);
    const regRouteId = normalizeOptionalInteger(payload.reg_route_id);
    const routeId = regRouteId;
    const accountActive =
        payload.account_active === undefined
            ? driverAccount?.account_active ?? 0
            : normalizeBooleanFlag(payload.account_active, driverAccount?.account_active ?? 0);
    const isActivated =
        payload.is_activated === undefined
            ? driverAccount?.is_activated ?? 0
            : normalizeBooleanFlag(payload.is_activated, driverAccount?.is_activated ?? 0);
    const available =
        payload.available === undefined
            ? driverAccount?.available ?? 0
            : normalizeBooleanFlag(payload.available, driverAccount?.available ?? 0);

    const firstname = normalizeCapitalizedText(payload.firstname);
    const lastname = normalizeCapitalizedText(payload.lastname);
    const bankAccHolderName = normalizeUppercaseText(payload.bank_acc_holder_name);

    if (buildDriverFullNameForComparison(firstname, lastname) !== normalizeNameForComparison(bankAccHolderName)) {
        throw new AppError(
            "Bank account holder name must match the driver's full name.",
            422,
            "BANK_ACCOUNT_HOLDER_NAME_MISMATCH"
        );
    }

    return {
        firstname,
        lastname,
        drvAddress: normalizeText(payload.drv_address),
        state: normalizeText(payload.state),
        drvCountry: normalizeText(payload.drv_country) || DEFAULT_COUNTRY,
        email: normalizeEmail(payload.email),
        phone: normalizeText(payload.phone),
        carPlateNum: normalizeText(payload.car_plate_num),
        carRegNum: normalizeText(payload.car_reg_num),
        carModel: normalizeText(payload.car_model),
        carColor: normalizeText(payload.car_color),
        carYear: String(payload.car_year),
        routeId,
        regRouteId,
        rideId: normalizeOptionalInteger(payload.ride_id),
        bankName,
        bankAccHolderName,
        bankAccNum: normalizeText(payload.bank_acc_num),
        bankCode: normalizeText(payload.bank_code),
        bankSwiftCode: normalizeText(payload.bank_swift_code),
        driverCommision: Number(payload.driver_commision),
        accountActive,
        isActivated,
        available,
        countryCode: normalizeCountryCode(payload.country_code) || DEFAULT_COUNTRY_CODE,
        countryDialCode: normalizeCountryDialCode(payload.country_dial_code) || DEFAULT_COUNTRY_DIAL_CODE,
    };
}

async function ensureCreateOrUpdateRelationsExist(payload) {
    const [routeFound, rideFound] = await Promise.all([routeExists(payload.regRouteId), rideExists(payload.rideId)]);

    if (!routeFound) {
        throw new AppError("Selected route does not exist.", 422, "ROUTE_NOT_FOUND");
    }
    if (!rideFound) {
        throw new AppError("Selected ride type does not exist or is unavailable.", 422, "RIDE_NOT_FOUND");
    }
    if (!ALLOWED_CAR_COLOR_VALUES.has(payload.carColor)) {
        throw new AppError("car_color is not supported.", 422, "INVALID_CAR_COLOR");
    }
}

async function uploadDriverImage(file) {
    if (!file?.buffer) return null;

    try {
        const result = await uploadBufferToCloudinary(file.buffer, {
            folder: DRIVER_IMAGE_FOLDER,
            resource_type: "image",
        });
        return result.secure_url;
    } catch {
        throw new AppError("Failed to upload driver image.", 502, "DRIVER_IMAGE_UPLOAD_FAILED");
    }
}

async function cleanupDriverImage(imageUrl) {
    if (!imageUrl || !imageUrl.includes(`/${DRIVER_IMAGE_FOLDER}/`)) return;
    await deleteCloudinaryImage(imageUrl);
}

export async function getDriverMeta() {
    const [routes, rides] = await Promise.all([findDriverMetaRoutes(), findDriverMetaRides()]);
    return {
        routes,
        rides,
        vehicleYears: buildVehicleYears(),
        carColors: ALLOWED_CAR_COLORS,
        banks: VIETNAM_BANKS,
    };
}

export async function createDriver(payload, file) {
    const driverPayload = buildDriverWritePayload(payload);
    const [existingEmail, existingPhone, passwordHash] = await Promise.all([
        findExistingAccountByEmail(driverPayload.email),
        findExistingAccountByPhone(driverPayload.phone),
        hashPassword(payload.password),
    ]);

    if (existingEmail) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    if (existingPhone) throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");

    await ensureCreateOrUpdateRelationsExist(driverPayload);

    const photoFile = await uploadDriverImage(file);
    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const driverId = await insertDriver(
            {
                ...driverPayload,
                passwordHash,
                photoFile,
                walletAmount: 0,
                accountDeleted: 0,
                operationStatus: 0,
            },
            connection
        );

        await connection.commit();

        const driver = await findDriverById(driverId);
        if (!driver) {
            throw new AppError("Driver created but could not be loaded.", 500, "DRIVER_READ_FAILED");
        }

        return {
            driver: serializeDriver(driver),
            // activation_pin is accepted from frontend and validated,
            // but the current drivers table has no column to persist it.
            activation_pin_persisted: false,
        };
    } catch (error) {
        await connection.rollback();
        if (photoFile) {
            await cleanupDriverImage(photoFile);
        }
        throw error;
    } finally {
        connection.release();
    }
}

export async function getDriverList(query) {
    const filters = normalizeDriverFilters(query);
    const [items, totalItems] = await Promise.all([findDrivers(filters), countDrivers(filters)]);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: items.map(serializeDriverListItem),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalPages,
            hasNextPage: totalPages > 0 && filters.page < totalPages,
            hasPrevPage: filters.page > 1,
        },
        filters,
        totalItems,
    };
}

export async function getDriverSummary(query) {
    const filters = normalizeDriverFilters(query);
    const summary = await summarizeDrivers(filters);
    return { ...summary, filters };
}

export async function getDriverDetail(driverIdInput) {
    const driverId = normalizeDriverIdOrThrow(driverIdInput);
    const driver = await findDriverById(driverId);
    if (!driver) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    const [transactions, bookings, withdrawals, reviews, documents] = await Promise.all([
        findDriverTransactions(driverId),
        findDriverBookings(driverId),
        findDriverWithdrawals(driverId),
        findDriverReviews(driverId),
        findDriverDocuments(driverId),
    ]);

    return {
        driver: serializeDriver(driver),
        stats: {
            completed_rides: driver.completed_rides,
            cancelled_rides: driver.cancelled_rides,
            rejected_rides: driver.rejected_rides,
        },
        transactions: transactions.map(serializeDriverTransaction),
        bookings: bookings.map(serializeDriverBooking),
        withdrawals: withdrawals.map(serializeDriverWithdrawal),
        reviews: reviews.map(serializeDriverReview),
        documents: documents.map(serializeDriverDocument),
    };
}

export async function updateDriverAccountState(driverIdInput, payload) {
    const driverId = normalizeDriverIdOrThrow(driverIdInput);
    const payloadDriverId =
        payload.driver_id === undefined || payload.driver_id === null || payload.driver_id === ""
            ? null
            : normalizeDriverIdOrThrow(payload.driver_id);
    const accountActive = normalizeStrictBooleanFlag(payload.account_active);

    if (payloadDriverId !== null && payloadDriverId !== driverId) {
        throw new AppError("driver_id does not match the requested driver.", 422, "DRIVER_ID_MISMATCH");
    }
    if (![0, 1].includes(accountActive)) {
        throw new AppError("account_active must be 0 or 1.", 422, "INVALID_ACCOUNT_STATUS");
    }

    const driverAccount = await findDriverAccountById(driverId);
    if (!driverAccount) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }
    if (driverAccount.account_active === accountActive) {
        throw new AppError(
            accountActive === 1 ? "Driver account is already active." : "Driver account is already locked.",
            409,
            "INVALID_ACCOUNT_STATE_CHANGE"
        );
    }

    await persistDriverAccountStatus({ driverId, accountActive });
    const updatedDriver = await findDriverById(driverId);

    return {
        driver: serializeDriver(updatedDriver),
        action: accountActive === 1 ? "unlocked" : "locked",
    };
}

export async function updateDriverPersonalInformation(driverIdInput, payload, file) {
    const driverId = normalizeDriverIdOrThrow(driverIdInput);
    const driverAccount = await findDriverAccountById(driverId);

    if (!driverAccount) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }
    if (driverAccount.account_deleted === 1) {
        throw new AppError("Deleted driver account cannot be updated.", 409, "DRIVER_ACCOUNT_DELETED");
    }

    const driverPayload = buildDriverWritePayload(payload, { driverAccount });
    const [existingEmail, existingPhone] = await Promise.all([
        findExistingAccountByEmail(driverPayload.email, driverId),
        findExistingAccountByPhone(driverPayload.phone, driverId),
    ]);

    if (existingEmail) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    if (existingPhone) throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");

    await ensureCreateOrUpdateRelationsExist(driverPayload);

    const previousPhotoFile = driverAccount.photo_file;
    const uploadedPhotoFile = file ? await uploadDriverImage(file) : previousPhotoFile;

    try {
        await persistDriverPersonalInfo({
            driverId,
            ...driverPayload,
            photoFile: uploadedPhotoFile,
        });

        if (file && previousPhotoFile && previousPhotoFile !== uploadedPhotoFile) {
            try {
                await cleanupDriverImage(previousPhotoFile);
            } catch {
                // Ignore cleanup failure because the record has already been updated.
            }
        }

        const updatedDriver = await findDriverById(driverId);
        return { driver: serializeDriver(updatedDriver) };
    } catch (error) {
        if (file && uploadedPhotoFile && uploadedPhotoFile !== previousPhotoFile) {
            await cleanupDriverImage(uploadedPhotoFile);
        }
        throw error;
    }
}

export async function softDeleteDriverAccount(driverIdInput, payload, auth) {
    const driverId = normalizeDriverIdOrThrow(driverIdInput);
    const driver = await findDriverAccountById(driverId);

    if (!driver) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }
    if (driver.account_deleted === 1) {
        throw new AppError("Driver account is already deleted.", 409, "DRIVER_ALREADY_DELETED");
    }

    const adminAccount = await findAdminPasswordById(auth.userId);
    if (!adminAccount) {
        throw new AppError("Admin account could not be verified.", 401, "ADMIN_VERIFICATION_FAILED");
    }

    const passwordOk = await verifyPassword(payload.admin_password, adminAccount.password_hash);
    if (!passwordOk) {
        throw new AppError("Admin password is incorrect.", 401, "INVALID_ADMIN_PASSWORD");
    }

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        await persistDriverSoftDelete(driverId, connection);
        await connection.commit();

        const updatedDriver = await findDriverById(driverId);
        return {
            driver: updatedDriver ? serializeDriver(updatedDriver) : { driver_id: driverId, account_deleted: 1 },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateDriverWithdrawal(driverIdInput, withdrawalIdInput, payload) {
    const driverId = normalizeDriverIdOrThrow(driverIdInput);
    const withdrawalId = normalizeDriverIdOrThrow(withdrawalIdInput);
    const driver = await findDriverAccountById(driverId);

    if (!driver) throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");

    const withdrawal = await findDriverWithdrawalById(driverId, withdrawalId);
    if (!withdrawal) throw new AppError("Withdrawal request not found.", 404, "WITHDRAWAL_NOT_FOUND");
    if (withdrawal.request_status !== 0) {
        throw new AppError("Only pending withdrawal requests can be processed.", 409, "WITHDRAWAL_ALREADY_PROCESSED");
    }

    const requestStatus = payload.action === "approve" ? 2 : 1;

    // Only the request status is updated here.
    // No new wallet ledger entry is created because the existing codebase does not show a guaranteed flow for it.
    await updateDriverWithdrawalStatus({ withdrawalId, requestStatus });

    const updatedWithdrawals = await findDriverWithdrawals(driverId);
    const updated = updatedWithdrawals.find((item) => item.id === withdrawalId);

    return {
        withdrawal: updated ? serializeDriverWithdrawal(updated) : null,
        action: payload.action,
    };
}

export async function getDriverLocation(driverIdInput) {
    const driverId = normalizeDriverIdOrThrow(driverIdInput);
    const driver = await findDriverAccountById(driverId);
    if (!driver) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    const location = await findLatestDriverLocation(driverId);
    return { location };
}
