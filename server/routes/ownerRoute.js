import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { ownerDocUploadSingle } from "../middlewares/ownerUpload.js";
import {
    ownerAccountChangePasswordHandler,
    ownerAccountProfileHandler,
    ownerAccountSummaryHandler,
    ownerAccountUpdateHandler,
    ownerActivityAvailabilityCreateHandler,
    ownerActivityAvailabilityDeleteHandler,
    ownerActivityAvailabilityHandler,
    ownerActivityAvailabilityUpdateHandler,
    ownerActivityTimelineHandler,
    ownerActivityVehicleLocationsHandler,
    ownerActivityVehiclesHandler,
    ownerBookingContractDetailHandler,
    ownerBookingContractsListHandler,
    ownerBookingDetailHandler,
    ownerBookingListHandler,
    ownerBookingStatusUpdateHandler,
    ownerDashboardHandler,
    ownerLoginHandler,
    ownerLogoutHandler,
    ownerMaintenanceCreateHandler,
    ownerMaintenanceDeleteHandler,
    ownerMaintenanceDetailHandler,
    ownerMaintenanceListHandler,
    ownerMaintenanceStatsHandler,
    ownerMaintenanceUpdateHandler,
    ownerMaintenanceVehiclesHandler,
    ownerRefreshHandler,
    ownerRegisterHandler,
    ownerRevenueByVehicleHandler,
    ownerRevenueCreateWithdrawalHandler,
    ownerRevenueLedgerHandler,
    ownerRevenuePaymentsHandler,
    ownerRevenueSummaryHandler,
    ownerRevenueTopupHandler,
    ownerRevenueWalletHandler,
    ownerRevenueWithdrawalsHandler,
    ownerVehicleCreateHandler,
    ownerVehicleDetailHandler,
    ownerVehicleDocumentTypesHandler,
    ownerVehicleDocumentsUpsertHandler,
    ownerVehicleListHandler,
    ownerVehicleTypesHandler,
    ownerVehicleUpdateHandler,
    ownerVehicleVerificationStatusHandler,
    ownerVerificationRequiredDocsHandler,
    ownerVerificationStatusHandler,
    ownerVerificationSubmissionHandler,
    ownerVerificationSubmitHandler,
    ownerVerificationUpdateHandler,
    ownerVerificationUploadHandler,
    ownerVerifyEmailHandler,
} from "../controllers/ownerController.js";
import {
    ownerAccountUpdateValidator,
    ownerAvailabilityUpsertValidator,
    ownerBlockIdParamValidator,
    ownerBookingIdParamValidator,
    ownerBookingStatusUpdateValidator,
    ownerContractIdParamValidator,
    ownerMaintenanceUpsertValidator,
    ownerPaginationValidator,
    ownerRecordIdParamValidator,
    ownerRefreshValidator,
    ownerRegisterValidator,
    ownerRevenueTopupValidator,
    ownerRevenueWithdrawalValidator,
    ownerVehicleDocumentsUpsertValidator,
    ownerVehicleIdParamValidator,
    ownerVehicleUpsertValidator,
    ownerVerificationUploadValidator,
    ownerLoginValidator,
    ownerChangePasswordValidator,
} from "../validators/ownerValidators.js";

const router = Router();
const ownerAuth = [requireAuth, requireRole("owner")];

router.post("/api/owner/auth/register", ownerRegisterValidator, validateRequest, ownerRegisterHandler);
router.get("/api/owner/auth/verify-email", ownerVerifyEmailHandler);
router.post("/api/owner/auth/login", ownerLoginValidator, validateRequest, ownerLoginHandler);
router.post("/api/owner/auth/refresh", ownerRefreshValidator, validateRequest, ownerRefreshHandler);
router.post("/api/owner/auth/logout", requireAuth, ownerLogoutHandler);

router.get("/api/owner/verification/status", ...ownerAuth, ownerVerificationStatusHandler);
router.get("/api/owner/verification/required-documents", ...ownerAuth, ownerVerificationRequiredDocsHandler);
router.get("/api/owner/verification/submission", ...ownerAuth, ownerVerificationSubmissionHandler);
router.post(
    "/api/owner/verification/documents",
    ...ownerAuth,
    ownerDocUploadSingle("file"),
    ownerVerificationUploadValidator,
    validateRequest,
    ownerVerificationUploadHandler
);
router.put(
    "/api/owner/verification/documents/:documentTypeId",
    ...ownerAuth,
    ownerDocUploadSingle("file"),
    ownerVerificationUploadValidator,
    validateRequest,
    ownerVerificationUpdateHandler
);
router.post("/api/owner/verification/submit", ...ownerAuth, ownerVerificationSubmitHandler);

router.get("/api/owner/account/profile", ...ownerAuth, ownerAccountProfileHandler);
router.patch("/api/owner/account/profile", ...ownerAuth, ownerAccountUpdateValidator, validateRequest, ownerAccountUpdateHandler);
router.post("/api/owner/account/change-password", ...ownerAuth, ownerChangePasswordValidator, validateRequest, ownerAccountChangePasswordHandler);
router.get("/api/owner/account/summary", ...ownerAuth, ownerAccountSummaryHandler);

router.get("/api/owner/dashboard", ...ownerAuth, ownerDashboardHandler);

