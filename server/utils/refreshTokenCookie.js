function parseDurationToMs(duration) {
    const source = String(duration || "7d").trim();
    const match = source.match(/^(\d+)([smhd])$/i);

    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    const map = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return value * map[unit];
}

export const REFRESH_COOKIE_NAME =
    process.env.REFRESH_COOKIE_NAME || "thuexe_refresh_token";

export function buildRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    const sameSite =
        process.env.REFRESH_COOKIE_SAME_SITE || (isProduction ? "none" : "lax");

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite,
        path: process.env.REFRESH_COOKIE_PATH || "/api/auth",
        maxAge: parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"),
    };
}

export function setRefreshTokenCookie(res, refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions());
}

export function clearRefreshTokenCookie(res) {
    const options = buildRefreshCookieOptions();

    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        path: options.path,
    });
}

export function getRefreshTokenFromRequest(req) {
    const fromCookie = req?.cookies?.[REFRESH_COOKIE_NAME];
    const fromBody = req?.body?.refreshToken;

    return fromCookie || fromBody || "";
}
