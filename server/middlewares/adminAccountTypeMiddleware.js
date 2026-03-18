import AppError from "../utils/appError.js";

export default function requireAdminAccountType(req, res, next) {
    const accountType = Number(req?.auth?.accountType);

    if (accountType !== 3) {
        return next(new AppError("Bạn không có quyền thực hiện thao tác này.", 403, "FORBIDDEN"));
    }

    return next();
}

