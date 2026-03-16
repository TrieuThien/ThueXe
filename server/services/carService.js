import {
    createRide,
    findAllRides,
    findRideById,
    updateRideById,
} from "../repositories/carRepository.js";
import {
    deleteCloudinaryImage,
    uploadBufferToCloudinary,
} from "../config/cloudinary.js";
import AppError from "../utils/appError.js";

const CAR_IMAGE_FOLDER = "thuexe/cars";

function buildRidePayload(body, rideImageUrl, existingRide = null) {
    return {
        ride_type: body.ride_type,
        ride_desc: body.ride_desc,
        ride_img: rideImageUrl || existingRide?.ride_img,
        num_seats: Number(body.num_seats),
        icon_type:
            body.icon_type === undefined ? existingRide?.icon_type ?? 1 : Number(body.icon_type),
        avail: body.avail === undefined ? existingRide?.avail ?? 1 : Number(body.avail),
    };
}

async function uploadCarImageToCloudinary(file) {
    if (!file?.buffer) {
        return;
    }

    const result = await uploadBufferToCloudinary(file.buffer, {
        folder: CAR_IMAGE_FOLDER,
        resource_type: "image",
    });

    return result.secure_url;
}

async function deleteCloudinaryRideImageIfNeeded(imageUrl) {
    if (!imageUrl || !imageUrl.includes("/thuexe/cars/")) {
        return;
    }

    await deleteCloudinaryImage(imageUrl);
}

export async function createCar(payload, file) {
    if (!file?.buffer) {
        throw new AppError("Car image is required", 400, "CAR_IMAGE_REQUIRED");
    }

    const rideImageUrl = await uploadCarImageToCloudinary(file);
    const ridePayload = buildRidePayload(payload, rideImageUrl);
    const rideId = await createRide(ridePayload);

    return findRideById(rideId);
}

export async function getCars() {
    return findAllRides();
}

export async function updateCar(id, payload, file) {
    const existingRide = await findRideById(id);

    if (!existingRide) {
        throw new AppError("Car not found", 404, "CAR_NOT_FOUND");
    }

    const rideImageUrl = file?.buffer ? await uploadCarImageToCloudinary(file) : null;
    const ridePayload = buildRidePayload(payload, rideImageUrl, existingRide);
    const updated = await updateRideById(id, ridePayload);

    if (!updated) {
        if (rideImageUrl) {
            await deleteCloudinaryRideImageIfNeeded(rideImageUrl);
        }

        throw new AppError("Car not found", 404, "CAR_NOT_FOUND");
    }

    if (rideImageUrl) {
        await deleteCloudinaryRideImageIfNeeded(existingRide.ride_img);
    }

    return findRideById(id);
}
