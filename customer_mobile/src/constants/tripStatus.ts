import { TripStatus } from "../types";

export const TRIP_STATUS_STEPS: TripStatus[] = [
  "PENDING",
  "DRIVER_ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  PENDING: "Đang tìm tài xế",
  DRIVER_ACCEPTED: "Tài xế đã nhận",
  ARRIVED: "Tài xế đã đến",
  IN_PROGRESS: "Đang di chuyển",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

export const TRIP_STATUS_TONES: Record<TripStatus, "primary" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  DRIVER_ACCEPTED: "primary",
  ARRIVED: "primary",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  CANCELLED: "danger",
};
