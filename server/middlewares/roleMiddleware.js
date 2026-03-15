import AppError from "../utils/appError.js";

export default function requireRole(...allowedRoles) {
    return function roleGuard(req, res, next) {
        const role = req?.auth?.role;

        if (!role || !allowedRoles.includes(role)) {
            return next(new AppError("Forbidden", 403, "FORBIDDEN"));
        }

        return next();
    };
}
