import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const vehicleManagementService = {
  async getVehicleTypeOptions() {
    const response = await apiClient.get('/vehicle-management/vehicle-types');
    return unwrap(response);
  },

  async createVehicle(payload) {
    const response = await apiClient.post('/vehicle-management/vehicles', payload);
    return unwrap(response);
  },

  async getOwnerVehicles(query = {}) {
    const response = await apiClient.get('/vehicle-management/vehicles', { params: query });
    const data = unwrap(response);
    const meta = response.data?.meta || {};
    return {
      items: data.items || [],
      page: meta.page || query.page || 1,
      pageSize: meta.pageSize || query.pageSize || 10,
      total: meta.total ?? data.total ?? 0,
      totalPages: meta.totalPages || 0,
    };
  },

  async getVehicleDetail(vehicleId) {
    const response = await apiClient.get(`/vehicle-management/vehicles/${vehicleId}`);
    return unwrap(response);
  },

  async updateVehicle(vehicleId, payload) {
    const response = await apiClient.put(`/vehicle-management/vehicles/${vehicleId}`, payload);
    return unwrap(response);
  },
};
