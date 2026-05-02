import AppError from "../utils/appError.js";
import { verifyAccessToken } from "../utils/token.js";

// Like requireAuth but also accepts token from ?token= query param.
// Needed for browser EventSource which cannot send custom headers.
export default function requireAuthSse(req, res, next) {
    try {
        const queryToken  = req.query.token ? String(req.query.token) : null;
        const authHeader  = req.headers.authorization || "";
        const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        const accessToken = queryToken || bearerToken;

        if (!accessToken) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

        const payload = verifyAccessToken(accessToken);
        req.auth = {
            userId:      Number(payload.sub),
            role:        payload.role,
            userType:    Number(payload.userType),
            accountType: payload.accountType ?? null,
            tokenId:     payload.tid ?? null,
        };
        return next();
    } catch {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }
}
