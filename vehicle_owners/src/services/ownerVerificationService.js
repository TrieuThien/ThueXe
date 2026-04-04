import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const ownerVerificationService = {
  async getVerificationStatus() {
    const response = await apiClient.get('/verification/status');
    return unwrap(response);
  },

  async getRequiredDocuments() {
    const response = await apiClient.get('/verification/required-documents');
    return unwrap(response);
  },

  async getSubmittedVerificationProfile() {
    const response = await apiClient.get('/verification/submission');
    return unwrap(response);
  },

  async uploadDocument(payload) {
    const formData = new FormData();
    formData.append('documentTypeId', payload.documentTypeId);
    formData.append('file', payload.file);
    if (payload.documentNumber) formData.append('documentNumber', payload.documentNumber);
    if (payload.expiryDate) formData.append('expiryDate', payload.expiryDate);

    const response = await apiClient.post('/verification/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(response);
  },

  async updateDocument(documentTypeId, payload) {
    const formData = new FormData();
    formData.append('documentTypeId', documentTypeId);
    if (payload.file) formData.append('file', payload.file);
    if (payload.documentNumber) formData.append('documentNumber', payload.documentNumber);
    if (payload.expiryDate) formData.append('expiryDate', payload.expiryDate);

    const response = await apiClient.put(`/verification/documents/${documentTypeId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(response);
  },

  async submitVerificationDocuments() {
    const response = await apiClient.post('/verification/submit', {});
    return unwrap(response);
  },
};
