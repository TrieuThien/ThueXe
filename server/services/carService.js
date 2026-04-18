import {
    createRide,
    findAllRides,
    findRideById,
    updateRideById,
    createVehicleType,
    updateVehicleTypeById,
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
        provide_rental:
            body.provide_rental === undefined
                ? existingRide?.provide_rental ?? 0
                : Number(body.provide_rental),
        rental_type_id: existingRide?.rental_type_id ?? null,
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

/**
 * Sync the vehicle_types table based on provide_rental flag.
 * Returns the rental_type_id that should be stored in rides.
 */
async function syncVehicleType(ridePayload, existingRide = null) {
    const wantsRental = ridePayload.provide_rental === 1;
    const existingRentalTypeId = existingRide?.rental_type_id ?? null;

    if (wantsRental) {
        const vtPayload = {
            type_name: ridePayload.ride_type,
            description: ridePayload.ride_desc,
            seat_count: ridePayload.num_seats,
            active: 1,
        };

        if (existingRentalTypeId) {
            // Update existing vehicle_type record
            await updateVehicleTypeById(existingRentalTypeId, vtPayload);
            return existingRentalTypeId;
        } else {
            // Create new vehicle_type record
            const newTypeId = await createVehicleType(vtPayload);
            return newTypeId;
        }
    } else {
        if (existingRentalTypeId) {
            // Deactivate the linked vehicle_type
            await updateVehicleTypeById(existingRentalTypeId, {
                type_name: existingRide.ride_type,
                description: existingRide.ride_desc,
                seat_count: existingRide.num_seats,
                active: 0,
            });
        }
        return null;
    }
}

export async function createCar(payload, file) {
    if (!file?.buffer) {
        throw new AppError("Car image is required", 400, "CAR_IMAGE_REQUIRED");
    }

    const rideImageUrl = await uploadCarImageToCloudinary(file);
    const ridePayload = buildRidePayload(payload, rideImageUrl);

    // Sync vehicle_types before inserting ride
    const rentalTypeId = await syncVehicleType(ridePayload, null);
    ridePayload.rental_type_id = rentalTypeId;

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

    // Sync vehicle_types based on provide_rental flag
    const rentalTypeId = await syncVehicleType(ridePayload, existingRide);
    ridePayload.rental_type_id = rentalTypeId;

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
