import { body, param, query } from "express-validator";

const tariffListValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be a number between 1 and 100")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search must not exceed 100 characters"),
];

const routeIdValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("id must be a positive integer")
        .toInt(),
];

const tariffBodyValidator = [
    body("route").isObject().withMessage("route must be an object"),
    body("route.r_title")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("route.r_title must be a string between 1 and 255 characters"),
    body("route.r_scope")
        .isInt({ min: 0, max: 1 })
        .withMessage("route.r_scope must be either 0 or 1")
        .toInt(),
    body("route.dist_unit")
        .isInt({ min: 0, max: 1 })
        .withMessage("route.dist_unit must be either 0 or 1")
        .toInt(),
    body("route.city_currency_id")
        .isInt({ min: 1 })
        .withMessage("route.city_currency_id must be a positive integer")
        .toInt(),
    body("tariffs")
        .isArray({ min: 1 })
        .withMessage("tariffs must be an array with at least 1 element"),
    body("tariffs.*.ride_id")
        .isInt({ min: 1 })
        .withMessage("tariffs.ride_id must be a positive integer")
        .toInt(),
];

const zoneListValidators = [...tariffListValidators];

const zoneBodyValidators = [
    body("title")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("title must be a string between 1 and 255 characters"),
    body("city_id")
        .isInt({ min: 1 })
        .withMessage("city_id must be a positive integer")
        .toInt(),
    body("zone_fare_type")
        .isInt({ min: 1, max: 2 })
        .withMessage("zone_fare_type must be either 1 or 2")
        .toInt(),
    body("zone_fare_value")
        .isFloat({ min: 0 })
        .withMessage("zone_fare_value must be a number >= 0")
        .toFloat(),
    body("zone_bound_coords")
        .notEmpty()
        .withMessage("zone_bound_coords is required"),
];

export const getTariffListValidator = tariffListValidators;
export const getTariffDetailValidator = routeIdValidator;
export const createTariffValidator = tariffBodyValidator;
export const updateTariffValidator = [...routeIdValidator, ...tariffBodyValidator];

export const getZoneListValidator = zoneListValidators;
export const getZoneDetailValidator = routeIdValidator;
export const createZoneValidator = zoneBodyValidators;
export const updateZoneValidator = [...routeIdValidator, ...zoneBodyValidators];

