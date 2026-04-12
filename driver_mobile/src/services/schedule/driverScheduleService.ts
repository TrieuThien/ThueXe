import { apiClient } from '../api/client';
import type {
  CreateUnavailableSlotPayload,
  DriverScheduleResponse,
  DriverScheduleSlot,
  GetDriverSchedulePayload,
  RentalBookingDetail,
  RentalBookingSummary,
  UpdateDriverScheduleSlotPayload
} from '../../types/schedule';

type BackendAvailability = {
  id?: number;
  start_datetime?: string;
  end_datetime?: string;
  status?: string;
  location_lat?: number | null;
  location_long?: number | null;
};

type BackendRentalBooking = {
  id?: number;
  booking_code?: string;
  customer_name?: string;
  customer_phone?: string;
  start_datetime?: string;
  end_datetime?: string;
  status?: string;
  pickup_address?: string;
  dropoff_address?: string;
  total_hours?: number;
  total_price?: number;
  note?: string | null;
};

function mapSlotStatus(s?: string): DriverScheduleSlot['status'] {
  if (s === 'booked') return 'booked';
  if (s === 'unavailable') return 'unavailable';
  return 'available';
}

function mapRentalStatus(s?: string): RentalBookingSummary['status'] {
  if (s === 'in_progress') return 'in_progress';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  return 'assigned';
}

export const driverScheduleService = {
  async getDriverSchedule(payload: GetDriverSchedulePayload): Promise<DriverScheduleResponse> {
    const { date, viewMode } = payload;

    // Tính fromDate/toDate dựa trên viewMode
    const fromDate = date;
    let toDate = date;
    if (viewMode === 'week') {
      const d = new Date(date);
      d.setDate(d.getDate() + 6);
      toDate = d.toISOString().slice(0, 10);
    }

    const [availRes, bookingRes, profileRes] = await Promise.all([
      apiClient.get('/api/driver/rental/availability', {
        params: { fromDate, toDate, limit: 50 }
      }),
      apiClient.get('/api/driver/rental/bookings', {
        params: { fromDate, toDate, limit: 50 }
      }),
      apiClient.get('/api/driver/working-status')
    ]);

    const availData = availRes.data.data as {
      schedules?: BackendAvailability[];
      items?: BackendAvailability[];
    };
    const bookingData = bookingRes.data.data as {
      bookings?: BackendRentalBooking[];
      items?: BackendRentalBooking[];
    };
    const profileData = profileRes.data.data as { available_for_rental?: number };

    const availabilities = availData.schedules ?? availData.items ?? [];
    const bookings = bookingData.bookings ?? bookingData.items ?? [];

    const slots: DriverScheduleSlot[] = availabilities.map((a) => ({
      id: String(a.id ?? ''),
      startAt: a.start_datetime ?? '',
      endAt: a.end_datetime ?? '',
      status: mapSlotStatus(a.status),
      source: 'driver_schedule' as const
    }));

    const assignedBookings: RentalBookingSummary[] = bookings.map((b) => ({
      id: String(b.id ?? ''),
      bookingCode: b.booking_code ?? String(b.id ?? ''),
      customerName: b.customer_name ?? 'Khách hàng',
      startAt: b.start_datetime ?? '',
      endAt: b.end_datetime ?? '',
      status: mapRentalStatus(b.status),
      pickupAddress: b.pickup_address ?? '',
      dropoffAddress: b.dropoff_address ?? ''
    }));

    const summary = {
      available: slots.filter((s) => s.status === 'available').length,
      booked: slots.filter((s) => s.status === 'booked').length + assignedBookings.length,
      unavailable: slots.filter((s) => s.status === 'unavailable').length
    };

    return {
      date,
      viewMode,
      availableForRental: profileData.available_for_rental === 1,
      slots,
      assignedBookings,
      summary
    };
  },

  async createUnavailableSlot(payload: CreateUnavailableSlotPayload): Promise<DriverScheduleResponse> {
    await apiClient.post('/api/driver/rental/availability', {
      start_datetime: payload.startAt,
      end_datetime: payload.endAt,
      status: 'unavailable'
    });
    // Fetch lại schedule sau khi tạo
    const today = new Date().toISOString().slice(0, 10);
    return driverScheduleService.getDriverSchedule({ date: today, viewMode: 'week' });
  },

  async updateScheduleSlot(payload: UpdateDriverScheduleSlotPayload): Promise<DriverScheduleResponse> {
    await apiClient.patch(`/api/driver/rental/availability/${payload.slotId}`, {
      status: payload.status
    });
    const today = new Date().toISOString().slice(0, 10);
    return driverScheduleService.getDriverSchedule({ date: today, viewMode: 'week' });
  },

  async getRentalBookingDetail(bookingId: string): Promise<RentalBookingDetail> {
    const response = await apiClient.get(`/api/driver/rental/bookings/${bookingId}`);
    const data = response.data.data as { booking?: BackendRentalBooking } | BackendRentalBooking;
    const b = (data as { booking?: BackendRentalBooking }).booking ?? (data as BackendRentalBooking);

    return {
      id: String(b.id ?? bookingId),
      bookingCode: b.booking_code ?? bookingId,
      customerName: b.customer_name ?? 'Khách hàng',
      customerPhone: b.customer_phone ?? '',
      startAt: b.start_datetime ?? '',
      endAt: b.end_datetime ?? '',
      status: mapRentalStatus(b.status),
      pickupAddress: b.pickup_address ?? '',
      dropoffAddress: b.dropoff_address ?? '',
      totalHours: b.total_hours ?? 0,
      totalPrice: b.total_price ?? 0,
      note: b.note ?? undefined
    };
  }
};
