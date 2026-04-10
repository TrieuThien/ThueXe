import { ID } from "./common";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RideStopPoint {
  address: string;
  coordinate: Coordinate;
}

export interface RideRouteEstimateRequest {
  pickupAddress: string;
  destinationAddress: string;
  stopAddresses: string[];
  scheduledAt?: string;
  currentLocation?: Coordinate;
}

export interface RideRouteEstimateResponse {
  routeId: ID;
  distanceKm: number;
  etaMinutes: number;
  polyline: string;
  polylineCoordinates: Coordinate[];
  pickup: RideStopPoint;
  destination: RideStopPoint;
  stops: RideStopPoint[];
}

export interface RideVehicleOption {
  vehicleCode: string;
  displayName: string;
  description: string;
  seats: number;
  etaPickupMinutes: number;
  baseFare: number;
  perKmFare: number;
  serviceFee: number;
  bookingFee: number;
}

export interface RidePricingEstimateRequest {
  routeId: ID;
  vehicleCode: string;
  paymentMethodId: string;
  couponCode?: string;
  scheduledAt?: string;
}

export interface RidePricingBreakdown {
  estimatedFare: number;
  distanceFee: number;
  serviceFee: number;
  bookingFee: number;
  surcharge: number;
  discount: number;
  totalPayable: number;
  currency: "VND";
}

export interface RidePricingEstimateResponse {
  tariffId: ID;
  routeId: ID;
  vehicleCode: string;
  couponCodeApplied?: string;
  breakdown: RidePricingBreakdown;
}

export interface RidePaymentMethodOption {
  id: string;
  type: "WALLET" | "CASH" | "BANK_CARD" | "MOMO";
  displayName: string;
  subtitle?: string;
}

export interface RideCouponPreview {
  code: string;
  description: string;
  discountText: string;
}

export interface CreateRideBookingRequest {
  bookingType: "IMMEDIATE" | "SCHEDULED";
  scheduledAt?: string;
  pickupAddress: string;
  destinationAddress: string;
  stopAddresses: string[];
  routeId: ID;
  tariffId: ID;
  vehicleCode: string;
  paymentMethodId: string;
  couponCode?: string;
  note?: string;
  currentLocation?: Coordinate;
}

export interface CreateRideBookingResponse {
  bookingId: ID;
  rideId: ID;
  bookingStatus: "PENDING" | "SCHEDULED";
  message: string;
}

export interface DriverAllocationStatusResponse {
  bookingId: ID;
  allocationStatus: "SEARCHING" | "ALLOCATED" | "FAILED";
  driverId?: ID;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  etaPickupMinutes?: number;
  reason?: string;
}
