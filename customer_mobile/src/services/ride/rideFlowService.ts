import { APP_CONFIG, QUERY_KEYS } from "../../constants";
import {
  Coordinate,
  CreateRideBookingRequest,
  CreateRideBookingResponse,
  DriverAllocationStatusResponse,
  RideCouponPreview,
  RidePaymentMethodOption,
  RidePricingEstimateRequest,
  RidePricingEstimateResponse,
  RideRouteEstimateRequest,
  RideRouteEstimateResponse,
  RideVehicleOption,
} from "../../types";
import { ApiError } from "../api/errors";
import { apiClient } from "../api/client";

interface BackendRoutePoint {
  lat: number;
  lng: number;
  address?: string | null;
}

interface BackendRouteEstimateResponse {
  route_id?: number | string | null;
  distance_km?: number | string;
  duration_min?: number | string;
  polyline?: string;
}

interface BackendPricingResponse {
  route_id?: number | string | null;
  ride_id?: number | string | null;
  coupon?: {
    coupon_code?: string;
  } | null;
  breakdown?: {
    base_fare?: number | string;
    distance_fare?: number | string;
    time_fare?: number | string;
    surcharge?: number | string;
    discount?: number | string;
    total?: number | string;
  };
}

interface BackendCreateBookingResponse {
  booking?: {
    id?: number | string;
    ride_id?: number | string;
    status?: number;
    scheduled?: number;
  };
}

const FALLBACK_PAYMENT_METHODS: RidePaymentMethodOption[] = [
  { id: "1", type: "CASH", displayName: "Tiền mặt" },
  { id: "2", type: "WALLET", displayName: "Ví ThueXe" },
];

function normalizeRidePaymentMethodType(value: unknown): RidePaymentMethodOption["type"] {
  const normalized = String(value ?? "WALLET").toUpperCase();
  if (normalized === "CASH" || normalized === "BANK_CARD" || normalized === "MOMO") {
    return normalized;
  }
  return "WALLET";
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolvePaymentTypeId(paymentMethodId: string): number {
  const direct = Number(paymentMethodId);
  if ([1, 2, 3, 4].includes(direct)) {
    return direct;
  }

  const normalized = paymentMethodId.trim().toUpperCase();
  if (normalized.includes("WALLET")) return 2;
  if (normalized.includes("CASH")) return 1;
  if (normalized.includes("CARD") || normalized.includes("BANK") || normalized.includes("MOMO")) return 3;
  return 1;
}

function toRidePaymentMethods(payload: unknown): RidePaymentMethodOption[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && Array.isArray((payload as { methods?: unknown[] }).methods)
        ? (payload as { methods: unknown[] }).methods
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)
          ? (payload as { data: unknown[] }).data
          : [];

  const normalized = list
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const id = row.id ?? row.payment_type ?? row.payment_method_id ?? row.method_id ?? row.code ?? `${index + 1}`;
      return {
        id: String(id),
        type: normalizeRidePaymentMethodType(row.type ?? row.payment_type ?? row.method_type),
        displayName: String(row.displayName ?? row.title ?? row.name ?? row.label ?? "Phương thức thanh toán"),
        subtitle: row.subtitle ? String(row.subtitle) : undefined,
      };
    })
    .filter((method) => method.id.length > 0)
    .filter((method) => method.type !== "BANK_CARD" && method.type !== "SEPAY");

  if (normalized.length === 0) {
    return FALLBACK_PAYMENT_METHODS;
  }

  return normalized;
}

function toRideVehicleOptions(payload: unknown): RideVehicleOption[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && Array.isArray((payload as { vehicles?: unknown[] }).vehicles)
        ? (payload as { vehicles: unknown[] }).vehicles
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)
          ? (payload as { data: unknown[] }).data
          : [];

  return list
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const vehicleCode = String(row.vehicleCode ?? row.vehicle_code ?? row.ride_id ?? row.id ?? row.code ?? `${index + 1}`);
      return {
        vehicleCode,
        displayName: String(row.displayName ?? row.display_name ?? row.ride_type ?? row.name ?? "Xe"),
        description: String(row.description ?? row.ride_desc ?? ""),
        seats: toFiniteNumber(row.seats ?? row.num_seats ?? row.capacity, 4),
        etaPickupMinutes: toFiniteNumber(row.etaPickupMinutes ?? row.eta_pickup_minutes ?? row.eta, 0),
        baseFare: toFiniteNumber(row.baseFare ?? row.base_fare ?? row.minimum_fare, 0),
        perKmFare: toFiniteNumber(row.perKmFare ?? row.per_km_fare ?? row.price_per_km, 0),
        serviceFee: toFiniteNumber(row.serviceFee ?? row.service_fee, 0),
        bookingFee: toFiniteNumber(row.bookingFee ?? row.booking_fee, 0),
      };
    })
    .filter((item) => item.vehicleCode.length > 0);
}

