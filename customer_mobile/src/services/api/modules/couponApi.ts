import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export const couponApi = {
  validateCoupon: async (payload: {
    coupon_code: string;
    service_domain: "ride" | "rental";
    booking_amount: number;
    vehicle_type_id?: number;
  }) => apiClient.post(`${APP_CONFIG.customerApiPrefix}/coupons/validate`, payload),
  applyCoupon: async (payload: { coupon_code: string; booking_id?: number; rental_id?: number }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/coupons/apply`, payload),
  getMyAvailableCoupons: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/coupons/my-available`),
};
