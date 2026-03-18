import { body, param, query } from "express-validator";

const tariffListValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page ph?i là s? nguyên duong")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit ph?i n?m trong kho?ng 1-100")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search không du?c quá 100 ký t?"),
];

const routeIdValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("id ph?i là s? nguyên duong")
        .toInt(),
];

const tariffBodyValidator = [
    body("route").isObject().withMessage("route là b?t bu?c"),
    body("route.r_title")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("route.r_title là b?t bu?c"),
    body("route.r_scope")
        .isInt({ min: 0, max: 1 })
        .withMessage("route.r_scope ch? ch?p nh?n 0 ho?c 1")
        .toInt(),
    body("route.dist_unit")
        .isInt({ min: 0, max: 1 })
        .withMessage("route.dist_unit ch? ch?p nh?n 0 ho?c 1")
        .toInt(),
    body("route.city_currency_id")
        .isInt({ min: 1 })
        .withMessage("route.city_currency_id ph?i là s? nguyên duong")
        .toInt(),
    body("tariffs")
        .isArray({ min: 1 })
        .withMessage("tariffs ph?i là m?ng và có ít nh?t 1 dòng"),
    body("tariffs.*.ride_id")
        .isInt({ min: 1 })
        .withMessage("tariffs.ride_id ph?i là s? nguyên duong")
        .toInt(),
];

const zoneListValidators = [...tariffListValidators];

const zoneBodyValidators = [
    body("title")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("title là b?t bu?c"),
    body("city_id")
        .isInt({ min: 1 })
        .withMessage("city_id ph?i là s? nguyên duong")
        .toInt(),
    body("zone_fare_type")
        .isInt({ min: 1, max: 2 })
        .withMessage("zone_fare_type ch? ch?p nh?n 1 ho?c 2")
        .toInt(),
    body("zone_fare_value")
        .isFloat({ min: 0 })
        .withMessage("zone_fare_value ph?i >= 0")
        .toFloat(),
    body("zone_bound_coords")
        .notEmpty()
        .withMessage("zone_bound_coords là b?t bu?c"),
];

export const getTariffListValidator = tariffListValidators;
export const getTariffDetailValidator = routeIdValidator;
export const createTariffValidator = tariffBodyValidator;
export const updateTariffValidator = [...routeIdValidator, ...tariffBodyValidator];

export const getZoneListValidator = zoneListValidators;
export const getZoneDetailValidator = routeIdValidator;
export const createZoneValidator = zoneBodyValidators;
export const updateZoneValidator = [...routeIdValidator, ...zoneBodyValidators];

