import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    applyCouponHandler,
    getMyAvailableCouponsHandler,
    validateCouponHandler,
} from "../../controllers/customer/couponController.js";
import {
    applyCouponValidator,
    myAvailableCouponsValidator,
    validateCouponValidator,
} from "../../validators/customer/couponValidators.js";

const router = Router();

router.post("/validate", requireAuth, validateCouponValidator, validateRequest, validateCouponHandler);
router.post("/apply", requireAuth, applyCouponValidator, validateRequest, applyCouponHandler);
router.get("/my-available", requireAuth, myAvailableCouponsValidator, validateRequest, getMyAvailableCouponsHandler);

export default router;
