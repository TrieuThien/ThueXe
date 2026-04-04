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

export const vehicleActivityService = {
  async getOwnerVehicles(params = {}) {
    const response = await apiClient.get('/vehicle-activity/vehicles', { params });
    return withPagination(response, params);
  },

  async getVehicleDetail(vehicleId) {
    const response = await apiClient.get(`/vehicle-activity/vehicles/${vehicleId}`);
    return unwrap(response);
  },

  async getVehicleLocations(params = {}) {
    const response = await apiClient.get('/vehicle-activity/vehicle-locations', { params });
    return unwrap(response);
  },

  async getVehicleAvailability(vehicleId, params = {}) {
    const response = await apiClient.get(`/vehicle-activity/vehicles/${vehicleId}/availability`, { params });
    return unwrap(response);
  },

  async createAvailabilityBlock(vehicleId, payload) {
    const response = await apiClient.post(`/vehicle-activity/vehicles/${vehicleId}/availability`, payload);
    return unwrap(response);
  },

  async updateAvailabilityBlock(vehicleId, blockId, payload) {
    const response = await apiClient.put(`/vehicle-activity/vehicles/${vehicleId}/availability/${blockId}`, payload);
    return unwrap(response);
  },

  async deleteAvailabilityBlock(vehicleId, blockId) {
    await apiClient.delete(`/vehicle-activity/vehicles/${vehicleId}/availability/${blockId}`);
    return true;
  },

  async getVehicleGanttTimeline(params = {}) {
    const response = await apiClient.get('/vehicle-activity/timeline', { params });
    return unwrap(response);
  },
};
