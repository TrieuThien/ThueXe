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
} from "../../types";
import { apiClient } from "./client";

export const authApiClient = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", payload);
    return response.data;
  },

  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>("/auth/register", payload);
    return response.data;
  },

  verifyOtp: async (payload: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post<VerifyOtpResponse>("/auth/otp/verify", payload);
    return response.data;
  },

  resendOtp: async (verificationId: string): Promise<RequestOtpResponse> => {
    const response = await apiClient.post<RequestOtpResponse>("/auth/otp/resend", { verificationId });
    return response.data;
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ForgotPasswordResponse>("/auth/password/forgot", payload);
    return response.data;
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>("/auth/password/reset", payload);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },
};
