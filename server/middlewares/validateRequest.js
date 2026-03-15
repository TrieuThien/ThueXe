import { validationResult } from "express-validator";
import AppError from "../utils/appError.js";

export default function validateRequest(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new AppError("Validation failed", 422, "VALIDATION_ERROR", errors.array()));
    }

    return next();
}
