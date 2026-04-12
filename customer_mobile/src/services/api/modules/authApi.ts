import { APP_CONFIG } from "../../../constants";
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "../../../types";
import { apiClient } from "../apiClient";

type CustomerUserPayload = {
  id: number | string;
  firstname?: string;
  lastname?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  isActivated?: number;
  accountActive?: number;
};

function mapUser(payload: CustomerUserPayload): User {
  const firstName = payload.firstname ?? "";
  const lastName = payload.lastname ?? "";

  return {
    id: String(payload.id),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    phoneNumber: payload.phone ?? "",
    email: payload.email ?? undefined,
    address: payload.address ?? undefined,
    country: payload.country ?? undefined,
    isPhoneVerified: true,
    isEmailVerified: Boolean(payload.email),
    accountStatus: payload.accountActive === 0 ? "SUSPENDED" : payload.isActivated === 1 ? "ACTIVE" : "PENDING_VERIFICATION",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const authApi = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<{
      user: CustomerUserPayload;
      accessToken: string;
      refreshToken?: string;
    }>(`${APP_CONFIG.customerApiPrefix}/auth/register`, {
      firstname: payload.firstName.trim(),
      lastname: payload.lastName.trim(),
      email: payload.email,
      phone: payload.phoneNumber,
      password: payload.password,
    });

    return {
      userId: String(response.data.user.id),
      verificationId: String(response.data.user.id),
      otpExpiredInSec: 120,
      identifier: payload.email ?? payload.phoneNumber ?? "",
      identifierType: payload.email ? "EMAIL" : "PHONE",
      requiresVerification: true,
    };
  },

  verifyOtp: async (payload: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post<{ verified: boolean }>(`${APP_CONFIG.customerApiPrefix}/auth/verify-otp`, {
      userId: Number(payload.verificationId),
      code: payload.otpCode,
      context: payload.purpose === "ACCOUNT_ACTIVATION" ? "ACTIVATION" : "RESET_PASSWORD",
    });

    return {
      verified: response.data.verified,
      purpose: payload.purpose,
      resetToken: undefined,
    };
  },

  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken?: string;
      tokenType?: string;
      user: CustomerUserPayload;
    }>(`${APP_CONFIG.customerApiPrefix}/auth/login`, payload);
    
    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken ?? "",
      expiresInSec: 3600,
      user: mapUser(response.data.user),
      sessionId: `session_${response.data.user.id}`,
    };
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    await apiClient.post(`${APP_CONFIG.customerApiPrefix}/auth/forgot-password`, payload);
    return {
      verificationId: "",
      otpExpiredInSec: 120,
      identifier: payload.identifier,
      identifierType: payload.identifier.includes("@") ? "EMAIL" : "PHONE",
    };
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const body =
      payload.resetToken && payload.resetToken.includes(".")
        ? { token: payload.resetToken, newPassword: payload.newPassword }
        : {
            userId: Number(payload.resetToken.split(":")[0] || 0),
            resetCode: payload.resetToken.split(":")[1] ?? payload.resetToken,
            newPassword: payload.newPassword,
          };

    await apiClient.post(`${APP_CONFIG.customerApiPrefix}/auth/reset-password`, body);
    return { success: true };
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken?: string;
      user: CustomerUserPayload;
    }>(`${APP_CONFIG.customerApiPrefix}/auth/refresh-token`, { refreshToken });

    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken ?? refreshToken,
      user: mapUser(response.data.user),
    };
  },

  logout: async (refreshToken?: string) => {
    return apiClient.post(`${APP_CONFIG.customerApiPrefix}/auth/logout`, { refreshToken });
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<{ user: CustomerUserPayload }>(`${APP_CONFIG.customerApiPrefix}/auth/me`);
    return mapUser(response.data.user);
  },

  updateMe: async (payload: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<{ user: CustomerUserPayload }>(`${APP_CONFIG.customerApiPrefix}/auth/me`, {
      firstname: payload.firstName,
      lastname: payload.lastName,
      email: payload.email,
      phone: payload.phoneNumber,
      address: payload.address,
    });
    return mapUser(response.data.user);
  },

  updatePushToken: async (pushNotificationToken: string) => {
    return apiClient.patch(`${APP_CONFIG.customerApiPrefix}/auth/me/push-token`, { pushNotificationToken });
  },
};
