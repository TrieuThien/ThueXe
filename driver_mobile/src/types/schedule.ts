export type ScheduleViewMode = 'day' | 'week';

export type DriverScheduleSlotStatus = 'available' | 'booked' | 'unavailable';

export type DriverScheduleSlotSource = 'driver_schedule' | 'rental_bookings';

export type DriverScheduleSlot = {
  id: string;
  startAt: string;
  endAt: string;
  status: DriverScheduleSlotStatus;
  source: DriverScheduleSlotSource;
  bookingId?: string;
  note?: string;
};

export type RentalBookingStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type RentalBookingSummary = {
  id: string;
  bookingCode: string;
  customerName: string;
  startAt: string;
  endAt: string;
  status: RentalBookingStatus;
  pickupAddress: string;
  dropoffAddress: string;
};

export type RentalBookingDetail = RentalBookingSummary & {
  customerPhone: string;
  totalHours: number;
  totalPrice: number;
  note?: string;
};

export type DriverScheduleResponse = {
  date: string;
  viewMode: ScheduleViewMode;
  availableForRental: boolean;
  slots: DriverScheduleSlot[];
  assignedBookings: RentalBookingSummary[];
  summary: {
    available: number;
    booked: number;
    unavailable: number;
  };
};

export type GetDriverSchedulePayload = {
  date: string;
  viewMode: ScheduleViewMode;
};

export type CreateUnavailableSlotPayload = {
  startAt: string;
  endAt: string;
  note?: string;
};

export type UpdateDriverScheduleSlotPayload = {
  slotId: string;
  status: Extract<DriverScheduleSlotStatus, 'available' | 'unavailable'>;
  note?: string;
};
