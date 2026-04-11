import { errorResponse } from "../utils/apiResponse.js";

export function notFoundHandler(req, res) {
    return errorResponse(res, "Endpoint not found", 404, "NOT_FOUND");
}

export function globalErrorHandler(err, req, res, next) {
    const statusCode = err?.statusCode || 500;
    const code = err?.code || "INTERNAL_ERROR";
    const message = err?.isOperational ? err.message : "Internal server error!";
    const details = err?.isOperational ? err.details : undefined;
    const requestId = req?.headers?.["x-request-id"] || "";

    if (statusCode >= 500) {
        console.error("Unhandled error:", err.message, err.stack || "");
    }

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(Array.isArray(details) ? { fields: details } : {}),
        },
        message,
        code,
        ...(details ? { details } : {}),
        meta: {
            requestId,
            timestamp: new Date().toISOString(),
        },
    });
}
