import { AxiosError } from 'axios';
import { apiClient } from './client';
import { tokenStorage } from '../storage/tokenStorage';
import { buildAuthTokens, mapDriverProfile, type BackendDriver } from './mappers';
import type {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
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
    const payload = error.response.data as { message?: string; code?: string };
    return {
      message: payload.message ?? 'Có lỗi xảy ra, vui lòng thử lại.',
      code: (payload.code as ServiceError['code']) ?? 'UNKNOWN',
      status: error.response.status
    };
  }

  return {
    message: 'Không thể kết nối đến hệ thống',
    code: 'UNKNOWN'
  };
};

type AuthApiResult = {
  driver: BackendDriver;
  accessToken: string;
  refreshToken: string;
};

function parseAuthResult(data: AuthApiResult): LoginResponse {
  const tokens = buildAuthTokens(data.accessToken, data.refreshToken);
  return { profile: mapDriverProfile(data.driver), tokens };
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('/api/driver/auth/login', payload);
      const data = response.data.data as AuthApiResult;
      const result = parseAuthResult(data);
      await tokenStorage.saveTokens(result.tokens);
      return result;
    } catch (error) {
      throw mapError(error);
    }
  },

  async register(payload: RegisterPayload): Promise<OtpChallengeResponse> {
    try {
      // Tách fullName → firstname + lastname
      const parts = payload.fullName.trim().split(/\s+/);
      const lastname = parts.length > 1 ? parts.pop()! : '';
      const firstname = parts.join(' ') || payload.fullName.trim();

      const response = await apiClient.post('/api/driver/auth/register', {
        firstname,
        lastname,
        email: payload.email,
        phone: payload.phone,
        password: payload.password
      });

      const data = response.data.data as AuthApiResult & { activation_required?: boolean };

      // Lưu tokens ngay sau register để có thể gọi API trong khi chờ xác thực OTP
      const tokens = buildAuthTokens(data.accessToken, data.refreshToken);
      await tokenStorage.saveTokens(tokens);

      return {
        driver_id: Number(data.driver.id ?? data.driver.driver_id ?? 0),
        identifier: payload.email || payload.phone,
        purpose: 'register' as OtpPurpose
      };
    } catch (error) {
      throw mapError(error);
    }
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
    try {
      const response = await apiClient.post('/api/driver/auth/verify-otp', {
        driver_id: payload.driver_id,
        code: payload.code
      });
      const data = response.data.data as AuthApiResult;
      const result = parseAuthResult(data);
      // Cập nhật tokens mới sau khi OTP xác thực thành công
      await tokenStorage.saveTokens(result.tokens);
      return result;
    } catch (error) {
      throw mapError(error);
    }
  },

  // Resend OTP: backend chỉ cần identifier, không trả về otpRef
  async resendOtp(identifier: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/api/driver/auth/resend-otp', { identifier });
      return response.data.data as { message: string };
    } catch (error) {
      throw mapError(error);
    }
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
    try {
      const response = await apiClient.post('/api/driver/auth/forgot-password', payload);
      return response.data.data as ForgotPasswordResponse;
    } catch (error) {
      throw mapError(error);
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    try {
      await apiClient.post('/api/driver/auth/reset-password', {
        token: payload.token,
        new_password: payload.newPassword
      });
    } catch (error) {
      throw mapError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      const tokens = await tokenStorage.loadTokens();
      if (tokens?.refreshToken) {
        await apiClient.post('/api/driver/auth/logout', {
          refreshToken: tokens.refreshToken
        });
      }
    } catch {
      // Logout lỗi vẫn phải xóa tokens local
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  async registerPushToken(token: string): Promise<void> {
    await apiClient.patch('/api/driver/auth/me/push-token', { push_notification_token: token });
  }
};
