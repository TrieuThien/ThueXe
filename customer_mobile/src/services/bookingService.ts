import { BookingStatus, RentalBooking, RideBooking } from "../types";
import { rentalApi, rideApi } from "./api/modules";

function toBookingStatus(value: unknown): BookingStatus {
  const normalized = String(value ?? "").toUpperCase();
  if (
    normalized === "PENDING" ||
    normalized === "SEARCHING_DRIVER" ||
    normalized === "DRIVER_ASSIGNED" ||
    normalized === "ON_GOING" ||
    normalized === "COMPLETED" ||
    normalized === "CANCELLED"
  ) {
    return normalized;
  }
  if (normalized === "CONFIRMED") return "DRIVER_ASSIGNED";
  if (normalized === "IN_PROGRESS") return "ON_GOING";
  return "PENDING";
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickId(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      return String(value);
    }
  }
  return "";
}

function normalizeRideBooking(item: any): RideBooking {
  const pickupAddress = String(item?.pickup_address ?? item?.pickupAddress ?? item?.routeInfo?.pickupAddress ?? "");
  const destinationAddress = String(item?.destination_address ?? item?.destinationAddress ?? item?.routeInfo?.destinationAddress ?? "");

  return {
    id: pickId(item?.booking_id, item?.id),
    customerId: pickId(item?.user_id, item?.customer_id, item?.customerId),
    rideType: "CALL_RIDE",
    routeInfo: {
      pickupAddress,
      destinationAddress,
      pickupLocation: {
        lat: toNumber(item?.pickup_lat, toNumber(item?.routeInfo?.pickupLocation?.lat)),
        lng: toNumber(item?.pickup_lng, toNumber(item?.routeInfo?.pickupLocation?.lng)),
      },
      destinationLocation: {
        lat: toNumber(item?.destination_lat, toNumber(item?.routeInfo?.destinationLocation?.lat)),
        lng: toNumber(item?.destination_lng, toNumber(item?.routeInfo?.destinationLocation?.lng)),
      },
      distanceKm: toNumber(item?.distance_km, toNumber(item?.routeInfo?.distanceKm)),
      durationMinutes: toNumber(item?.estimated_duration_minutes, toNumber(item?.routeInfo?.durationMinutes)),
      encodedPolyline: item?.route_polyline ?? item?.routeInfo?.encodedPolyline,
    },
    estimatedFare: toNumber(item?.estimated_fare, item?.estimatedFare),
    finalFare: item?.final_fare != null ? toNumber(item?.final_fare) : item?.finalFare != null ? toNumber(item?.finalFare) : undefined,
    status: toBookingStatus(item?.booking_status ?? item?.status),
    driver: item?.driver
      ? {
          id: pickId(item.driver?.id, item.driver?.driver_id),
          fullName: String(item.driver?.fullName ?? item.driver?.full_name ?? ""),
          phoneNumber: String(item.driver?.phoneNumber ?? item.driver?.phone ?? ""),
          avatarUrl: item.driver?.avatarUrl ?? item.driver?.avatar_url,
          rating: toNumber(item.driver?.rating, 0),
          vehicleName: item.driver?.vehicleName ?? item.driver?.vehicle_name,
          licensePlate: item.driver?.licensePlate ?? item.driver?.license_plate,
        }
      : undefined,
    createdAt: String(item?.created_at ?? item?.createdAt ?? new Date().toISOString()),
    updatedAt: String(item?.updated_at ?? item?.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeRentalBooking(item: any): RentalBooking {
  const serviceType = Number(item?.service_type ?? item?.serviceType ?? 1);

  return {
    id: pickId(item?.rental_booking_id, item?.booking_id, item?.id),
    customerId: pickId(item?.user_id, item?.customer_id, item?.customerId),
    rideType: serviceType === 2 ? "RENTAL_DRIVER" : "RENTAL_CAR",
    pickupAddress: String(item?.pickup_address ?? item?.pickupAddress ?? ""),
    startAt: String(item?.start_datetime ?? item?.startAt ?? new Date().toISOString()),
    endAt: String(item?.end_datetime ?? item?.endAt ?? new Date().toISOString()),
    estimatedTotalPrice: toNumber(item?.estimated_fare, item?.estimatedTotalPrice),
    finalTotalPrice:
      item?.final_fare != null ? toNumber(item?.final_fare) : item?.finalTotalPrice != null ? toNumber(item?.finalTotalPrice) : undefined,
    notes: item?.note ?? item?.notes,
    status: toBookingStatus(item?.booking_status ?? item?.status),
    driver: item?.driver
      ? {
          id: pickId(item.driver?.id, item.driver?.driver_id),
          fullName: String(item.driver?.fullName ?? item.driver?.full_name ?? ""),
          phoneNumber: String(item.driver?.phoneNumber ?? item.driver?.phone ?? ""),
          avatarUrl: item.driver?.avatarUrl ?? item.driver?.avatar_url,
          rating: toNumber(item.driver?.rating, 0),
          vehicleName: item.driver?.vehicleName ?? item.driver?.vehicle_name,
          licensePlate: item.driver?.licensePlate ?? item.driver?.license_plate,
        }
      : undefined,
    createdAt: String(item?.created_at ?? item?.createdAt ?? new Date().toISOString()),
    updatedAt: String(item?.updated_at ?? item?.updatedAt ?? new Date().toISOString()),
  };
}

function extractItems(payload: unknown): any[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: any[] }).items;
  }

  return [];
}

export const bookingService = {
  getRideBookings: async (): Promise<RideBooking[]> => {
    const response = await rideApi.getBookingHistory({ page: 1, limit: 20 });
    return extractItems(response.data).map(normalizeRideBooking);
  },

  getRentalBookings: async (): Promise<RentalBooking[]> => {
    const response = await rentalApi.getBookingHistory({ page: 1, limit: 20 });
    return extractItems(response.data).map(normalizeRentalBooking);
  },
};
