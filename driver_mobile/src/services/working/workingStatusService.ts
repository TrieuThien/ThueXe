import { apiClient } from '../api/client';
import type { WorkingOverview } from '../../types/working';

export const workingStatusService = {
  async getWorkingOverview(): Promise<WorkingOverview> {
    const response = await apiClient.get('/driver/working-overview');
    return response.data.data;
  },

  async toggleOnline(isOnline: boolean): Promise<WorkingOverview> {
    const response = await apiClient.patch('/driver/working-status', { online: isOnline });
    return response.data.data;
  }
};
