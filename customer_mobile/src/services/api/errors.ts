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
    return "Co loi xay ra. Vui long thu lai.";
  }

  switch (error.status) {
    case 400:
    case 422:
      return "Thong tin nhap chua hop le. Vui long kiem tra va thu lai.";
    case 401:
      return "Phien dang nhap da het han. Vui long dang nhap lai.";
    case 403:
      return "Ban khong co quyen thuc hien thao tac nay.";
    case 404:
      return "Khong tim thay du lieu yeu cau.";
    case 409:
      return "Du lieu dang xung dot. Vui long tai lai va thu lai.";
    default:
      if (error.status >= 500) {
        return "He thong tam thoi gian doan. Vui long thu lai sau.";
      }
      return error.message;
  }
}