router.get("/api/owner/vehicle-management/vehicle-types", ...ownerAuth, ownerVehicleTypesHandler);
router.get("/api/owner/vehicle-management/document-types", ...ownerAuth, ownerVehicleDocumentTypesHandler);
router.post("/api/owner/vehicle-management/vehicles", ...ownerAuth, ownerVehicleUpsertValidator, validateRequest, ownerVehicleCreateHandler);
router.get("/api/owner/vehicle-management/vehicles", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerVehicleListHandler);
router.get("/api/owner/vehicle-management/vehicles/:vehicleId", ...ownerAuth, ownerVehicleIdParamValidator, validateRequest, ownerVehicleDetailHandler);
router.put("/api/owner/vehicle-management/vehicles/:vehicleId", ...ownerAuth, ownerVehicleIdParamValidator, ownerVehicleUpsertValidator, validateRequest, ownerVehicleUpdateHandler);
router.post(
    "/api/owner/vehicle-management/vehicles/:vehicleId/documents",
    ...ownerAuth,
    ownerVehicleIdParamValidator,
    ownerVehicleDocumentsUpsertValidator,
    validateRequest,
    ownerVehicleDocumentsUpsertHandler
);
router.get(
    "/api/owner/vehicle-management/vehicles/:vehicleId/verification-status",
    ...ownerAuth,
    ownerVehicleIdParamValidator,
    validateRequest,
    ownerVehicleVerificationStatusHandler
);

router.get("/api/owner/vehicle-activity/vehicles", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerActivityVehiclesHandler);
router.get("/api/owner/vehicle-activity/vehicle-locations", ...ownerAuth, ownerActivityVehicleLocationsHandler);
router.get("/api/owner/vehicle-activity/vehicles/:vehicleId", ...ownerAuth, ownerVehicleIdParamValidator, validateRequest, ownerVehicleDetailHandler);
router.get("/api/owner/vehicle-activity/vehicles/:vehicleId/availability", ...ownerAuth, ownerVehicleIdParamValidator, validateRequest, ownerActivityAvailabilityHandler);
router.post("/api/owner/vehicle-activity/vehicles/:vehicleId/availability", ...ownerAuth, ownerVehicleIdParamValidator, ownerAvailabilityUpsertValidator, validateRequest, ownerActivityAvailabilityCreateHandler);
router.put("/api/owner/vehicle-activity/vehicles/:vehicleId/availability/:blockId", ...ownerAuth, ownerVehicleIdParamValidator, ownerBlockIdParamValidator, ownerAvailabilityUpsertValidator, validateRequest, ownerActivityAvailabilityUpdateHandler);
router.delete("/api/owner/vehicle-activity/vehicles/:vehicleId/availability/:blockId", ...ownerAuth, ownerVehicleIdParamValidator, ownerBlockIdParamValidator, validateRequest, ownerActivityAvailabilityDeleteHandler);
router.get("/api/owner/vehicle-activity/timeline", ...ownerAuth, ownerActivityTimelineHandler);

router.get("/api/owner/vehicle-maintenance/vehicles", ...ownerAuth, ownerMaintenanceVehiclesHandler);
router.get("/api/owner/vehicle-maintenance/records", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerMaintenanceListHandler);
router.get("/api/owner/vehicle-maintenance/records/:recordId", ...ownerAuth, ownerRecordIdParamValidator, validateRequest, ownerMaintenanceDetailHandler);
router.post("/api/owner/vehicle-maintenance/records", ...ownerAuth, ownerMaintenanceUpsertValidator, validateRequest, ownerMaintenanceCreateHandler);
router.put("/api/owner/vehicle-maintenance/records/:recordId", ...ownerAuth, ownerRecordIdParamValidator, ownerMaintenanceUpsertValidator, validateRequest, ownerMaintenanceUpdateHandler);
router.delete("/api/owner/vehicle-maintenance/records/:recordId", ...ownerAuth, ownerRecordIdParamValidator, validateRequest, ownerMaintenanceDeleteHandler);
router.get("/api/owner/vehicle-maintenance/stats", ...ownerAuth, ownerMaintenanceStatsHandler);

router.get("/api/owner/rental-bookings", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerBookingListHandler);
router.get("/api/owner/rental-bookings/:bookingId", ...ownerAuth, ownerBookingIdParamValidator, validateRequest, ownerBookingDetailHandler);
router.patch("/api/owner/rental-bookings/:bookingId/status", ...ownerAuth, ownerBookingIdParamValidator, ownerBookingStatusUpdateValidator, validateRequest, ownerBookingStatusUpdateHandler);
router.get("/api/owner/rental-bookings/contracts", ...ownerAuth, ownerBookingContractsListHandler);
router.get("/api/owner/rental-bookings/contracts/:contractId", ...ownerAuth, ownerContractIdParamValidator, validateRequest, ownerBookingContractDetailHandler);

router.get("/api/owner/owner-revenue/summary", ...ownerAuth, ownerRevenueSummaryHandler);
router.get("/api/owner/owner-revenue/by-vehicle", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerRevenueByVehicleHandler);
router.get("/api/owner/owner-revenue/wallet", ...ownerAuth, ownerRevenueWalletHandler);
router.get("/api/owner/owner-revenue/ledger", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerRevenueLedgerHandler);
router.get("/api/owner/owner-revenue/payments", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerRevenuePaymentsHandler);
router.get("/api/owner/owner-revenue/withdrawals", ...ownerAuth, ownerPaginationValidator, validateRequest, ownerRevenueWithdrawalsHandler);
router.post("/api/owner/owner-revenue/withdrawals", ...ownerAuth, ownerRevenueWithdrawalValidator, validateRequest, ownerRevenueCreateWithdrawalHandler);
router.post("/api/owner/owner-revenue/topup", ...ownerAuth, ownerRevenueTopupValidator, validateRequest, ownerRevenueTopupHandler);

export default router;
