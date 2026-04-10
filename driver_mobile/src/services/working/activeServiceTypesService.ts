import { apiClient } from '../api/client';
import type { ServiceTypeId, UpdateServiceTypesPayload } from '../../types/working';

export const activeServiceTypesService = {
  async getActiveServiceTypes(): Promise<ServiceTypeId[]> {
    const response = await apiClient.get('/driver/active-service-types');
    return response.data.data;
  },

  async updateActiveServiceTypes(payload: UpdateServiceTypesPayload): Promise<ServiceTypeId[]> {
    const response = await apiClient.patch('/driver/active-service-types', payload);
    return response.data.data;
  }
};
