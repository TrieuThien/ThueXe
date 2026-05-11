export interface AppErrorPayload {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(payload: AppErrorPayload) {
    super(payload.message);
    this.name = "AppError";
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
  }
}

export class ApiError extends AppError {}

export function getFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof AppError)) {
    return "Có lỗi xảy ra. Vui lòng thử lại.";
  }

  switch (error.status) {
    case 400:
    case 422:
      return "Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.";
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 429:
      return "Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau.";
    case 409:
      return "Dữ liệu đang xung đột. Vui lòng tải lại và thử lại.";
    default:
      if (error.status >= 500) {
        return "Hệ thống tạm thời gián đoạn. Vui lòng thử lại sau.";
      }
      return error.message;
  }
}
