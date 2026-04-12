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
import { authApiClient } from "./api/authApiClient";

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => authApiClient.login(payload),
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => authApiClient.register(payload),
  verifyOtp: async (payload: VerifyOtpRequest): Promise<VerifyOtpResponse> => authApiClient.verifyOtp(payload),
  resendOtp: async (verificationId: string): Promise<RequestOtpResponse> => authApiClient.resendOtp(verificationId),
  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => authApiClient.forgotPassword(payload),
  resetPassword: async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => authApiClient.resetPassword(payload),
  getMe: async (): Promise<User> => authApiClient.getMe(),
};
