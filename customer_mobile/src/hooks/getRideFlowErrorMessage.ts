import { ApiError } from "../services";

export function getRideFlowErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "MAP_API_ERROR":
        return "Không thể tải bản đồ. Vui lòng kiểm tra kết nối mạng và thử lại.";
      case "ETA_UNAVAILABLE":
        return "Không thể tính được ETA cho lộ trình này.";
      case "PRICING_ERROR":
        return "Không thể tính được giá cước. Vui lòng đợi loại xe hoặc thử lại.";
      case "BOOKING_CREATE_ERROR":
        return "Tạo booking thất bại. Vui lòng thử lại.";
      case "NETWORK_ERROR":
        return "Mất kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.";
      default:
        return error.message;
    }
  }

  return "Có lỗi xảy ra. Vui lòng thử lại.";
}
