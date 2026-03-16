import fs from "fs/promises";
import { validationResult } from "express-validator";
import AppError from "../utils/appError.js";

async function cleanupUploadedFile(req) {
    if (!req?.file?.path) {
        return;
    }

    try {
        await fs.unlink(req.file.path);
    } catch (error) {
        if (error?.code !== "ENOENT") {
            console.error("Failed to cleanup uploaded file:", error.message);
        }
    }
}

export default async function validateRequest(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        await cleanupUploadedFile(req);
        return next(new AppError("Validation failed", 422, "VALIDATION_ERROR", errors.array()));
    }

    return next();
}
