import rateLimit from "express-rate-limit";

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

export const globalLimiter = createLimiter(
    15 * 60 * 1000,
    Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 250,
    "Too many requests. Please try again later."
);
