export type TripHistoryStatus = 'hoan_thanh' | 'da_huy' | 'da_tu_choi';

export type TripHistoryListItem = {
  tripId: string;
  tripCode: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupTime: string;
  completedTime?: string;
  fare: number;
  netIncome: number;
  status: TripHistoryStatus;
};

export type TripHistoryTimelineItem = {
  status: string;
  at: string;
  note?: string;
};

export type TripHistoryDetail = {
  tripId: string;
  tripCode: string;
  status: TripHistoryStatus;
  pickupTime: string;
  startTime: string;
  completedTime?: string;
  distanceKm: number;
  fare: number;
  systemCommission: number;
  netIncome: number;
  paymentMethod: 'tien_mat' | 'vi_dien_tu';
  customer: {
    name: string;
    phone: string;
  };
  pickupAddress: string;
  dropoffAddress: string;
  timeline: TripHistoryTimelineItem[];
};

export type TripHistoryFilters = {
  search?: string;
  status?: TripHistoryStatus | 'tat_ca';
  fromDate?: string;
  toDate?: string;
};

export type PaginatedTripHistoryResponse = {
  items: TripHistoryListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};
