import { ApiError } from "../services";

export function getRentalFlowErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Mat ket noi mang. Vui long thu lai.";
      case "RENTAL_PRICING_ERROR":
        return "Khong tinh duoc gia goi thue.";
      case "RENTAL_BOOKING_ERROR":
        return "Khong tao duoc yeu cau thue. Thu lai sau.";
      default:
        return error.message;
    }
  }
  return "Co loi xay ra. Vui long thu lai.";
}
