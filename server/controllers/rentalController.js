import { successResponse } from "../utils/apiResponse.js";
import {
    assignRentalService,
    createRentalBookingService,
    createRentalPackageService,
    getVehiclePackagesService,
    getRentalBookingDetailService,
    getRentalPackageList,
    listOwnerRentalPackagesService,
    listRentalBookingsService,
    notifyAvailableDriversService,
    rentalMetaService,
    setVehiclePackagesService,
    updateRentalPackageService,
    updateRentalStatusService,
} from "../services/rentalService.js";
import { listVehicleTypes } from "../repositories/ownerRepository.js";

export async function listRentalPackagesHandler(req, res, next) {
    try {
        const result = await getRentalPackageList({ query: req.query });
        return successResponse(res, result, "Rental packages fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createRentalPackageHandler(req, res, next) {
    try {
        const result = await createRentalPackageService({ payload: req.body });
        return successResponse(res, result, "Rental package created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateRentalPackageHandler(req, res, next) {
    try {
        const result = await updateRentalPackageService({
            packageId: req.params.packageId,
            payload: req.body,
        });
        return successResponse(res, result, "Rental package updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function rentalMetaHandler(req, res, next) {
    try {
        const result = await rentalMetaService({ query: req.query });
        return successResponse(res, result, "Rental meta fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createRentalBookingHandler(req, res, next) {
    try {
        const result = await createRentalBookingService({ payload: req.body, auth: req.auth });
        return successResponse(res, result, "Rental booking created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function listRentalBookingsHandler(req, res, next) {
    try {
        const result = await listRentalBookingsService({ query: req.query, auth: req.auth });
        return successResponse(res, result, "Rental bookings fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getRentalBookingDetailHandler(req, res, next) {
    try {
        const result = await getRentalBookingDetailService({
            rentalId: req.params.rentalId,
            auth: req.auth,
        });
        return successResponse(res, result, "Rental booking detail fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateRentalStatusHandler(req, res, next) {
    try {
        const result = await updateRentalStatusService({
            rentalId: req.params.rentalId,
            payload: req.body,
            auth: req.auth,
        });
        return successResponse(res, result, "Rental booking status updated successfully");
    } catch (error) {
        return next(error);
    }
}

// Owner: danh sách gói thuê xe đang active (service_type=1)
export async function listOwnerRentalPackagesHandler(req, res, next) {
    try {
        const result = await listOwnerRentalPackagesService();
        return successResponse(res, result, "Owner rental packages fetched successfully");
    } catch (error) {
        return next(error);
    }
}

// Owner: xem gói thuê đã gán cho xe
export async function getVehiclePackagesHandler(req, res, next) {
    try {
        const result = await getVehiclePackagesService({
            ownerId: req.auth.userId,
            vehicleId: req.params.vehicleId,
        });
        return successResponse(res, result, "Vehicle rental packages fetched successfully");
    } catch (error) {
        return next(error);
    }
}

// Owner: gán danh sách gói thuê cho xe (thay thế toàn bộ)
export async function setVehiclePackagesHandler(req, res, next) {
    try {
        const result = await setVehiclePackagesService({
            ownerId: req.auth.userId,
            vehicleId: req.params.vehicleId,
            packageIds: req.body.package_ids,
        });
        return successResponse(res, result, "Vehicle rental packages updated successfully");
    } catch (error) {
        return next(error);
    }
}

// Admin: kích hoạt thủ công tìm & thông báo tài xế cho 1 đơn thuê
export async function notifyDriversForRentalHandler(req, res, next) {
    try {
        const result = await notifyAvailableDriversService({
            rentalId: Number(req.params.rentalId),
            startDatetime: req.body.start_datetime,
            endDatetime: req.body.end_datetime,
            packageInfo: null,
        });
        return successResponse(res, result, "Driver notifications dispatched");
    } catch (error) {
        return next(error);
    }
}

export async function assignRentalHandler(req, res, next) {
    try {
        const result = await assignRentalService({
            rentalId: req.params.rentalId,
            payload: req.body,
        });
        return successResponse(res, result, "Rental booking assignment updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function listVehicleTypesHandler(req, res, next) {
    try {
        const rows = await listVehicleTypes();
        const items = rows.map((row) => ({
            type_id: Number(row.type_id),
            type_name: row.type_name,
            seat_count: Number(row.seat_count || 0),
        }));
        return successResponse(res, { items }, "Vehicle types fetched successfully");
    } catch (error) {
        return next(error);
    }
}

