export function successResponse(res, data = {}, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

export function errorResponse(res, message = "Request failed", statusCode = 400, code) {
    return res.status(statusCode).json({
        success: false,
        message,
        code,
    });
}
