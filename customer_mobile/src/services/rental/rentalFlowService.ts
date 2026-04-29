import {
  CreateRentalBookingRequest,
  CreateRentalBookingResponse,
  RentalPackageListResponse,
  RentalPricingRequest,
  RentalPricingResponse,
  RentalSearchCriteria,
  RentalServiceType,
} from "../../types";
import { APP_CONFIG } from "../../constants";
import { apiClient } from "../api/client";

function serviceTypeToNumber(serviceType: RentalServiceType): number {
  if (serviceType === "RENTAL_CAR") return 1;
  if (serviceType === "RENTAL_DRIVER") return 2;
  return 3;
}

export const rentalFlowService = {
  searchPackages: async (criteria: RentalSearchCriteria): Promise<RentalPackageListResponse> => {
    const response = await apiClient.get<RentalPackageListResponse>(`${APP_CONFIG.customerApiPrefix}/rentals/packages`, {
      params: { service_type: serviceTypeToNumber(criteria.serviceType) },
    });
    const payload = (response.data ?? {}) as {
      packages?: unknown[];
      items?: Array<{
        package_id?: number | string;
        package_name?: string;
        base_price?: number;
        deposit_amount?: number;
        distance_limit_km?: number;
        extra_time_fee?: number;
        extra_distance_fee?: number;
      }>;
      suggestions?: unknown[];
    };

    const items = Array.isArray(payload.packages)
      ? payload.packages
      : Array.isArray(payload.items)
        ? payload.items
        : [];

    const packages = items.map((item, index) => {
      const source = (item ?? {}) as {
        package_id?: number | string;
        package_name?: string;
        base_price?: number;
        deposit_amount?: number;
        distance_limit_km?: number;
        extra_time_fee?: number;
        extra_distance_fee?: number;
      };

      const packageId = String(source.package_id ?? `pkg-${index}`);
      const basePrice = Number(source.base_price ?? 0);

      return {
        packageId,
        packageName: source.package_name ?? "Gói thuê",
        serviceType: criteria.serviceType,
        basePrice,
        totalEstimatedPrice: basePrice,
        currency: "VND" as const,
        availableVehicles: 0,
        conditions: {
          securityDeposit: Number(source.deposit_amount ?? 0),
          distanceLimitKm: Number(source.distance_limit_km ?? 0),
          overtimeFeePerHour: Number(source.extra_time_fee ?? 0),
          overDistanceFeePerKm: Number(source.extra_distance_fee ?? 0),
        },
        highlights: [],
      };
    });

    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions.filter((item): item is string => typeof item === "string")
      : [];

    return {
      criteria,
      packages,
      suggestions,
    };
  },

  estimatePricing: async (payload: RentalPricingRequest): Promise<RentalPricingResponse> => {
    const serverPayload = {
      service_type: serviceTypeToNumber(payload.criteria.serviceType),
      package_id: Number(payload.packageId),
      start_datetime: payload.criteria.startAt,
      duration_hours: payload.criteria.durationHours,
      distance_km: 0,
      coupon_code: payload.couponCode ?? null,
    };

    const response = await apiClient.post<unknown>(`${APP_CONFIG.customerApiPrefix}/rentals/fare-estimate`, serverPayload);

    const raw = (response.data ?? {}) as {
      package_id?: number;
      breakdown?: {
        base_price?: number;
        extra_time_fee?: number;
        extra_distance_fee?: number;
        subtotal?: number;
        deposit_amount?: number;
        discount_amount?: number;
        total_price?: number;
      };
    };

    const bd = raw.breakdown ?? {};
    return {
      packageId: String(raw.package_id ?? payload.packageId),
      basePrice: Number(bd.base_price ?? 0),
      durationFee: Number(bd.extra_time_fee ?? 0),
      serviceFee: Number(bd.extra_distance_fee ?? 0),
      discount: Number(bd.discount_amount ?? 0),
      deposit: Number(bd.deposit_amount ?? 0),
      totalPayableNow: Number(bd.total_price ?? 0),
      currency: "VND",
    };
  },

  createRentalBooking: async (payload: CreateRentalBookingRequest): Promise<CreateRentalBookingResponse> => {
    const serverPayload: Record<string, unknown> = {
      service_type: serviceTypeToNumber(payload.serviceType),
      package_id: Number(payload.packageId),
      start_datetime: payload.startAt,
      duration_hours: payload.durationHours,
      pickup_address: payload.pickupAddress,
    };
    if (payload.dropoffAddress) serverPayload.dropoff_address = payload.dropoffAddress;
    if (payload.couponCode) serverPayload.coupon_code = payload.couponCode;
    if (payload.note) serverPayload.note = payload.note;

    const response = await apiClient.post<unknown>(`${APP_CONFIG.customerApiPrefix}/rentals/bookings`, serverPayload);

    const raw = (response.data ?? {}) as {
      booking?: {
        rental_id?: number;
        rental_code?: string;
        status?: string;
      };
      message?: string;
    };

    const booking = raw.booking ?? {};
    const rentalId = String(booking.rental_id ?? "");
    const rawStatus = String(booking.status ?? "").toLowerCase();
    const bookingStatus: "PENDING" | "SCHEDULED" = rawStatus === "scheduled" ? "SCHEDULED" : "PENDING";

    return {
      bookingId: rentalId,
      rentalBookingId: rentalId,
      bookingStatus,
      message: raw.message ?? `Đặt thuê xe thành công. Mã đơn: ${booking.rental_code ?? rentalId}`,
    };
  },

  createVehicleRentalBooking: async (params: {
    service_type: number;
    package_id: number;
    vehicle_id: number;
    start_datetime: string;
    duration_hours: number;
    pickup_address: string;
    dropoff_address?: string;
    payment_type?: number;
    coupon_code?: string;
  }): Promise<{
    booking: { rental_id: number; rental_code: string; status: string; [key: string]: unknown };
    pricing: Record<string, unknown>;
    coupon: { coupon_code: string } | null;
  }> => {
    const response = await apiClient.post<{
      booking: { rental_id: number; rental_code: string; status: string; [key: string]: unknown };
      pricing: Record<string, unknown>;
      coupon: { coupon_code: string } | null;
    }>(`${APP_CONFIG.customerApiPrefix}/rentals/bookings`, params);
    return response.data;
  },
};
