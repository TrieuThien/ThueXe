import { body } from "express-validator";

// ─── PATCH /working-status/online ─────────────────────────────────────────────

export const patchOnlineStatusValidator = [
    body("online")
        .isInt({ min: 0, max: 1 })
        .withMessage("online must be 0 or 1")
        .toInt(),
    body("lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("lat must be a valid latitude (-90 to 90)")
        .toFloat(),
    body("long")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("long must be a valid longitude (-180 to 180)")
        .toFloat(),
    body("b_angle")
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage("b_angle must be between 0 and 360")
        .toFloat(),
];

// ─── PATCH /working-status/service-type ───────────────────────────────────────

export const patchServiceTypeValidator = [
    body("available_for_rental")
        .isInt({ min: 0, max: 2 })
        .withMessage("available_for_rental must be 0, 1 or 2")
        .toInt(),
];

// ─── POST /location ───────────────────────────────────────────────────────────

export const postLocationValidator = [
    body("lat")
        .isFloat({ min: -90, max: 90 })
        .withMessage("lat must be a valid latitude (-90 to 90)")
        .toFloat(),
    body("long")
        .isFloat({ min: -180, max: 180 })
        .withMessage("long must be a valid longitude (-180 to 180)")
        .toFloat(),
    body("b_angle")
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage("b_angle must be between 0 and 360")
        .toFloat(),
    body("loc_static_status")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("loc_static_status must be 0 or 1")
        .toInt(),
];

// ─── POST /location/heartbeat ─────────────────────────────────────────────────

export const postHeartbeatValidator = [
    body("lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("lat must be a valid latitude (-90 to 90)")
        .toFloat(),
    body("long")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("long must be a valid longitude (-180 to 180)")
        .toFloat(),
    body("b_angle")
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage("b_angle must be between 0 and 360")
        .toFloat(),
];
