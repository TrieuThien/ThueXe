import { ApiError } from "../services/api/errors";

type ValidationFieldDetail = {
  path?: string;
  message?: string;
};

function normalizeValidationMessage(raw: string): string {
  return raw.replace(/^"([^"]+)"\s*/, "").trim();
}

function getFieldLabel(path?: string): string {
  switch ((path ?? "").trim()) {
    case "firstname":
      return "Ten";
    case "lastname":
      return "Ho";
    case "email":
      return "Email";
    case "phone":
      return "So dien thoai";
    case "password":
      return "Mat khau";
    default:
      return "";
  }
}

function getValidationFieldMessage(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) {
    return null;
  }

  const first = details[0] as ValidationFieldDetail;
  if (!first || typeof first !== "object") {
    return null;
  }

  const rawMessage = typeof first.message === "string" ? first.message.trim() : "";
  if (!rawMessage) {
    return null;
  }

  const message = normalizeValidationMessage(rawMessage);
  const label = getFieldLabel(first.path);

  return label ? `${label}: ${message}` : message;
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fieldMessage = getValidationFieldMessage(error.details);
    if (fieldMessage) {
      return fieldMessage;
    }

    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "Email/số điện thoại hoặc mật khẩu không đúng.";
      case "ACCOUNT_ALREADY_EXISTS":
      case "EMAIL_ALREADY_USED":
      case "PHONE_ALREADY_USED":
        return "Email hoặc số điện thoại này đã được đăng ký.";
      case "OTP_INVALID":
      case "INVALID_OTP":
        return "Mã OTP không chính xác.";
      case "OTP_EXPIRED":
      case "INVALID_RESET_CODE":
        return "Mã OTP đã hết hạn, vui lòng gửi lại.";
      case "IDENTIFIER_NOT_FOUND":
        return "Không tìm thấy tài khoản với thông tin đã nhập.";
      case "RESET_TOKEN_INVALID":
      case "INVALID_RESET_TOKEN":
        return "Yêu cầu đặt lại mật khẩu đã hết hạn, vui lòng thử lại.";
      case "ACCOUNT_INACTIVE":
        return "Tài khoản đang bị vô hiệu hóa.";
      case "NETWORK_ERROR":
        return "Không kết nối được đến máy chủ. Vui lòng kiểm tra mạng.";
      case "RATE_LIMITED":
        return "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.";
      default:
        if (error.status === 401) {
          return "Phiên đăng nhập không hợp lệ. Vui lòng thử lại.";
        }

        if (error.status >= 500) {
          return "Hệ thống đang bảo trì, vui lòng thử lại sau.";
        }

        return error.message || "Có lỗi xảy ra vui lòng thử lại sau.";
    }
  }

  return "Có lỗi không xác định. Vui lòng thử lại.";
}
