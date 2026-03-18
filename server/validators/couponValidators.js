import { body, param, query } from "express-validator";

const couponCodeRegex = /^[A-Za-z0-9_-]{3,15}$/;

const adminListValidators = [
    query("page")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("page phải là số nguyên dương")
        .toInt(),
    query("limit")
        .optional({ values: "falsy" })
        .isInt({ min: 1, max: 100 })
        .withMessage("limit phải nằm trong khoảng 1-100")
        .toInt(),
    query("search")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("search không được quá 100 ký tự"),
    query("status")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("status chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    query("city")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("city phải là số nguyên dương")
        .toInt(),
    query("visibility")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("visibility chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    query("activeFrom")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("activeFrom phải là ngày hợp lệ"),
    query("activeTo")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("activeTo phải là ngày hợp lệ"),
];

const couponIdValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("id phải là số nguyên dương")
        .toInt(),
];

const createCouponValidators = [
    body("coupon_code")
        .trim()
        .matches(couponCodeRegex)
        .withMessage("coupon_code chỉ gồm chữ/số/_/- và dài 3-15 ký tự"),
    body("coupon_title")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("coupon_title không được quá 255 ký tự"),
    body("city")
        .isInt({ min: 1 })
        .withMessage("city phải là số nguyên dương")
        .toInt(),
    body("vehicles")
        .optional({ values: "falsy" })
        .custom((value) => {
            const list = Array.isArray(value)
                ? value
                : String(value)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
            const invalid = list.some((item) => !Number.isInteger(Number(item)) || Number(item) < 1);
            if (invalid) {
                throw new Error("vehicles phải là danh sách id xe hợp lệ");
            }
            return true;
        }),
    body("visibility")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("visibility chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    body("discount_type")
        .isInt({ min: 0, max: 1 })
        .withMessage("discount_type chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    body("discount_value")
        .isFloat({ min: 0 })
        .withMessage("discount_value phải là số >= 0")
        .toFloat(),
    body("min_fare")
        .isFloat({ min: 0 })
        .withMessage("min_fare phải là số >= 0")
        .toFloat(),
    body("max_discount_amount")
        .isFloat({ min: 0 })
        .withMessage("max_discount_amount phải là số >= 0")
        .toFloat(),
    body("limit_count")
        .isInt({ min: 0 })
        .withMessage("limit_count phải là số nguyên >= 0")
        .toInt(),
    body("user_limit_count")
        .isInt({ min: 0 })
        .withMessage("user_limit_count phải là số nguyên >= 0")
        .toInt(),
    body("status")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1 })
        .withMessage("status chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    body("active_date")
        .isISO8601()
        .withMessage("active_date không hợp lệ"),
    body("expiry_date")
        .isISO8601()
        .withMessage("expiry_date không hợp lệ"),
    body().custom((value, { req }) => {
        const activeDate = new Date(req.body.active_date);
        const expiryDate = new Date(req.body.expiry_date);

        if (Number.isNaN(activeDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
            throw new Error("Ngày hiệu lực không hợp lệ");
        }

        if (expiryDate.getTime() < activeDate.getTime()) {
            throw new Error("expiry_date phải lớn hơn hoặc bằng active_date");
        }

        return true;
    }),
];

const updateCouponValidators = [
    ...couponIdValidator,
    body("coupon_code")
        .optional({ values: "falsy" })
        .trim()
        .matches(couponCodeRegex)
        .withMessage("coupon_code chỉ gồm chữ/số/_/- và dài 3-15 ký tự"),
    body("coupon_title")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("coupon_title không được quá 255 ký tự"),
    body("city")
        .optional()
        .isInt({ min: 1 })
        .withMessage("city phải là số nguyên dương")
        .toInt(),
    body("vehicles")
        .optional()
        .custom((value) => {
            if (value === null || value === "") return true;
            const list = Array.isArray(value)
                ? value
                : String(value)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
            const invalid = list.some((item) => !Number.isInteger(Number(item)) || Number(item) < 1);
            if (invalid) {
                throw new Error("vehicles phải là danh sách id xe hợp lệ");
            }
            return true;
        }),
    body("visibility")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("visibility chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    body("discount_type")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("discount_type chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    body("discount_value")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("discount_value phải là số >= 0")
        .toFloat(),
    body("min_fare")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("min_fare phải là số >= 0")
        .toFloat(),
    body("max_discount_amount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("max_discount_amount phải là số >= 0")
        .toFloat(),
    body("limit_count")
        .optional()
        .isInt({ min: 0 })
        .withMessage("limit_count phải là số nguyên >= 0")
        .toInt(),
    body("user_limit_count")
        .optional()
        .isInt({ min: 0 })
        .withMessage("user_limit_count phải là số nguyên >= 0")
        .toInt(),
    body("status")
        .optional()
        .isInt({ min: 0, max: 1 })
        .withMessage("status chỉ chấp nhận 0 hoặc 1")
        .toInt(),
    body("active_date")
        .optional()
        .isISO8601()
        .withMessage("active_date không hợp lệ"),
    body("expiry_date")
        .optional()
        .isISO8601()
        .withMessage("expiry_date không hợp lệ"),
    body().custom((value, { req }) => {
        if (!req.body.active_date || !req.body.expiry_date) return true;

        const activeDate = new Date(req.body.active_date);
        const expiryDate = new Date(req.body.expiry_date);

        if (Number.isNaN(activeDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
            throw new Error("Ngày hiệu lực không hợp lệ");
        }

        if (expiryDate.getTime() < activeDate.getTime()) {
            throw new Error("expiry_date phải lớn hơn hoặc bằng active_date");
        }

        return true;
    }),
];

const updateCouponStatusValidators = [
    ...couponIdValidator,
    body("status")
        .isInt({ min: 0, max: 1 })
        .withMessage("status chỉ chấp nhận 0 hoặc 1")
        .toInt(),
];

const availableCouponValidators = [
    query("cityId")
        .isInt({ min: 1 })
        .withMessage("cityId phải là số nguyên dương")
        .toInt(),
    query("fare")
        .isFloat({ min: 0 })
        .withMessage("fare phải là số >= 0")
        .toFloat(),
    query("rideId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("rideId phải là số nguyên dương")
        .toInt(),
    query("vehicleId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("vehicleId phải là số nguyên dương")
        .toInt(),
    query().custom((value, { req }) => {
        if (!req.query.rideId && !req.query.vehicleId) {
            throw new Error("Cần rideId hoặc vehicleId");
        }
        return true;
    }),
];

const validateCouponValidators = [
    body("couponCode")
        .trim()
        .matches(couponCodeRegex)
        .withMessage("couponCode không hợp lệ"),
    body("cityId")
        .isInt({ min: 1 })
        .withMessage("cityId phải là số nguyên dương")
        .toInt(),
    body("fare")
        .isFloat({ min: 0 })
        .withMessage("fare phải là số >= 0")
        .toFloat(),
    body("rideId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("rideId phải là số nguyên dương")
        .toInt(),
    body("vehicleId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("vehicleId phải là số nguyên dương")
        .toInt(),
    body().custom((value, { req }) => {
        if (!req.body.rideId && !req.body.vehicleId) {
            throw new Error("Cần rideId hoặc vehicleId");
        }
        return true;
    }),
];

export const getAdminCouponMetaValidator = [];
export const getAdminCouponListValidator = adminListValidators;
export const getAdminCouponDetailValidator = couponIdValidator;
export const createAdminCouponValidator = createCouponValidators;
export const updateAdminCouponValidator = updateCouponValidators;
export const updateAdminCouponStatusValidator = updateCouponStatusValidators;
export const getAvailableCouponValidator = availableCouponValidators;
export const validateCouponCodeValidator = validateCouponValidators;
export const applyCouponValidator = validateCouponValidators;

