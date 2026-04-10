import { DriverLocation } from "../types";
import { mockDelay } from "./mock/mockDelay";

export const trackingService = {
  getDriverLocation: async (driverId: string): Promise<DriverLocation> => {
    await mockDelay(250);
    return {
      driverId,
      heading: 180,
      speedKmh: 28,
      lastUpdatedAt: new Date().toISOString(),
      location: {
        lat: 10.782,
        lng: 106.699,
      },
    };
  },
};
