import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    assignRentalHandler,
    createRentalBookingHandler,
    createRentalPackageHandler,
    getRentalBookingDetailHandler,
    listRentalBookingsHandler,
    listRentalPackagesHandler,
    rentalMetaHandler,
    updateRentalPackageHandler,
    updateRentalStatusHandler,
} from "../controllers/rentalController.js";
import {
    assignRentalValidator,
    createRentalBookingValidator,
    createRentalPackageValidator,
    rentalBookingListValidator,
    rentalIdParamValidator,
    rentalMetaValidator,
    rentalPackageListValidator,
    updateRentalPackageValidator,
    updateRentalStatusValidator,
} from "../validators/rentalValidators.js";

const router = Router();

router.get(
    "/api/rentals/packages",
    requireAuth,
    rentalPackageListValidator,
    validateRequest,
    listRentalPackagesHandler
);
router.post(
    "/api/rentals/packages",
    requireAuth,
    requireRole("admin"),
    createRentalPackageValidator,
    validateRequest,
    createRentalPackageHandler
);
router.patch(
    "/api/rentals/packages/:packageId",
    requireAuth,
    requireRole("admin"),
    updateRentalPackageValidator,
    validateRequest,
    updateRentalPackageHandler
);

router.get(
    "/api/rentals/meta",
    requireAuth,
    rentalMetaValidator,
    validateRequest,
    rentalMetaHandler
);
router.post(
    "/api/rentals/bookings",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    createRentalBookingValidator,
    validateRequest,
    createRentalBookingHandler
);
router.get(
    "/api/rentals/bookings",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    rentalBookingListValidator,
    validateRequest,
    listRentalBookingsHandler
);
router.get(
    "/api/rentals/bookings/:rentalId",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    rentalIdParamValidator,
    validateRequest,
    getRentalBookingDetailHandler
);
router.patch(
    "/api/rentals/bookings/:rentalId/status",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    updateRentalStatusValidator,
    validateRequest,
    updateRentalStatusHandler
);
router.patch(
    "/api/rentals/bookings/:rentalId/assign",
    requireAuth,
    requireRole("admin", "dispatcher"),
    assignRentalValidator,
    validateRequest,
    assignRentalHandler
);

export default router;

