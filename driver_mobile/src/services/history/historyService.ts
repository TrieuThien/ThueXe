import { apiClient } from '../api/client';
import type { PaginatedTripHistoryResponse, TripHistoryDetail, TripHistoryFilters } from '../../types/history';

export const historyService = {
  async getHistoryList(params: TripHistoryFilters & { page: number; pageSize: number }): Promise<PaginatedTripHistoryResponse> {
    const response = await apiClient.get('/driver/history/list', { params });
    return response.data.data;
  },

  async getHistoryDetail(tripId: string): Promise<TripHistoryDetail> {
    const response = await apiClient.get('/driver/history/detail', {
      params: { tripId }
    });
    return response.data.data;
  }
};
