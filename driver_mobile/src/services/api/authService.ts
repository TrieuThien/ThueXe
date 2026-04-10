import { AxiosError } from 'axios';
import { apiClient } from './client';
import { tokenStorage } from '../storage/tokenStorage';
import type {
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  OtpChallengeResponse,
  OtpPurpose,
  RegisterPayload,
  ResetPasswordPayload,
  ServiceError,
  VerifyOtpPayload,
  VerifyOtpResponse
} from '../../types/auth';

const mapError = (error: unknown): ServiceError => {
  if (error instanceof AxiosError && error.response?.data) {
    const payload = error.response.data as { message?: string; code?: ServiceError['code'] };
    return {
      message: payload.message ?? 'Có lỗi xảy ra, vui lòng thử lại.',
      code: payload.code ?? 'UNKNOWN',
      status: error.response.status
    };
  }

  return {
    message: 'Không thể kết nối đến hệ thống',
    code: 'UNKNOWN'
  };
};

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('/auth/login', payload);
      const data = response.data.data as LoginResponse;
      await tokenStorage.saveTokens(data.tokens);
      return data;
    } catch (error) {
      throw mapError(error);
    }
  },

  async register(payload: RegisterPayload): Promise<OtpChallengeResponse> {
    try {
      const response = await apiClient.post('/auth/register', payload);
      return response.data.data as OtpChallengeResponse;
    } catch (error) {
      throw mapError(error);
    }
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
    try {
      const response = await apiClient.post('/auth/verify-otp', payload);
      return response.data.data as VerifyOtpResponse;
    } catch (error) {
      throw mapError(error);
    }
  },

  async resendOtp(identifier: string, purpose: OtpPurpose): Promise<OtpChallengeResponse> {
    try {
      const response = await apiClient.post('/auth/resend-otp', { identifier, purpose });
      return response.data.data as OtpChallengeResponse;
    } catch (error) {
      throw mapError(error);
    }
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<OtpChallengeResponse> {
    try {
      const response = await apiClient.post('/auth/forgot-password', payload);
      return response.data.data as OtpChallengeResponse;
    } catch (error) {
      throw mapError(error);
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', payload);
    } catch (error) {
      throw mapError(error);
    }
  },

  async logout(): Promise<void> {
    await tokenStorage.clearTokens();
  }
};
