import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    myRatingsHandler,
    rateDriverHandler,
    ratePassengerHandler,
} from "../controllers/ratingController.js";
import {
    rateDriverValidator,
    ratePassengerValidator,
} from "../validators/ratingValidators.js";

const router = Router();

router.get(
    "/api/ratings/me",
    requireAuth,
    requireRole("passenger", "driver"),
    myRatingsHandler
);
router.post(
    "/api/ratings/driver",
    requireAuth,
    requireRole("passenger"),
    rateDriverValidator,
    validateRequest,
    rateDriverHandler
);
router.post(
    "/api/ratings/passenger",
    requireAuth,
    requireRole("driver"),
    ratePassengerValidator,
    validateRequest,
    ratePassengerHandler
);

export default router;

