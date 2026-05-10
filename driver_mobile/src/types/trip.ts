export type TripFlowStatus =
  | 'incoming'
  | 'accepted'
  | 'arrived_pickup'
  | 'in_progress'
  | 'completed'
  | 'timeout'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid_cash' | 'paid_wallet';

export type ActiveTrip = {
  tripId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedFare: number;
  actualFare?: number;
  status: TripFlowStatus;
  paymentStatus: PaymentStatus;
  expiresAt?: string;
  cancelReason?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
};

export type TripSummary = {
  tripId: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedFare: number;
  actualFare: number;
  paymentStatus: PaymentStatus;
  completedAt: string;
};

export type TripMutationPayload = {
  tripId: string;
};

export type TripLocationPayload = {
  tripId: string;
  lat: number;
  lng: number;
};
