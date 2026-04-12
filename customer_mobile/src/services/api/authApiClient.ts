import { RequestOtpResponse } from "../../types";
import { authApi } from "./modules/authApi";
import { apiClient } from "./apiClient";
import { APP_CONFIG } from "../../constants";

export const authApiClient = {
  ...authApi,
  resendOtp: async (verificationId: string): Promise<RequestOtpResponse> => {
    const response = await apiClient.post<RequestOtpResponse>(`${APP_CONFIG.customerApiPrefix}/auth/resend-otp`, {
      verificationId,
    });
    return response.data;
  },
};
