import { ApiError } from "../services";

export function getRideFlowErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "MAP_API_ERROR":
        return "Khong ket noi duoc dich vu ban do. Vui long thu lai.";
      case "ETA_UNAVAILABLE":
        return "Khong tinh duoc ETA cho lo trinh nay.";
      case "PRICING_ERROR":
        return "Khong tinh duoc gia cuoc. Vui long doi loai xe hoac thu lai.";
      case "BOOKING_CREATE_ERROR":
        return "Tao booking that bai. Vui long thu lai.";
      case "NETWORK_ERROR":
        return "Mat ket noi mang. Kiem tra internet va thu lai.";
      default:
        return error.message;
    }
  }

  return "Co loi xay ra, vui long thu lai.";
}