function toDiscountText(discountType: number, discountValue: number): string {
  if (discountType === 0) {
    return `-${discountValue}%`;
  }

  const formatted = Number.isFinite(discountValue) ? discountValue.toLocaleString("vi-VN") : "0";
  return `-${formatted}d`;
}

function toRideCoupons(payload: unknown): RideCouponPreview[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && Array.isArray((payload as { coupons?: unknown[] }).coupons)
        ? (payload as { coupons: unknown[] }).coupons
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)
          ? (payload as { data: unknown[] }).data
          : [];

  return list
    .map((item) => {
      const row = item as Record<string, unknown>;
      const code = String(row.code ?? row.coupon_code ?? "").trim();
      const discountType = Number(row.discount_type ?? row.discountType ?? 0);
      const discountValue = Number(row.discount_value ?? row.discountValue ?? 0);
      return {
        code,
        description: String(row.description ?? row.title ?? row.coupon_title ?? ""),
        discountText: String(row.discountText ?? toDiscountText(discountType, discountValue)),
      };
    })
    .filter((item) => item.code.length > 0);
}

function toRidePricingEstimate(payload: BackendPricingResponse, request: RidePricingEstimateRequest): RidePricingEstimateResponse {
  const baseFare = toFiniteNumber(payload.breakdown?.base_fare);
  const distanceFare = toFiniteNumber(payload.breakdown?.distance_fare);
  const timeFare = toFiniteNumber(payload.breakdown?.time_fare);
  const surcharge = toFiniteNumber(payload.breakdown?.surcharge);
  const discount = toFiniteNumber(payload.breakdown?.discount);
  const total = toFiniteNumber(payload.breakdown?.total);

  return {
    tariffId: `${payload.route_id ?? request.routeId}_${payload.ride_id ?? request.vehicleCode}`,
    routeId: String(payload.route_id ?? request.routeId),
    vehicleCode: String(payload.ride_id ?? request.vehicleCode),
    couponCodeApplied: payload.coupon?.coupon_code,
    breakdown: {
      estimatedFare: baseFare + distanceFare + timeFare + surcharge,
      distanceFee: distanceFare,
      serviceFee: timeFare,
      bookingFee: baseFare,
      surcharge,
      discount,
      totalPayable: total,
      currency: "VND",
    },
  };
}

function toCreateRideBookingResponse(payload: BackendCreateBookingResponse): CreateRideBookingResponse {
  const bookingId = String(payload.booking?.id ?? "0");
  const bookingStatus = payload.booking?.scheduled === 1 ? "SCHEDULED" : "PENDING";
  return {
    bookingId,
    rideId: String(payload.booking?.ride_id ?? "0"),
    bookingStatus,
    message: bookingStatus === "SCHEDULED" ? "Booking scheduled successfully." : "Booking created successfully.",
  };
}

function toDriverAllocationStatusResponse(payload: unknown): DriverAllocationStatusResponse {
  const row = payload as Record<string, unknown>;
  const booking = (row.booking ?? {}) as Record<string, unknown>;
  const driver = (booking.driver ?? {}) as Record<string, unknown>;
  const status = Number(booking.status ?? 0);
  const hasDriver = Boolean(driver.driver_id);

  if (hasDriver) {
    return {
      bookingId: String(booking.id ?? "0"),
      allocationStatus: "ALLOCATED",
      driverId: String(driver.driver_id),
      driverName: [driver.firstname, driver.lastname].filter(Boolean).join(" ").trim() || undefined,
      driverPhone: driver.phone ? String(driver.phone) : undefined,
      vehiclePlate: undefined,
      etaPickupMinutes: undefined,
    };
  }

  if ([2, 4, 5].includes(status)) {
    return {
      bookingId: String(booking.id ?? "0"),
      allocationStatus: "FAILED",
      reason: booking.cancel_comment ? String(booking.cancel_comment) : "Không tìm được tài xế",
    };
  }

  return {
    bookingId: String(booking.id ?? "0"),
    allocationStatus: "SEARCHING",
  };
}

