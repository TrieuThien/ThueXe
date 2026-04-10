import { AppDateTime, BookingStatus, ID } from "./common";

export type RideType = "CALL_RIDE" | "RENTAL_CAR" | "RENTAL_DRIVER";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  pickupAddress: string;
  destinationAddress: string;
  pickupLocation: GeoPoint;
  destinationLocation: GeoPoint;
  distanceKm: number;
  durationMinutes: number;
  encodedPolyline?: string;
}

export interface DriverLocation {
  driverId: ID;
  heading: number;
  speedKmh: number;
  lastUpdatedAt: AppDateTime;
  location: GeoPoint;
}

export interface DriverProfile {
  id: ID;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
  rating: number;
  vehicleName?: string;
  licensePlate?: string;
}

export interface RideBooking {
  id: ID;
  customerId: ID;
  rideType: Extract<RideType, "CALL_RIDE">;
  routeInfo: RouteInfo;
  estimatedFare: number;
  finalFare?: number;
  status: BookingStatus;
  driver?: DriverProfile;
  createdAt: AppDateTime;
  updatedAt: AppDateTime;
}

export interface RentalBooking {
  id: ID;
  customerId: ID;
  rideType: Extract<RideType, "RENTAL_CAR" | "RENTAL_DRIVER">;
  pickupAddress: string;
  startAt: AppDateTime;
  endAt: AppDateTime;
  estimatedTotalPrice: number;
  finalTotalPrice?: number;
  notes?: string;
  status: BookingStatus;
  driver?: DriverProfile;
  createdAt: AppDateTime;
  updatedAt: AppDateTime;
}
