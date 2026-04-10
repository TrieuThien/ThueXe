import { apiClient } from '../api/client';
import type { ActiveTrip, TripLocationPayload, TripMutationPayload, TripSummary } from '../../types/trip';

export const currentTripService = {
  async getCurrentTripDetail(): Promise<ActiveTrip | null> {
    const response = await apiClient.get('/driver/trips/current');
    return response.data.data;
  },

  async acceptTrip(payload: TripMutationPayload): Promise<ActiveTrip> {
    const response = await apiClient.post('/driver/trips/accept', payload);
    return response.data.data;
  },

  async rejectTrip(payload: TripMutationPayload): Promise<{ success: boolean }> {
    const response = await apiClient.post('/driver/trips/reject', payload);
    return response.data.data;
  },

  async arrivedPickup(payload: TripMutationPayload): Promise<ActiveTrip> {
    const response = await apiClient.post('/driver/trips/arrived', payload);
    return response.data.data;
  },

  async startTrip(payload: TripMutationPayload): Promise<ActiveTrip> {
    const response = await apiClient.post('/driver/trips/start', payload);
    return response.data.data;
  },

  async updateTripLocation(payload: TripLocationPayload): Promise<ActiveTrip> {
    const response = await apiClient.patch('/driver/trips/location', payload);
    return response.data.data;
  },

  async finishTrip(payload: TripMutationPayload): Promise<TripSummary> {
    const response = await apiClient.post('/driver/trips/finish', payload);
    return response.data.data;
  },

  async getTripSummary(tripId: string): Promise<TripSummary> {
    const response = await apiClient.get('/driver/trips/summary', {
      params: { tripId }
    });
    return response.data.data;
  }
};
