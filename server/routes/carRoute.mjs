import { Router } from "express";
import {
    createCarHandler,
    getCarListHandler,
    updateCarHandler,
} from "../controllers/carController.mjs";
import requireAuth from "../middlewares/authMiddleware.js";
import { uploadCarImage } from "../middlewares/carUpload.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import { createCarValidator, updateCarValidator } from "../validators/carValidators.js";

const router = Router();

router.get("/api/cars", requireAuth, requireRole("admin"), getCarListHandler);

router.post(
    "/api/cars",
    requireAuth,
    requireRole("admin"),
    uploadCarImage("ride_img"),
    createCarValidator,
    validateRequest,
    createCarHandler
);

router.put(
    "/api/cars/:id",
    requireAuth,
    requireRole("admin"),
    uploadCarImage("ride_img"),
    updateCarValidator,
    validateRequest,
    updateCarHandler
);

export default router;
