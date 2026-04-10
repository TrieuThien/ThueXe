import { ApiError } from "../services/api/errors";

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "Email/so dien thoai hoac mat khau khong dung.";
      case "ACCOUNT_ALREADY_EXISTS":
        return "Email hoac so dien thoai nay da duoc dang ky.";
      case "OTP_INVALID":
        return "Ma OTP khong chinh xac.";
      case "OTP_EXPIRED":
        return "Ma OTP da het han, vui long gui lai.";
      case "IDENTIFIER_NOT_FOUND":
        return "Khong tim thay tai khoan voi thong tin da nhap.";
      case "RESET_TOKEN_INVALID":
        return "Yeu cau dat lai mat khau da het han, vui long thu lai.";
      default:
        return "He thong dang ban, vui long thu lai sau.";
    }
  }

  return "Co loi khong xac dinh. Vui long thu lai.";
}
