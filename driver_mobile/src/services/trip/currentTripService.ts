import { apiClient } from '../api/client';
import type { ActiveTrip, TripLocationPayload, TripMutationPayload, TripSummary } from '../../types/trip';

// Backend booking → ActiveTrip mapper
type BackendBooking = {
  id?: number;
  booking_code?: string;
  status?: number;
  pickup_address?: string;
  dropoff_address?: string;
  estimated_cost?: number;
  actual_cost?: number;
  distance_km?: number;
  duration_min?: number;
  cancel_comment?: string;
  driver_id?: number;
  customer?: { firstname?: string; lastname?: string; phone?: string } | null;
  customer_name?: string;
  customer_phone?: string;
  payment_status?: string;
  expires_at?: string | null;
};

const BOOKING_STATUS_MAP: Record<number, ActiveTrip['status']> = {
  0: 'incoming',
  1: 'in_progress',
  2: 'cancelled',
  3: 'completed',
  4: 'cancelled',
  5: 'cancelled',
  6: 'arrived_pickup'
};

function mapBookingToActiveTrip(b: BackendBooking): ActiveTrip {
  const customerName =
    b.customer_name ??
    [b.customer?.firstname, b.customer?.lastname].filter(Boolean).join(' ') ??
    'Khách hàng';

  return {
    tripId: String(b.id ?? ''),
    customerName,
    customerPhone: b.customer_phone ?? b.customer?.phone ?? '',
    pickupAddress: b.pickup_address ?? '',
    dropoffAddress: b.dropoff_address ?? '',
    estimatedDistanceKm: b.distance_km ?? 0,
    estimatedDurationMin: b.duration_min ?? 0,
    estimatedFare: b.estimated_cost ?? 0,
    actualFare: b.actual_cost ?? undefined,
    status: BOOKING_STATUS_MAP[b.status ?? 0] ?? 'incoming',
    paymentStatus: 'pending',
    expiresAt: b.expires_at ?? undefined,
    cancelReason: b.cancel_comment ?? undefined
  };
}

function mapBookingToTripSummary(b: BackendBooking): TripSummary {
  const customerName =
    b.customer_name ??
    [b.customer?.firstname, b.customer?.lastname].filter(Boolean).join(' ') ??
    'Khách hàng';

  return {
    tripId: String(b.id ?? ''),
    customerName,
    pickupAddress: b.pickup_address ?? '',
    dropoffAddress: b.dropoff_address ?? '',
    totalDistanceKm: b.distance_km ?? 0,
    totalDurationMin: b.duration_min ?? 0,
    estimatedFare: b.estimated_cost ?? 0,
    actualFare: b.actual_cost ?? b.estimated_cost ?? 0,
    paymentStatus: 'pending',
    completedAt: new Date().toISOString()
  };
}

export const currentTripService = {
  async getCurrentTripDetail(): Promise<ActiveTrip | null> {
    const response = await apiClient.get('/api/driver/trips/current');
    const data = response.data.data as { booking?: BackendBooking | null };
    if (!data?.booking) return null;
    return mapBookingToActiveTrip(data.booking);
  },

  async acceptTrip(payload: TripMutationPayload): Promise<ActiveTrip> {
    const response = await apiClient.post(`/api/driver/trips/${payload.tripId}/accept`);
    const data = response.data.data as { booking?: BackendBooking } | BackendBooking;
    const booking = (data as { booking?: BackendBooking }).booking ?? (data as BackendBooking);
    return mapBookingToActiveTrip(booking);
  },

  async rejectTrip(payload: TripMutationPayload): Promise<{ success: boolean }> {
    await apiClient.post(`/api/driver/trips/${payload.tripId}/reject`);
    return { success: true };
  },

  async arrivedPickup(payload: TripMutationPayload): Promise<ActiveTrip> {
    const response = await apiClient.post(`/api/driver/trips/${payload.tripId}/arrived`);
    const data = response.data.data as { booking?: BackendBooking } | BackendBooking;
    const booking = (data as { booking?: BackendBooking }).booking ?? (data as BackendBooking);
    return mapBookingToActiveTrip(booking);
  },

  async startTrip(payload: TripMutationPayload): Promise<ActiveTrip> {
    const response = await apiClient.post(`/api/driver/trips/${payload.tripId}/start`);
    const data = response.data.data as { booking?: BackendBooking } | BackendBooking;
    const booking = (data as { booking?: BackendBooking }).booking ?? (data as BackendBooking);
    return mapBookingToActiveTrip(booking);
  },

  async updateTripLocation(payload: TripLocationPayload): Promise<ActiveTrip> {
    // Cập nhật vị trí riêng, sau đó fetch lại trip
    await apiClient.post('/api/driver/location', {
      lat: payload.lat,
      long: payload.lng
    });
    const response = await apiClient.get('/api/driver/trips/current');
    const data = response.data.data as { booking?: BackendBooking | null };
    if (!data?.booking) {
      throw new Error('Không có chuyến đang hoạt động');
    }
    return mapBookingToActiveTrip(data.booking);
  },

  async finishTrip(payload: TripMutationPayload): Promise<TripSummary> {
    const response = await apiClient.post(`/api/driver/trips/${payload.tripId}/complete`);
    const data = response.data.data as { booking?: BackendBooking } | BackendBooking;
    const booking = (data as { booking?: BackendBooking }).booking ?? (data as BackendBooking);
    return mapBookingToTripSummary(booking);
  },

  async getTripSummary(tripId: string): Promise<TripSummary> {
    const response = await apiClient.get(`/api/driver/trips/history/${tripId}`);
    const data = response.data.data as { booking?: BackendBooking; trip?: BackendBooking } | BackendBooking;
    const booking =
      (data as { booking?: BackendBooking }).booking ??
      (data as { trip?: BackendBooking }).trip ??
      (data as BackendBooking);
    return mapBookingToTripSummary(booking);
  }
};
