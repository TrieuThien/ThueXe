import { successResponse } from "../utils/apiResponse.js";
import {
    listMyRatings,
    rateDriverByPassenger,
    ratePassengerByDriver,
} from "../services/ratingService.js";

export async function rateDriverHandler(req, res, next) {
    try {
        const result = await rateDriverByPassenger({ auth: req.auth, payload: req.body });
        return successResponse(res, result, "Driver rated successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function ratePassengerHandler(req, res, next) {
    try {
        const result = await ratePassengerByDriver({ auth: req.auth, payload: req.body });
        return successResponse(res, result, "Passenger rated successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function myRatingsHandler(req, res, next) {
    try {
        const result = await listMyRatings({ auth: req.auth });
        return successResponse(res, result, "Ratings fetched successfully");
    } catch (error) {
        return next(error);
    }
}

