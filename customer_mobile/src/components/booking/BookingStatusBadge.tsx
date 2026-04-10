import { BookingStatus } from "../../types";
import { AppBadge } from "../ui";

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const statusMap: Record<BookingStatus, { text: string; tone: "primary" | "success" | "warning" | "danger" }> = {
  PENDING: { text: "Chờ xác nhận", tone: "warning" },
  SEARCHING_DRIVER: { text: "Đang tìm tài xế", tone: "primary" },
  DRIVER_ASSIGNED: { text: "Đã có tài xế", tone: "primary" },
  ON_GOING: { text: "Đang di chuyển", tone: "primary" },
  COMPLETED: { text: "Hoàn tất", tone: "success" },
  CANCELLED: { text: "Đã hủy", tone: "danger" },
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = statusMap[status];
  return <AppBadge text={config.text} tone={config.tone} />;
}
