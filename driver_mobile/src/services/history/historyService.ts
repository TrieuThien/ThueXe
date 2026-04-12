import { apiClient } from '../api/client';
import type { PaginatedTripHistoryResponse, TripHistoryDetail, TripHistoryFilters, TripHistoryListItem, TripHistoryStatus } from '../../types/history';

// Backend booking status → frontend TripHistoryStatus
function mapStatus(status?: number): TripHistoryStatus {
  if (status === 3) return 'hoan_thanh';
  if (status === 4 || status === 2 || status === 5) return 'da_huy';
  return 'da_huy';
}

// Frontend status filter → backend status integer
function statusToBackend(status?: TripHistoryStatus | 'tat_ca'): number | undefined {
  if (!status || status === 'tat_ca') return undefined;
  if (status === 'hoan_thanh') return 3;
  if (status === 'da_huy' || status === 'da_tu_choi') return 4;
  return undefined;
}

type BackendHistoryItem = {
  id?: number;
  booking_code?: string;
  pickup_address?: string;
  dropoff_address?: string;
  pickup_time?: string | null;
  start_time?: string | null;
  completed_time?: string | null;
  estimated_cost?: number;
  actual_cost?: number;
  driver_commission?: number;
  distance_km?: number;
  status?: number;
  customer?: { firstname?: string; lastname?: string; phone?: string } | null;
  customer_name?: string;
  customer_phone?: string;
  payment_method?: string;
};

function mapHistoryItem(b: BackendHistoryItem): TripHistoryListItem {
  const fare = b.actual_cost ?? b.estimated_cost ?? 0;
  const commission = b.driver_commission ?? 0;
  const netIncome = commission > 0 && commission <= 100
    ? Math.round(fare * commission / 100)
    : fare;

  const customerName =
    b.customer_name ??
    [b.customer?.firstname, b.customer?.lastname].filter(Boolean).join(' ') ??
    'Khách hàng';

  return {
    tripId: String(b.id ?? ''),
    tripCode: b.booking_code ?? String(b.id ?? ''),
    customerName,
    pickupAddress: b.pickup_address ?? '',
    dropoffAddress: b.dropoff_address ?? '',
    pickupTime: b.pickup_time ?? b.start_time ?? new Date().toISOString(),
    completedTime: b.completed_time ?? undefined,
    fare,
    netIncome,
    status: mapStatus(b.status)
  };
}

function mapHistoryDetail(b: BackendHistoryItem): TripHistoryDetail {
  const fare = b.actual_cost ?? b.estimated_cost ?? 0;
  const commission = b.driver_commission ?? 0;
  const netIncome = commission > 0 && commission <= 100
    ? Math.round(fare * commission / 100)
    : fare;

  const customerName =
    b.customer_name ??
    [b.customer?.firstname, b.customer?.lastname].filter(Boolean).join(' ') ??
    'Khách hàng';

  return {
    tripId: String(b.id ?? ''),
    tripCode: b.booking_code ?? String(b.id ?? ''),
    status: mapStatus(b.status),
    pickupTime: b.pickup_time ?? new Date().toISOString(),
    startTime: b.start_time ?? b.pickup_time ?? new Date().toISOString(),
    completedTime: b.completed_time ?? undefined,
    distanceKm: b.distance_km ?? 0,
    fare,
    systemCommission: commission,
    netIncome,
    paymentMethod: b.payment_method === 'wallet' ? 'vi_dien_tu' : 'tien_mat',
    customer: {
      name: customerName,
      phone: b.customer?.phone ?? b.customer_phone ?? ''
    },
    pickupAddress: b.pickup_address ?? '',
    dropoffAddress: b.dropoff_address ?? '',
    timeline: []
  };
}

export const historyService = {
  async getHistoryList(
    params: TripHistoryFilters & { page: number; pageSize: number }
  ): Promise<PaginatedTripHistoryResponse> {
    const backendStatus = statusToBackend(params.status);

    const response = await apiClient.get('/api/driver/trips/history', {
      params: {
        page: params.page,
        limit: params.pageSize,
        status: backendStatus,
        fromDate: params.fromDate,
        toDate: params.toDate,
        keyword: params.search
      }
    });

    const data = response.data.data as {
      items?: BackendHistoryItem[];
      trips?: BackendHistoryItem[];
      pagination?: { page?: number; limit?: number; total_items?: number; total_pages?: number };
    };

    const rawItems = data.items ?? data.trips ?? [];
    const pagination = data.pagination ?? {};
    const total = pagination.total_items ?? rawItems.length;
    const pageSize = pagination.limit ?? params.pageSize;
    const currentPage = pagination.page ?? params.page;
    const totalPages = pagination.total_pages ?? Math.ceil(total / pageSize);

    return {
      items: rawItems.map(mapHistoryItem),
      page: currentPage,
      pageSize,
      total,
      hasNextPage: currentPage < totalPages
    };
  },

  async getHistoryDetail(tripId: string): Promise<TripHistoryDetail> {
    const response = await apiClient.get(`/api/driver/trips/history/${tripId}`);
    const data = response.data.data as { booking?: BackendHistoryItem; trip?: BackendHistoryItem } | BackendHistoryItem;
    const booking =
      (data as { booking?: BackendHistoryItem }).booking ??
      (data as { trip?: BackendHistoryItem }).trip ??
      (data as BackendHistoryItem);
    return mapHistoryDetail(booking);
  }
};
