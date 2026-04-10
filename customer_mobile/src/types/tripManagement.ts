import { AppDateTime, ID } from "./common";
import { DriverProfile, DriverLocation } from "./ride";
import { PaymentMethodType } from "./wallet";

export type TripKind = "RIDE" | "RENTAL";

export type TripStatus =
  | "PENDING"
  | "DRIVER_ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface TripRouteInfo {
  pickupAddress: string;
  destinationAddress: string;
  stopAddresses?: string[];
}

export interface TripPriceInfo {
  estimatedPrice: number;
  finalPrice?: number;
  currency: "VND";
  paymentMethod: PaymentMethodType;
}

export interface ManagedTrip {
  id: ID;
  bookingId: ID;
  kind: TripKind;
  serviceLabel: string;
  status: TripStatus;
  etaMinutes?: number;
  createdAt: AppDateTime;
  updatedAt: AppDateTime;
  startedAt?: AppDateTime;
  completedAt?: AppDateTime;
  route: TripRouteInfo;
  durationMinutes?: number;
  driver?: DriverProfile;
  priceInfo: TripPriceInfo;
}

export interface ActiveTripResponse {
  activeTrip: ManagedTrip | null;
}

export interface TripHistoryResponse {
  items: ManagedTrip[];
}

export interface DriverTrackingSnapshot {
  bookingId: ID;
  status: TripStatus;
  etaMinutes?: number;
  driverLocation?: DriverLocation;
}
