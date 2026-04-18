import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const vehicleDocumentService = {
  async getVehicleDocumentCatalog() {
    const response = await apiClient.get('/vehicle-management/document-types');
    return unwrap(response);
  },

  async upsertVehicleDocuments(vehicleId, payload) {
    const formData = new FormData();
    const docsMeta = (payload.documents || []).map(({ file, fileUrl, ...rest }) => ({
      ...rest,
      fileUrl: file instanceof File ? '' : (fileUrl || ''),
    }));
    formData.append('documents', JSON.stringify(docsMeta));
    for (const doc of payload.documents || []) {
      if (doc.file instanceof File) {
        const side = doc.side || 'single';
        formData.append(`file_${doc.documentTypeId}_${side}`, doc.file);
      }
    }
    const response = await apiClient.post(`/vehicle-management/vehicles/${vehicleId}/documents`, formData);
    return unwrap(response);
  },

  async getVehicleVerificationStatus(vehicleId) {
    const response = await apiClient.get(`/vehicle-management/vehicles/${vehicleId}/verification-status`);
    return unwrap(response);
  },
};