function toCoordinate(point: BackendRoutePoint): Coordinate {
  return {
    latitude: Number(point.lat),
    longitude: Number(point.lng),
  };
}

function decodePolyline(polyline: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < polyline.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < polyline.length);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;

    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < polyline.length);

    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
}

async function geocodeAddress(address: string): Promise<Coordinate | null> {
  const query = address.trim();
  if (!query) return null;

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = payload[0];
  const latitude = first?.lat ? Number(first.lat) : NaN;
  const longitude = first?.lon ? Number(first.lon) : NaN;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

async function resolvePoint(address: string, coordinate?: Coordinate): Promise<BackendRoutePoint> {
  let resolved: Coordinate | null | undefined = coordinate;
  if (!resolved) {
    resolved = await geocodeAddress(address);
  }

  if (!resolved) {
    throw new ApiError({
      code: "MAP_API_ERROR",
      message: `Khong xac dinh duoc toa do cho dia chi: ${address}`,
      status: 422,
    });
  }

  return {
    lat: resolved.latitude,
    lng: resolved.longitude,
    address: address.trim(),
  };
}

export const rideFlowService = {
  getRouteEstimate: async (payload: RideRouteEstimateRequest): Promise<RideRouteEstimateResponse> => {
    const stopAddresses = payload.stopAddresses.filter((item) => item.trim().length > 0).slice(0, 2);
    const pickupPoint = await resolvePoint(payload.pickupAddress, payload.pickupCoordinate ?? payload.currentLocation);
    const destinationPoint = await resolvePoint(payload.destinationAddress, payload.destinationCoordinate);

    const waypoints: BackendRoutePoint[] = [];
    for (let i = 0; i < stopAddresses.length; i += 1) {
      const stopAddress = stopAddresses[i] ?? "";
      if (!stopAddress) {
        continue;
      }
      const stopCoordinate = payload.stopCoordinates?.[i];
      const resolvedStop = await resolvePoint(stopAddress, stopCoordinate);
      waypoints.push(resolvedStop);
    }

    const response = await apiClient.post<BackendRouteEstimateResponse>(`${APP_CONFIG.customerApiPrefix}/ride/map/estimate-route`, {
      pickup: pickupPoint,
      dropoff: destinationPoint,
      waypoints,
    });

    const distanceKm = Number(response.data.distance_km || 0);
    const etaMinutesRaw = Number(response.data.duration_min || 0);
    const polyline = String(response.data.polyline || "");
    const polylineCoordinates =
      polyline.length > 0 ? decodePolyline(polyline) : [toCoordinate(pickupPoint), ...waypoints.map(toCoordinate), toCoordinate(destinationPoint)];

    return {
      routeId: String(response.data.route_id ?? "0"),
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
      etaMinutes: Number.isFinite(etaMinutesRaw) ? Math.max(1, Math.round(etaMinutesRaw)) : 1,
      polyline,
      polylineCoordinates,
      pickup: {
        address: payload.pickupAddress,
        coordinate: toCoordinate(pickupPoint),
      },
      destination: {
        address: payload.destinationAddress,
        coordinate: toCoordinate(destinationPoint),
      },
      stops: waypoints.map((item, index) => ({
        address: stopAddresses[index] ?? item.address ?? `Diem dung ${index + 1}`,
        coordinate: toCoordinate(item),
      })),
    };
  },

  getVehicleOptions: async (routeId: string): Promise<RideVehicleOption[]> => {
    const response = await apiClient.get<unknown>(`${APP_CONFIG.customerApiPrefix}/rides`, {
      params: { routeId },
    });
    return toRideVehicleOptions(response.data);
  },

  getPaymentMethods: async (): Promise<RidePaymentMethodOption[]> => {
    const response = await apiClient.get<unknown>(`${APP_CONFIG.customerApiPrefix}/wallet`);
    return toRidePaymentMethods(response.data);
  },

  getAvailableCoupons: async (): Promise<RideCouponPreview[]> => {
    const response = await apiClient.get<unknown>(`${APP_CONFIG.customerApiPrefix}/coupons/available`);
    return toRideCoupons(response.data);
  },

  estimatePricing: async (payload: RidePricingEstimateRequest): Promise<RidePricingEstimateResponse> => {
    const pricingPayload = {
      route_id: Number(payload.routeId),
      ride_id: Number(payload.vehicleCode),
      service_type: 0,
      payment_type: resolvePaymentTypeId(payload.paymentMethodId),
      coupon_code: payload.couponCode ? String(payload.couponCode).trim().toUpperCase() : undefined,
      scheduled_at: payload.scheduledAt,
      map_estimate: {
        distance_km: toFiniteNumber(payload.distanceKm, 0),
        duration_min: toFiniteNumber(payload.durationMin, 0),
      },
    };

    const response = await apiClient.post<BackendPricingResponse>(`${APP_CONFIG.customerApiPrefix}/ride/fare-estimate`, pricingPayload);
    return toRidePricingEstimate(response.data, payload);
  },

  createRideBooking: async (payload: CreateRideBookingRequest): Promise<CreateRideBookingResponse> => {
    const pickupCoordinate = payload.pickupCoordinate ?? payload.currentLocation;
    if (!pickupCoordinate || !payload.destinationCoordinate) {
      throw new ApiError({
        code: "INVALID_COORDINATE",
        message: "Thieu toa do diem don/diem den",
        status: 422,
      });
    }

    const waypoints = (payload.stopCoordinates ?? [])
      .filter((item): item is Coordinate => Boolean(item))
      .map((item, index) => ({
        lat: item.latitude,
        lng: item.longitude,
        address: payload.stopAddresses[index] ?? undefined,
      }))
      .slice(0, 2);

    const bookingPayload = {
      route_id: Number(payload.routeId),
      ride_id: Number(payload.vehicleCode),
      service_type: 0,
      payment_type: resolvePaymentTypeId(payload.paymentMethodId),
      scheduled_at: payload.bookingType === "SCHEDULED" ? payload.scheduledAt : undefined,
      pickup_address: payload.pickupAddress,
      dropoff_address: payload.destinationAddress,
      pickup: {
        lat: pickupCoordinate.latitude,
        lng: pickupCoordinate.longitude,
      },
      dropoff: {
        lat: payload.destinationCoordinate.latitude,
        lng: payload.destinationCoordinate.longitude,
      },
      waypoints,
      map_estimate: {
        distance_km: toFiniteNumber(payload.distanceKm, 0),
        duration_min: toFiniteNumber(payload.durationMin, 0),
      },
      coupon_code: payload.couponCode ? String(payload.couponCode).trim().toUpperCase() : undefined,
      num_seats: payload.numSeats ?? 1,
      note: payload.note,
    };

    const response = await apiClient.post<BackendCreateBookingResponse>(`${APP_CONFIG.customerApiPrefix}/ride/bookings`, bookingPayload);
    return toCreateRideBookingResponse(response.data);
  },

  getDriverAllocationStatus: async (bookingId: string): Promise<DriverAllocationStatusResponse> => {
    const response = await apiClient.get<unknown>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/tracking`);
    return toDriverAllocationStatusResponse(response.data);
  },

  retryDriverAllocation: async (bookingId: string): Promise<DriverAllocationStatusResponse> => {
    const response = await apiClient.get<unknown>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/tracking`);
    return toDriverAllocationStatusResponse(response.data);
  },
};

export const rideFlowQueryKeys = {
  routeEstimate: (pickupAddress: string, destinationAddress: string, stopAddresses: string[]) =>
    [...QUERY_KEYS.rideRouteEstimate, pickupAddress, destinationAddress, ...stopAddresses] as const,
  vehicleOptions: (routeId?: string) => [...QUERY_KEYS.rideVehicleOptions, routeId ?? "none"] as const,
  pricing: (routeId?: string, vehicleCode?: string, paymentMethodId?: string, couponCode?: string, scheduledAt?: string) =>
    [
      ...QUERY_KEYS.ridePricing,
      routeId ?? "none",
      vehicleCode ?? "none",
      paymentMethodId ?? "none",
      couponCode ?? "none",
      scheduledAt ?? "now",
    ] as const,
  driverAllocation: (bookingId: string) => [...QUERY_KEYS.driverAllocation, bookingId] as const,
};

