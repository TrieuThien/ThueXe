import { getRoutes } from "../services/routeService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getRouteListHandler(req, res, next) {
    try {
        const routes = await getRoutes();
        return successResponse(res, { routes }, "Routes fetched successfully");
    } catch (error) {
        return next(error);
    }
}
