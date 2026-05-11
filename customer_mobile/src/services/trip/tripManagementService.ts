import { QUERY_KEYS } from "../../constants";
import {
  ActiveTripResponse,
  DriverTrackingSnapshot,
  ManagedTrip,
  TripHistoryResponse,
} from "../../types";
import { APP_CONFIG } from "../../constants";
import { apiClient } from "../api/client";

const STATUS_MAP_NUMERIC: Record<number, ManagedTrip["status"]> = {
  0: "PENDING",
  1: "IN_PROGRESS",
  2: "CANCELLED",
  3: "COMPLETED",
  4: "CANCELLED",
  5: "CANCELLED",
  6: "ARRIVED",
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toTripStatus(value: unknown, hasDriver = false): ManagedTrip["status"] {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric === 0 && hasDriver) return "DRIVER_ACCEPTED";
    if (STATUS_MAP_NUMERIC[numeric] !== undefined) return STATUS_MAP_NUMERIC[numeric];
  }

  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "PENDING") return "PENDING";
  if (normalized === "DRIVER_ACCEPTED" || normalized === "ACCEPTED" || normalized === "CONFIRMED") return "DRIVER_ACCEPTED";
  if (normalized === "ARRIVED") return "ARRIVED";
  if (normalized === "IN_PROGRESS" || normalized === "ONRIDE" || normalized === "ON_RIDE") return "IN_PROGRESS";
  if (normalized === "COMPLETED" || normalized === "DONE") return "COMPLETED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";
  return "PENDING";
}

function toDriverProfile(raw: unknown): ManagedTrip["driver"] {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;

  const firstName = String(d.firstname ?? d.first_name ?? "");
  const lastName  = String(d.lastname  ?? d.last_name  ?? "");
  const fullName  =
    String(d.fullName ?? d.full_name ?? "").trim() ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Tài xế";

  const rawRating = d.rating ?? d.driver_rating;

  return {
    id:           Number(d.id ?? d.driver_id ?? 0),
    fullName,
    phoneNumber:  String(d.phoneNumber ?? d.phone_number ?? d.phone ?? ""),
    rating:       rawRating != null ? Number(rawRating) : (undefined as unknown as number),
    avatarUrl:    (d.avatarUrl ?? d.avatar_url ?? d.photo_url ?? d.photo_file ?? undefined) as string | undefined,
    vehicleName:  (d.vehicleName ?? d.vehicle_name ?? d.car_model ?? undefined) as string | undefined,
    licensePlate: (d.licensePlate ?? d.license_plate ?? d.car_plate_num ?? undefined) as string | undefined,
  };
}

function toPaymentMethod(value: unknown): ManagedTrip["priceInfo"]["paymentMethod"] {
  const numeric = Number(value);
  if (numeric === 1) return "CASH";
  if (numeric === 2) return "WALLET";
  if (numeric === 3 || numeric === 4) return "BANK_CARD";

  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized.includes("CASH")) return "CASH";
  if (normalized.includes("WALLET")) return "WALLET";
  if (normalized.includes("CARD") || normalized.includes("BANK")) return "BANK_CARD";
  return "WALLET";
}

function toManagedTrip(raw: unknown): ManagedTrip | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const bookingId = String(item.bookingId ?? item.booking_id ?? item.id ?? "");
  if (!bookingId) return null;

  const pickupAddress = String(
    item.pickupAddress ??
      item.pickup_address ??
      (item.route as Record<string, unknown> | undefined)?.pickupAddress ??
      "",
  );
  const destinationAddress = String(
    item.destinationAddress ??
      item.destination_address ??
      item.dropoffAddress ??
      item.dropoff_address ??
      (item.route as Record<string, unknown> | undefined)?.destinationAddress ??
      "",
  );

  const estimatedPrice = Number(
    item.estimatedPrice ??
      item.estimated_price ??
      item.estimated_cost ??
      (item.priceInfo as Record<string, unknown> | undefined)?.estimatedPrice ??
      0,
  );
  const finalPriceRaw =
    item.finalPrice ??
    item.final_price ??
    item.actual_cost ??
    (item.priceInfo as Record<string, unknown> | undefined)?.finalPrice;
  const finalPriceNum = finalPriceRaw === undefined || finalPriceRaw === null ? undefined : Number(finalPriceRaw);
  const finalPrice = finalPriceNum !== undefined && Number.isFinite(finalPriceNum) && finalPriceNum > 0
    ? finalPriceNum
    : undefined;

  return {
    id: bookingId,
    bookingId,
    kind: "RIDE",
    serviceLabel: String(item.serviceLabel ?? item.ride_type ?? item.service_type ?? "Đi chuyển"),
    status: toTripStatus(item.status, !!item.driver),
    etaMinutes: item.etaMinutes ? Number(item.etaMinutes) : undefined,
    createdAt: String(item.createdAt ?? item.date_created ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? item.date_updated ?? item.date_created ?? new Date().toISOString()),
    startedAt: item.startedAt
      ? String(item.startedAt)
      : item.date_started ? String(item.date_started) : undefined,
    completedAt: item.completedAt
      ? String(item.completedAt)
      : item.date_completed ? String(item.date_completed) : undefined,
    route: {
      pickupAddress,
      destinationAddress,
      stopAddresses: Array.isArray(item.waypoints)
        ? (item.waypoints as Array<Record<string, unknown>>).map((wp) => String(wp?.address ?? "")).filter(Boolean)
        : undefined,
    },
    durationMinutes: item.durationMinutes ? Number(item.durationMinutes) : undefined,
    driver: toDriverProfile(item.driver),
    priceInfo: {
      estimatedPrice: Number.isFinite(estimatedPrice) ? estimatedPrice : 0,
      finalPrice,
      currency: "VND",
      paymentMethod: toPaymentMethod(item.paymentMethod ?? item.payment_type),
    },
  };
}

export const tripManagementService = {
  getActiveTrip: async (): Promise<ActiveTripResponse> => {
    const response = await apiClient.get<ActiveTripResponse>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/current`);
    const payload = unwrapData<Record<string, unknown>>(response.data);
    const trip = toManagedTrip(payload?.activeTrip ?? payload?.booking ?? payload);
    return { activeTrip: trip };
  },

  getTripHistory: async (): Promise<TripHistoryResponse> => {
    const response = await apiClient.get<TripHistoryResponse>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/history`);
    const payload = unwrapData<Record<string, unknown>>(response.data);
    const list = Array.isArray(payload?.items) ? payload.items : [];
    return { items: list.map((item) => toManagedTrip(item)).filter(Boolean) as ManagedTrip[] };
  },

  getTripDetail: async (bookingId: string): Promise<ManagedTrip | null> => {
    const response = await apiClient.get<ManagedTrip>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}`);
    const payload = unwrapData<Record<string, unknown>>(response.data);
    return toManagedTrip(payload?.booking ?? payload);
  },

  getDriverTracking: async (bookingId: string): Promise<DriverTrackingSnapshot> => {
    const response = await apiClient.get<DriverTrackingSnapshot>(`${APP_CONFIG.customerApiPrefix}/ride/bookings/${bookingId}/tracking`);
    return response.data;
  },
};

export const tripManagementQueryKeys = {
  active: QUERY_KEYS.activeTrip,
  history: QUERY_KEYS.tripHistory,
  detail: (bookingId: string) => [...QUERY_KEYS.tripDetail, bookingId] as const,
  tracking: (bookingId: string) => [...QUERY_KEYS.driverTracking, bookingId] as const,
};
