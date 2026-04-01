import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function createLimiter(windowMs, max, message) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message,
            code: "RATE_LIMITED",
        },
    });
}

export const authRegisterLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_REGISTER_MAX) || 20,
    "Too many register attempts. Please try again later."
);

export const authLoginLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_LOGIN_MAX) || 15,
    "Too many login attempts. Please try again later."
);

export const authForgotPasswordLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_FORGOT_MAX) || 10,
    "Too many forgot-password attempts. Please try again later."
);

export const authResetPasswordLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_RESET_MAX) || 15,
    "Too many reset-password attempts. Please try again later."
);

export const authCreateStaffLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_CREATE_STAFF_MAX) || 20,
    "Too many create-staff attempts. Please try again later."
);

export const globalLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 250,
    "Too many requests. Please try again later."
);

export const passengerBookingCreateLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_PASSENGER_BOOKING_WINDOW_MS) || 60 * 1000,
    max: Number(process.env.RATE_LIMIT_PASSENGER_BOOKING_MAX) || 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req?.auth?.userId ? `u:${req.auth.userId}` : "u:anonymous";
        return `${userId}|ip:${ipKeyGenerator(req)}`;
    },
    message: {
        success: false,
        message: "Too many booking create attempts. Please try again shortly.",
        code: "PASSENGER_BOOKING_RATE_LIMITED",
    },
});
