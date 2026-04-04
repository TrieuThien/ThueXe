import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const vehicleDocumentService = {
  async getVehicleDocumentCatalog() {
    const response = await apiClient.get('/vehicle-management/document-types');
    return unwrap(response);
  },

  async upsertVehicleDocuments(vehicleId, payload) {
    const response = await apiClient.post(`/vehicle-management/vehicles/${vehicleId}/documents`, payload);
    return unwrap(response);
  },

  async getVehicleVerificationStatus(vehicleId) {
    const response = await apiClient.get(`/vehicle-management/vehicles/${vehicleId}/verification-status`);
    return unwrap(response);
  },
};
