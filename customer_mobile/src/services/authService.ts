import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RequestOtpResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "../types";
import { ApiError } from "./api/errors";
import { authApiClient } from "./api/authApiClient";
import { mockDelay } from "./mock/mockDelay";

const USE_MOCK_AUTH = true;

const mockNow = new Date().toISOString();
const mockUser: User = {
  id: "user_auth_1",
  fullName: "Nguyen Thi B",
  firstName: "Nguyen",
  lastName: "Thi B",
  phoneNumber: "0912345678",
  email: "demo@thuexe.vn",
  address: "1 Phan Van Hon, TP.HCM",
  gender: "female",
  country: "Vietnam",
  isPhoneVerified: true,
  isEmailVerified: true,
  accountStatus: "ACTIVE",
  rewardPoints: 420,
  rewardPointsRedeemed: 50,
  avatarUrl: "https://res.cloudinary.com/dsja40n6v/image/upload/v1773641739/thuexe/customers/mvzjqr2pj9gzg84fscsv.png",
  createdAt: mockNow,
  updatedAt: mockNow,
};

function detectIdentifierType(identifier: string): "EMAIL" | "PHONE" {
  return identifier.includes("@") ? "EMAIL" : "PHONE";
}

function buildError(code: ApiError["code"], message: string, status: number): never {
  throw new ApiError({ code, message, status });
}

async function mockLogin(payload: LoginRequest): Promise<LoginResponse> {
  await mockDelay();

  if (payload.identifier === "500@error.com") {
    buildError("SERVER_ERROR", "Máy chủ tạm thời gián đoạn", 500);
  }

  if (payload.password !== "Pass1234") {
    buildError("INVALID_CREDENTIALS", "Thông tin đăng nhập không chính xác", 401);
  }

  return {
    accessToken: "mock_access_token",
    refreshToken: "mock_refresh_token",
    expiresInSec: 3600,
    user: {
      ...mockUser,
      email: payload.identifier.includes("@") ? payload.identifier : mockUser.email,
      phoneNumber: payload.identifier.includes("@") ? mockUser.phoneNumber : payload.identifier,
    },
    sessionId: "session_1",
  };
}

async function mockRegister(payload: RegisterRequest): Promise<RegisterResponse> {
  await mockDelay();

  if (payload.email === "exists@thuexe.vn" || payload.phoneNumber === "0900000000") {
    buildError("ACCOUNT_ALREADY_EXISTS", "Email hoặc số điện thoại đã tồn tại", 409);
  }

  const identifier = payload.email ?? payload.phoneNumber ?? "";

  return {
    userId: "new_user_1",
    verificationId: "verify_register_123",
    otpExpiredInSec: 120,
    identifier,
    identifierType: detectIdentifierType(identifier),
    requiresVerification: true,
  };
}

async function mockVerifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  await mockDelay(350);

  if (payload.otpCode === "000000") {
    buildError("OTP_INVALID", "Mã OTP không đúng", 400);
  }

  if (payload.otpCode === "999999") {
    buildError("OTP_EXPIRED", "Mã OTP đã hết hạn", 410);
  }

  if (payload.purpose === "PASSWORD_RESET") {
    return {
      verified: true,
      purpose: payload.purpose,
      resetToken: "reset_token_valid_123",
    };
  }

  return {
    verified: true,
    purpose: payload.purpose,
  };
}

async function mockResendOtp(verificationId: string): Promise<RequestOtpResponse> {
  await mockDelay(250);

  if (verificationId === "verify_error_500") {
    buildError("SERVER_ERROR", "Không gửi lại OTP được", 500);
  }

  return {
    verificationId,
    identifier: "demo@thuexe.vn",
    identifierType: "EMAIL",
    otpExpiredInSec: 120,
    purpose: "ACCOUNT_ACTIVATION",
  };
}

async function mockForgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  await mockDelay();

  if (payload.identifier === "unknown@thuexe.vn" || payload.identifier === "0999999999") {
    buildError("IDENTIFIER_NOT_FOUND", "Không tìm thấy tài khoản", 404);
  }

  return {
    verificationId: "verify_reset_123",
    otpExpiredInSec: 120,
    identifier: payload.identifier,
    identifierType: detectIdentifierType(payload.identifier),
  };
}

async function mockResetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  await mockDelay();

  if (payload.resetToken.includes("expired")) {
    buildError("RESET_TOKEN_INVALID", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn", 400);
  }

  return { success: true };
}

export const authService = {
  // users + user_sessions login response shape
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    if (USE_MOCK_AUTH) {
      return mockLogin(payload);
    }

    return authApiClient.login(payload);
  },

  // users create + user_account_codes response shape
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    if (USE_MOCK_AUTH) {
      return mockRegister(payload);
    }

    return authApiClient.register(payload);
  },

  verifyOtp: async (payload: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    if (USE_MOCK_AUTH) {
      return mockVerifyOtp(payload);
    }

    return authApiClient.verifyOtp(payload);
  },

  resendOtp: async (verificationId: string): Promise<RequestOtpResponse> => {
    if (USE_MOCK_AUTH) {
      return mockResendOtp(verificationId);
    }

    return authApiClient.resendOtp(verificationId);
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    if (USE_MOCK_AUTH) {
      return mockForgotPassword(payload);
    }

    return authApiClient.forgotPassword(payload);
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    if (USE_MOCK_AUTH) {
      return mockResetPassword(payload);
    }

    return authApiClient.resetPassword(payload);
  },

  getMe: async (): Promise<User> => {
    if (USE_MOCK_AUTH) {
      await mockDelay(200);
      return mockUser;
    }

    return authApiClient.getMe();
  },
};
