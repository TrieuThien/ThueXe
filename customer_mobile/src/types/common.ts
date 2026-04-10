export type AppDateTime = string;

export type ID = string;

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export type BookingStatus =
  | "PENDING"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "ON_GOING"
  | "COMPLETED"
  | "CANCELLED";
