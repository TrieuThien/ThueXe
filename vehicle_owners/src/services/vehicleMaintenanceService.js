import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

const withPagination = (response, fallback = {}) => {
  const data = unwrap(response);
  const meta = response.data?.meta || {};
  return {
    items: data.items || [],
    page: meta.page || fallback.page || 1,
    pageSize: meta.pageSize || fallback.pageSize || 10,
    total: meta.total ?? data.total ?? 0,
    totalPages: meta.totalPages || 0,
  };
};

export const vehicleMaintenanceService = {
  async getVehicleOptions() {
    const response = await apiClient.get('/vehicle-maintenance/vehicles');
    return unwrap(response);
  },

  async getMaintenanceRecords(params = {}) {
    const response = await apiClient.get('/vehicle-maintenance/records', { params });
    return withPagination(response, params);
  },

  async getMaintenanceDetail(recordId) {
    const response = await apiClient.get(`/vehicle-maintenance/records/${recordId}`);
    return unwrap(response);
  },

  async createMaintenanceRecord(payload) {
    const response = await apiClient.post('/vehicle-maintenance/records', payload);
    return unwrap(response);
  },

  async updateMaintenanceRecord(recordId, payload) {
    const response = await apiClient.put(`/vehicle-maintenance/records/${recordId}`, payload);
    return unwrap(response);
  },

  async deleteMaintenanceRecord(recordId) {
    await apiClient.delete(`/vehicle-maintenance/records/${recordId}`);
    return true;
  },

  async getMaintenanceStats(params = {}) {
    const response = await apiClient.get('/vehicle-maintenance/stats', { params });
    return unwrap(response);
  },
};
