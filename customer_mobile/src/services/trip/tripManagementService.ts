import { QUERY_KEYS, TRIP_STATUS_STEPS } from "../../constants";
import {
  ActiveTripResponse,
  DriverTrackingSnapshot,
  ManagedTrip,
  TripHistoryResponse,
  TripStatus,
} from "../../types";
import { apiClient } from "../api/client";
import { mockDelay } from "../mock/mockDelay";
import { mockManagedTrips } from "../mock/tripManagementData";
import { tripRuntimeState } from "../mock/tripRuntimeState";

const USE_MOCK_TRIP = true;

function getCurrentActiveStatus(): TripStatus {
  if (tripRuntimeState.forcedActiveStatus) {
    return tripRuntimeState.forcedActiveStatus;
  }
  return TRIP_STATUS_STEPS[Math.min(tripRuntimeState.activeStepIndex, TRIP_STATUS_STEPS.length - 1)];
}

function buildActiveTrip(base: ManagedTrip): ManagedTrip {
  const status = getCurrentActiveStatus();
  return {
    ...base,
    status,
    etaMinutes: status === "ARRIVED" ? 0 : Math.max(1, 8 - tripRuntimeState.activeStepIndex),
    updatedAt: new Date().toISOString(),
  };
}

export const tripManagementService = {
  getActiveTrip: async (): Promise<ActiveTripResponse> => {
    if (USE_MOCK_TRIP) {
      await mockDelay(450);
      const activeBase = mockManagedTrips[0];
      const activeTrip = buildActiveTrip(activeBase);
      if (!tripRuntimeState.forcedActiveStatus) {
        tripRuntimeState.activeStepIndex = Math.min(tripRuntimeState.activeStepIndex + 1, TRIP_STATUS_STEPS.length - 1);
      }
      return { activeTrip };
    }

    const response = await apiClient.get<ActiveTripResponse>("/trips/active");
    return response.data;
  },

  getTripHistory: async (): Promise<TripHistoryResponse> => {
    if (USE_MOCK_TRIP) {
      await mockDelay(400);
      return { items: mockManagedTrips.slice(1) };
    }

    const response = await apiClient.get<TripHistoryResponse>("/trips/history");
    return response.data;
  },

  getTripDetail: async (bookingId: string): Promise<ManagedTrip | null> => {
    if (USE_MOCK_TRIP) {
      await mockDelay(300);
      const active = buildActiveTrip(mockManagedTrips[0]);
      const inHistory = mockManagedTrips.find((item) => item.bookingId === bookingId);
      if (active.bookingId === bookingId) {
        return active;
      }
      return inHistory ?? null;
    }

    const response = await apiClient.get<ManagedTrip>(`/trips/${bookingId}`);
    return response.data;
  },

  getDriverTracking: async (bookingId: string): Promise<DriverTrackingSnapshot> => {
    if (USE_MOCK_TRIP) {
      await mockDelay(250);
      tripRuntimeState.trackingTick += 1;
      const baseLat = 10.775 + tripRuntimeState.trackingTick * 0.0006;
      const baseLng = 106.695 + tripRuntimeState.trackingTick * 0.0007;
      return {
        bookingId,
        status: getCurrentActiveStatus(),
        etaMinutes: Math.max(0, 8 - tripRuntimeState.trackingTick),
        driverLocation: {
          driverId: "driver_active_1",
          heading: 170,
          speedKmh: 24,
          lastUpdatedAt: new Date().toISOString(),
          location: {
            lat: baseLat,
            lng: baseLng,
          },
        },
      };
    }

    const response = await apiClient.get<DriverTrackingSnapshot>(`/driver_current_locations?bookingId=${bookingId}`);
    return response.data;
  },
};

export const tripManagementQueryKeys = {
  active: QUERY_KEYS.activeTrip,
  history: QUERY_KEYS.tripHistory,
  detail: (bookingId: string) => [...QUERY_KEYS.tripDetail, bookingId] as const,
  tracking: (bookingId: string) => [...QUERY_KEYS.driverTracking, bookingId] as const,
};
