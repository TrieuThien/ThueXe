import { createCar, getCars, updateCar } from "../services/carService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function createCarHandler(req, res, next) {
    try {
        const car = await createCar(req.body, req.file);
        return successResponse(res, { car }, "Car created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function getCarListHandler(req, res, next) {
    try {
        const cars = await getCars();
        return successResponse(res, { cars }, "Cars fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function updateCarHandler(req, res, next) {
    try {
        const car = await updateCar(Number(req.params.id), req.body, req.file);
        return successResponse(res, { car }, "Car updated successfully");
    } catch (error) {
        return next(error);
    }
}
