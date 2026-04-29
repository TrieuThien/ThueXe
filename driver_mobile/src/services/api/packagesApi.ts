/**
 * packagesApi.ts
 * API client cho tài xế quản lý gói thuê tài xế.
 */

import { apiClient } from './client';

export interface SystemPackage {
  package_id: number;
  package_name: string;
  service_type: number;
  duration_hours: number | null;
  distance_limit_km: number;
  base_price: number;
  deposit_amount: number;
  extra_hour_fee: number;
  extra_km_fee: number;
  description: string | null;
  system_active: number;
  enrollment_id: number | null;
  price_override: number | null;
  enrollment_status: 'active' | 'inactive' | null;
}

export interface EnrollPackagePayload {
  package_id: number;
  price_override?: number | null;
}

export interface Enrollment {
  enrollment_id: number;
  driver_id: number;
  package_id: number;
  price_override: number | null;
  status: 'active' | 'inactive';
}

export const packagesApi = {
  /** GET /api/driver/packages — tất cả gói hệ thống + trạng thái đăng ký */
  getPackages: async (): Promise<SystemPackage[]> => {
    const res = await apiClient.get('/api/driver/packages');
    return res.data.data.packages;
  },

  /** GET /api/driver/packages/active — chỉ gói đang bán */
  getActivePackages: async (): Promise<SystemPackage[]> => {
    const res = await apiClient.get('/api/driver/packages/active');
    return res.data.data.packages;
  },

  /** POST /api/driver/packages/select — đăng ký bán gói */
  selectPackage: async (payload: EnrollPackagePayload): Promise<Enrollment> => {
    const res = await apiClient.post('/api/driver/packages/select', payload);
    return res.data.data;
  },

  /** DELETE /api/driver/packages/:enrollmentId — ngừng bán gói */
  removePackage: async (enrollmentId: number): Promise<void> => {
    await apiClient.delete(`/api/driver/packages/${enrollmentId}`);
  },

  /** POST /api/customer/driver-hire/requests/:requestId/respond — chấp nhận/từ chối */
  respondToRequest: async (requestId: number, action: 'accept' | 'reject'): Promise<void> => {
    await apiClient.post(`/api/customer/driver-hire/requests/${requestId}/respond`, { action });
  },
};
