import { apiClient } from '../api/client';
import type { ServiceTypeId, UpdateServiceTypesPayload } from '../../types/working';

export const activeServiceTypesService = {
  async getActiveServiceTypes(): Promise<ServiceTypeId[]> {
    try {
      const response = await apiClient.get('/api/driver/working-status');
      const data = response.data.data as { available_for_rental?: number };
      if (data.available_for_rental === 1) return ['thue_tai_xe'];
      if (data.available_for_rental === 2) return ['xe_kem_tai_xe'];
      return ['goi_xe'];
    } catch {
      return ['goi_xe'];
    }
  },

  async updateActiveServiceTypes(payload: UpdateServiceTypesPayload): Promise<ServiceTypeId[]> {
    const selected = payload.serviceTypes[0];
    const value = selected === 'xe_kem_tai_xe' ? 2 : selected === 'thue_tai_xe' ? 1 : 0;
    const response = await apiClient.patch('/api/driver/working-status/service-type', {
      available_for_rental: value
    });
    const data = response.data.data as { available_for_rental?: number };
    if (data.available_for_rental === 1) return ['thue_tai_xe'];
    if (data.available_for_rental === 2) return ['xe_kem_tai_xe'];
    return ['goi_xe'];
  }
};
