import { body, param, query } from "express-validator";

const coordinateValidator = (field) =>
    body(field)
        .exists()
        .withMessage(`${field} is required`)
        .isFloat({ min: -180, max: 180 })
        .withMessage(`${field} must be a valid coordinate`)
        .toFloat();

const stopSchemaValidator = body("waypoints")
    .optional({ values: "falsy" })
    .isArray({ max: 2 })
    .withMessage("waypoints must be an array with up to 2 stops");

const waypointCoordinateValidator = body("waypoints.*")
    .optional({ values: "falsy" })
    .custom((value) => {
        if (!value || typeof value !== "object") {
            throw new Error("Each waypoint must be an object");
        }
        const lat = Number(value.lat);
        const lng = Number(value.lng);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            throw new Error("Waypoint lat must be in range -90..90");
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            throw new Error("Waypoint lng must be in range -180..180");
        }
        return true;
    });

export const routeEstimateValidator = [
    body("pickup")
        .exists()
        .withMessage("pickup is required")
        .custom((value) => value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)))
        .withMessage("pickup must include lat/lng"),
    body("dropoff")
        .exists()
        .withMessage("dropoff is required")
        .custom((value) => value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)))
        .withMessage("dropoff must include lat/lng"),
    stopSchemaValidator,
    waypointCoordinateValidator,
];

export const fareEstimateValidator = [
    body("route_id").isInt({ min: 1 }).withMessage("route_id must be a positive integer").toInt(),
    body("ride_id").isInt({ min: 1 }).withMessage("ride_id must be a positive integer").toInt(),
    body("service_type")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 3 })
        .withMessage("service_type must be between 0 and 3")
        .toInt(),
    body("scheduled_at")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("scheduled_at must be a valid ISO datetime"),
    body("coupon_code")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 3, max: 15 })
        .withMessage("coupon_code must be between 3 and 15 characters"),
    body("map_estimate")
        .exists()
        .withMessage("map_estimate is required")
        .custom((value) => {
            const distance = Number(value?.distance_km);
            const duration = Number(value?.duration_min);
            if (!(distance > 0) || !(duration > 0)) {
                throw new Error("map_estimate.distance_km and map_estimate.duration_min must be positive");
            }
            return true;
        }),
    stopSchemaValidator,
    waypointCoordinateValidator,
];

export const createBookingValidator = [
    ...fareEstimateValidator,
    body("pickup_address")
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("pickup_address must be between 3 and 255 characters"),
    body("dropoff_address")
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("dropoff_address must be between 3 and 255 characters"),
    body("pickup")
        .exists()
        .withMessage("pickup is required")
        .custom((value) => Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng)))
        .withMessage("pickup must include valid lat/lng"),
    body("dropoff")
        .exists()
        .withMessage("dropoff is required")
        .custom((value) => Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng)))
        .withMessage("dropoff must include valid lat/lng"),
    body("payment_type")
        .optional({ values: "falsy" })
        .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
        .withMessage("payment_type must be one of 1,2,3,4")
        .toInt(),
    body("num_seats")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 10 })
        .withMessage("num_seats must be between 1 and 10")
        .toInt(),
    body("scheduled_at")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("scheduled_at must be a valid ISO datetime"),
];

export const bookingIdParamValidator = [
    param("bookingId")
        .isInt({ min: 1 })
        .withMessage("bookingId must be a positive integer")
        .toInt(),
];

export const bookingHistoryValidator = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be between 1 and 100")
        .toInt(),
    query("status")
        .optional({ values: "falsy" })
        .isIn([2, 3, 4, 5, "2", "3", "4", "5"])
        .withMessage("status must be one of 2,3,4,5")
        .toInt(),
];

export const cancelBookingValidator = [
    body("reason")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 500 })
        .withMessage("reason must not exceed 500 characters"),
];

export const changePaymentMethodValidator = [
    body("payment_type")
        .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
        .withMessage("payment_type must be one of 1,2,3,4")
        .toInt(),
];
