import AppError from "../utils/appError.js";

export default function requireAdminAccountType(req, res, next) {
    const accountType = Number(req?.auth?.accountType);

    if (accountType !== 3) {
        return next(new AppError("You are not have permission to perform this action.", 403, "FORBIDDEN"));
    }

    return next();
}

