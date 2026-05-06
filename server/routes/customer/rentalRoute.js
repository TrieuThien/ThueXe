import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    cancelRentalBookingHandler,
    createRentalBookingHandler,
    estimateRentalFareHandler,
    getAvailableRentalDriversHandler,
    getAvailableRentalVehiclesHandler,
    getCurrentRentalBookingHandler,
    getRentalBookingDetailHandler,
    getRentalBookingHistoryHandler,
    getRentalPackagesHandler,
    updateRentalLocationHandler,
} from "../../controllers/customer/rentalController.js";
import {
    cancelRentalValidator,
    createRentalBookingValidator,
    rentalAvailabilityValidator,
    rentalFareEstimateValidator,
    rentalHistoryValidator,
    rentalIdParamValidator,
    rentalPackageListValidator,
} from "../../validators/customer/rentalValidators.js";

const router = Router();

router.get("/packages", requireAuth, rentalPackageListValidator, validateRequest, getRentalPackagesHandler);
router.post("/fare-estimate", requireAuth, rentalFareEstimateValidator, validateRequest, estimateRentalFareHandler);
router.post("/bookings", requireAuth, createRentalBookingValidator, validateRequest, createRentalBookingHandler);
router.get("/bookings/current", requireAuth, getCurrentRentalBookingHandler);
router.get("/bookings/history", requireAuth, rentalHistoryValidator, validateRequest, getRentalBookingHistoryHandler);
router.get("/bookings/:rentalId", requireAuth, rentalIdParamValidator, validateRequest, getRentalBookingDetailHandler);
router.post(
    "/bookings/:rentalId/cancel",
    requireAuth,
    [...rentalIdParamValidator, ...cancelRentalValidator],
    validateRequest,
    cancelRentalBookingHandler
);
router.post("/bookings/:rentalId/location", requireAuth, rentalIdParamValidator, validateRequest, updateRentalLocationHandler);
router.get(
    "/vehicles/available",
    requireAuth,
    rentalAvailabilityValidator,
    validateRequest,
    getAvailableRentalVehiclesHandler
);
router.get(
    "/drivers/available",
    requireAuth,
    rentalAvailabilityValidator,
    validateRequest,
    getAvailableRentalDriversHandler
);

export default router;
