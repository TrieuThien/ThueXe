import jwt from "jsonwebtoken";
import crypto from "crypto";
import AppError from "./appError.js";

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN || "15m";

export function generateCodeToken(size = 10) {
    return crypto.randomBytes(size).toString("hex").slice(0, size * 2);
}

export function signAccessToken(payload) {
    if (!process.env.JWT_SECRET) {
        throw new AppError("JWT_SECRET is missing", 500, "JWT_SECRET_MISSING");
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: "thuexe-api",
        audience: "thuexe-client",
    });
}

export function signRefreshToken(payload) {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new AppError(
            "JWT_REFRESH_SECRET is missing",
            500,
            "JWT_REFRESH_SECRET_MISSING"
        );
    }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: "thuexe-api",
        audience: "thuexe-client",
    });
}

export function signResetToken(payload) {
    if (!process.env.JWT_RESET_SECRET) {
        throw new AppError(
            "JWT_RESET_SECRET is missing",
            500,
            "JWT_RESET_SECRET_MISSING"
        );
    }

    return jwt.sign(payload, process.env.JWT_RESET_SECRET, {
        expiresIn: RESET_TOKEN_EXPIRES_IN,
        issuer: "thuexe-api",
        audience: "thuexe-client",
    });
}

export function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: "thuexe-api",
        audience: "thuexe-client",
    });
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: "thuexe-api",
        audience: "thuexe-client",
    });
}

export function verifyResetToken(token) {
    return jwt.verify(token, process.env.JWT_RESET_SECRET, {
        issuer: "thuexe-api",
        audience: "thuexe-client",
    });
}
