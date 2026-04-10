export interface ApiErrorPayload {
  code: string;
  message: string;
  status: number;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.status = payload.status;
  }
}
