import Joi from "joi";
import AppError from "../../utils/appError.js";

const phoneRegex = /^\+?\d{8,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

const contextSchema = Joi.alternatives().try(
    Joi.number().valid(0, 1),
    Joi.string().trim().valid("ACTIVATION", "RESET_PASSWORD", "0", "1")
);

function isValidIdentifier(value) {
    if (!value) return false;
    const normalized = String(value).trim();
    if (!normalized) return false;
    return normalized.includes("@")
        ? Joi.string().email().validate(normalized).error === undefined
        : phoneRegex.test(normalized);
}

function validate(schema, source = "body") {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            return next(
                new AppError(
                    "Validation failed",
                    422,
                    "VALIDATION_ERROR",
                    error.details.map((detail) => ({
                        path: detail.path.join("."),
                        message: detail.message,
                    }))
                )
            );
        }

        req[source] = value;
        return next();
    };
}

const registerSchema = Joi.object({
    firstname: Joi.string().trim().min(2).max(64).required(),
    lastname: Joi.string().trim().min(2).max(64).required(),
    email: Joi.string().trim().lowercase().email().max(64).allow(null, ""),
    phone: Joi.string().trim().pattern(phoneRegex).allow(null, ""),
    password: Joi.string().pattern(passwordRegex).required(),
    address: Joi.string().trim().max(255).allow(null, ""),
    country: Joi.string().trim().max(50).allow(null, ""),
    route_id: Joi.number().integer().min(1).optional(),
    disp_lang: Joi.string().trim().max(10).optional(),
    country_code: Joi.string().trim().max(3).optional(),
    country_dial_code: Joi.string().trim().max(5).optional(),
}).custom((value, helpers) => {
    if (!value.email && !value.phone) {
        return helpers.message("Either email or phone is required");
    }

    return value;
});

const verifyOtpSchema = Joi.object({
    userId: Joi.number().integer().min(1).required(),
    code: Joi.string().trim().min(4).max(20).required(),
    context: contextSchema.required(),
});

const loginSchema = Joi.object({
    identifier: Joi.string().trim().min(3).max(64).required().custom((value, helpers) => {
        if (!isValidIdentifier(value)) {
            return helpers.message("identifier must be a valid email or phone number");
        }
        return value;
    }),
    password: Joi.string().min(1).max(128).required(),
});

const forgotPasswordSchema = Joi.object({
    identifier: Joi.string().trim().min(3).max(64).required().custom((value, helpers) => {
        if (!isValidIdentifier(value)) {
            return helpers.message("identifier must be a valid email or phone number");
        }
        return value;
    }),
});

const resendOtpSchema = Joi.object({
    verificationId: Joi.number().integer().min(1).optional(),
    userId: Joi.number().integer().min(1).optional(),
    identifier: Joi.string().trim().min(3).max(64).optional().custom((value, helpers) => {
        if (!isValidIdentifier(value)) {
            return helpers.message("identifier must be a valid email or phone number");
        }
        return value;
    }),
}).custom((value, helpers) => {
    if (!value.verificationId && !value.userId && !value.identifier) {
        return helpers.message("verificationId or identifier is required");
    }
    return value;
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().trim().min(20).optional(),
    resetCode: Joi.string().trim().min(4).max(20).optional(),
    userId: Joi.number().integer().min(1).when("resetCode", {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    newPassword: Joi.string().pattern(passwordRegex).required(),
}).custom((value, helpers) => {
    if (!value.token && !value.resetCode) {
        return helpers.message("token or resetCode is required");
    }

    return value;
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().trim().min(20).optional(),
});

const logoutSchema = Joi.object({
    refreshToken: Joi.string().trim().min(20).optional(),
});

const patchMeSchema = Joi.object({
    firstname: Joi.string().trim().min(2).max(64).optional(),
    lastname: Joi.string().trim().min(2).max(64).optional(),
    phone: Joi.string().trim().pattern(phoneRegex).optional(),
    email: Joi.string().trim().lowercase().email().max(64).optional(),
    address: Joi.string().trim().max(255).allow("", null).optional(),
}).min(1);

const pushTokenSchema = Joi.object({
    pushNotificationToken: Joi.string().trim().max(200).allow("", null).required(),
});

export const registerValidator = validate(registerSchema);
export const verifyOtpValidator = validate(verifyOtpSchema);
export const loginValidator = validate(loginSchema);
export const forgotPasswordValidator = validate(forgotPasswordSchema);
export const resendOtpValidator = validate(resendOtpSchema);
export const resetPasswordValidator = validate(resetPasswordSchema);
export const refreshTokenValidator = validate(refreshTokenSchema);
export const logoutValidator = validate(logoutSchema);
export const patchMeValidator = validate(patchMeSchema);
export const patchPushTokenValidator = validate(pushTokenSchema);
