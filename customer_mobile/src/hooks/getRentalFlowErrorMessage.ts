import { ApiError } from "../services";

export function getRentalFlowErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Mất kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.";
      case "RENTAL_PRICING_ERROR":
        return "Không thể tính được giá gói thuê.";
      case "RENTAL_BOOKING_ERROR":
        return "Không thể tạo được yêu cầu thuê. Vui lòng thử lại sau.";
      default:
        return error.message;
    }
  }
  return "Có lỗi xảy ra. Vui lòng thử lại.";
}
