import AppError from "../utils/appError.js";
import { verifyAccessToken } from "../utils/token.js";

export default function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const isBearer = authHeader.startsWith("Bearer ");

        if (!isBearer) {
            throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const accessToken = authHeader.split(" ")[1];
        const payload = verifyAccessToken(accessToken);

        req.auth = {
            userId: Number(payload.sub),
            role: payload.role,
            userType: Number(payload.userType),
            accountType: payload.accountType ?? null,
            tokenId: payload.tid ?? null,
        };

        return next();
    } catch (error) {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }
}
