import { body, param, query } from "express-validator";

export const ownerPaginationValidator = [
    query("page").optional({ values: "falsy" }).isInt({ min: 1 }).toInt(),
    query("pageSize").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }).toInt(),
];

export const ownerRegisterValidator = [
    body("fullName").isString().trim().isLength({ min: 2, max: 100 }),
    body("phoneNumber").isString().trim().isLength({ min: 8, max: 20 }),
    body("email").isEmail().normalizeEmail(),
    body("address").optional({ values: "falsy" }).isString().trim().isLength({ max: 255 }),
    body("password").isString().trim().isLength({ min: 8, max: 100 }),
    body("bankInfo.bankName").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("bankInfo.accountNumber").optional({ values: "falsy" }).isString().trim().isLength({ max: 40 }),
    body("bankInfo.bankCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 15 }),
    body("bankInfo.swiftCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 15 }),
];

export const ownerLoginValidator = [
    body("identifier").isString().trim().isLength({ min: 3, max: 100 }),
    body("password").isString().trim().isLength({ min: 1, max: 100 }),
];

export const ownerRefreshValidator = [body("refreshToken").isString().trim().isLength({ min: 10 })];

export const ownerVerificationUploadValidator = [
    body("documentTypeId").isInt({ min: 1 }).toInt(),
    body("documentNumber").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("expiryDate").optional({ values: "falsy" }).isISO8601(),
];

export const ownerAccountUpdateValidator = [
    body("fullName").isString().trim().isLength({ min: 2, max: 100 }),
    body("phoneNumber").isString().trim().isLength({ min: 8, max: 20 }),
    body("address").optional({ values: "falsy" }).isString().trim().isLength({ max: 255 }),
    body("bankName").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("bankAccountNumber").optional({ values: "falsy" }).isString().trim().isLength({ max: 40 }),
    body("bankCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 15 }),
    body("swiftCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 15 }),
];

export const ownerChangePasswordValidator = [
    body("currentPassword").isString().trim().isLength({ min: 6, max: 100 }),
    body("newPassword").isString().trim().isLength({ min: 8, max: 100 }),
];

export const ownerVehicleUpsertValidator = [
    body("vehicleType").isInt({ min: 1 }).toInt(),
    body("brand").isString().trim().isLength({ min: 1, max: 50 }),
    body("model").isString().trim().isLength({ min: 1, max: 50 }),
    body("productionYear").optional({ values: "falsy" }).isInt({ min: 1900, max: 2100 }).toInt(),
    body("color").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("plateNumber").isString().trim().isLength({ min: 4, max: 15 }),
    body("vin").optional({ values: "falsy" }).isString().trim().isLength({ max: 30 }),
    body("seats").isInt({ min: 1, max: 60 }).toInt(),
    body("transmission").isIn(["auto", "manual"]),
    body("fuelType").isIn(["petrol", "diesel", "electric", "hybrid"]),
    body("odometerKm").optional({ values: "falsy" }).isInt({ min: 0 }).toInt(),
    body("notes").optional({ values: "falsy" }).isString().trim().isLength({ max: 1000 }),
];

export const ownerVehicleIdParamValidator = [param("vehicleId").isInt({ min: 1 }).toInt()];
export const ownerBlockIdParamValidator = [param("blockId").isInt({ min: 1 }).toInt()];
export const ownerRecordIdParamValidator = [param("recordId").isInt({ min: 1 }).toInt()];
export const ownerBookingIdParamValidator = [param("bookingId").isInt({ min: 1 }).toInt()];
export const ownerContractIdParamValidator = [param("contractId").isInt({ min: 1 }).toInt()];

export const ownerVehicleDocumentsUpsertValidator = [
    body("documents").isArray({ min: 1 }),
    body("documents.*.documentTypeId").isInt({ min: 1 }).toInt(),
    body("documents.*.documentNumber").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
    body("documents.*.expiryDate").optional({ values: "falsy" }).isISO8601(),
    body("documents.*.fileUrl").optional({ values: "falsy" }).isString().trim().isLength({ max: 500 }),
    body("documents.*.mimeType").optional({ values: "falsy" }).isString().trim().isLength({ max: 120 }),
    body("documents.*.fileSize").optional({ values: "falsy" }).isInt({ min: 0 }).toInt(),
];

export const ownerAvailabilityUpsertValidator = [
    body("type").optional({ values: "falsy" }).isIn(["booking", "maintenance", "manual_block", "manual_available"]),
    body("startAt").isISO8601(),
    body("endAt").isISO8601(),
    body("note").optional({ values: "falsy" }).isString().trim().isLength({ max: 255 }),
];

export const ownerMaintenanceUpsertValidator = [
    body("vehicleId").isInt({ min: 1 }).toInt(),
    body("description").isString().trim().isLength({ min: 3, max: 255 }),
    body("startDate").isISO8601(),
    body("endDate").optional({ values: "falsy" }).isISO8601(),
    body("cost").isFloat({ min: 0 }).toFloat(),
    body("status").isIn(["scheduled", "in_progress", "completed"]),
];

export const ownerBookingStatusUpdateValidator = [
    body("nextStatus").isIn(["pending", "confirmed", "in_progress", "completed", "canceled"]),
    body("cancelNote").optional({ values: "falsy" }).isString().trim().isLength({ max: 255 }),
];

export const ownerRevenueTopupValidator = [
    body("amount").isFloat({ gt: 0 }).toFloat(),
    body("method").optional({ values: "falsy" }).isString().trim().isLength({ max: 30 }),
    body("gatewayRef").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
];

export const ownerRevenueWithdrawalValidator = [
    body("amount").isFloat({ gt: 0 }).toFloat(),
    body("note").optional({ values: "falsy" }).isString().trim().isLength({ max: 255 }),
];

export const ownerSetVehiclePackagesValidator = [
    body("package_ids").isArray().withMessage("package_ids must be an array"),
    body("package_ids.*").isInt({ min: 1 }).withMessage("each package_id must be a positive integer").toInt(),
];
