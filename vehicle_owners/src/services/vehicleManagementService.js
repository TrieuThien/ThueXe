import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const vehicleManagementService = {
  async getVehicleTypeOptions() {
    const response = await apiClient.get('/vehicle-management/vehicle-types');
    return unwrap(response);
  },

  async createVehicle(payload) {
    const { documents = [], ...vehicleMeta } = payload;
    const formData = new FormData();
    Object.entries(vehicleMeta).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.append(k, v);
    });
    const docsMeta = documents.map(({ file, fileUrl, ...rest }) => ({
      ...rest,
      fileUrl: file instanceof File ? '' : (fileUrl || ''),
    }));
    formData.append('documents', JSON.stringify(docsMeta));
    for (const doc of documents) {
      if (doc.file instanceof File) {
        const side = doc.side || 'single';
        formData.append(`file_${doc.documentTypeId}_${side}`, doc.file);
      }
    }
    const response = await apiClient.post('/vehicle-management/vehicles', formData);
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
