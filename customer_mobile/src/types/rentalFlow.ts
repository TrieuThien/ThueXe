import { ID } from "./common";
import { Coordinate } from "./rideFlow";

export type RentalServiceType = "RENTAL_CAR" | "RENTAL_DRIVER" | "RENTAL_CAR_WITH_DRIVER";

export interface RentalSearchCriteria {
  serviceType: RentalServiceType;
  startAt: string;
  durationHours: number;
  pickupAddress: string;
  dropoffAddress?: string;
  pickupCoordinate?: Coordinate;
  dropoffCoordinate?: Coordinate;
}

export interface RentalPackageConditions {
  securityDeposit: number;
  distanceLimitKm: number;
  overtimeFeePerHour: number;
  overDistanceFeePerKm: number;
}

export interface RentalPackageItem {
  packageId: ID;
  packageName: string;
  serviceType: RentalServiceType;
  vehicleTypeName?: string;
  driverLevel?: string;
  basePrice: number;
  totalEstimatedPrice: number;
  currency: "VND";
  availableVehicles: number;
  conditions: RentalPackageConditions;
  highlights: string[];
}

export interface RentalPackageListResponse {
  criteria: RentalSearchCriteria;
  packages: RentalPackageItem[];
  suggestions: string[];
}

export interface RentalPricingRequest {
  packageId: ID;
  criteria: RentalSearchCriteria;
  note?: string;
  couponCode?: string;
}

export interface RentalPricingResponse {
  packageId: ID;
  basePrice: number;
  durationFee: number;
  serviceFee: number;
  discount: number;
  deposit: number;
  totalPayableNow: number;
  currency: "VND";
}

export interface CreateRentalBookingRequest {
  serviceType: RentalServiceType;
  packageId: ID;
  startAt: string;
  durationHours: number;
  pickupAddress: string;
  dropoffAddress?: string;
  note?: string;
  couponCode?: string;
  pickupCoordinate?: Coordinate;
}

export interface CreateRentalBookingResponse {
  bookingId: ID;
  rentalBookingId: ID;
  bookingStatus: "PENDING" | "SCHEDULED";
  message: string;
}

export interface RentalServiceOption {
  id: RentalServiceType;
  title: string;
  subtitle: string;
  iconKey: "car" | "driver" | "combo";
}

export interface RentalLocationBrief {
  pickupAddress: string;
  dropoffAddress?: string;
  pickupCoordinate?: Coordinate;
}
