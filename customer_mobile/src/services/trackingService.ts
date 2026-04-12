import { DriverLocation } from "../types";
import { realtimeApi } from "./api/modules";

export const trackingService = {
  getDriverLocation: async (bookingId: string): Promise<DriverLocation> => {
    const response = await realtimeApi.getDriverLocationFallback(bookingId);
    const payload = response.data as any;
    const data = payload?.driverLocation ?? payload;

    return {
      driverId: String(data?.driverId ?? data?.driver_id ?? ""),
      heading: Number(data?.heading ?? 0),
      speedKmh: Number(data?.speedKmh ?? data?.speed_kmh ?? 0),
      lastUpdatedAt: String(data?.lastUpdatedAt ?? data?.last_updated_at ?? new Date().toISOString()),
      location: {
        lat: Number(data?.location?.lat ?? data?.lat ?? 0),
        lng: Number(data?.location?.lng ?? data?.lng ?? 0),
      },
    };
  },
};
