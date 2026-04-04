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

export const ownerService = {
  async getAccountProfile() {
    const response = await apiClient.get('/account/profile');
    return unwrap(response);
  },

  async updateAccountProfile(payload) {
    const response = await apiClient.patch('/account/profile', payload);
    return unwrap(response);
  },

  async changePassword(payload) {
    const response = await apiClient.post('/account/change-password', payload);
    return unwrap(response);
  },

  async getAccountSummary() {
    const response = await apiClient.get('/account/summary');
    return unwrap(response);
  },

  async getDashboard() {
    const response = await apiClient.get('/dashboard');
    return unwrap(response);
  },

  async getWalletOverview() {
    const response = await apiClient.get('/owner-revenue/wallet');
    const wallet = unwrap(response);
    return { wallet, transactions: [] };
  },

  async getWithdrawals(params) {
    const response = await apiClient.get('/owner-revenue/withdrawals', { params });
    return withPagination(response, params);
  },

  async createWithdrawal(payload) {
    const response = await apiClient.post('/owner-revenue/withdrawals', payload, {
      headers: { 'Idempotency-Key': `wd-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    });
    return unwrap(response);
  },

  async getVehicles(params) {
    const response = await apiClient.get('/vehicle-management/vehicles', { params });
    return withPagination(response, params);
  },

  async createVehicle(payload) {
    const response = await apiClient.post('/vehicle-management/vehicles', payload);
    return unwrap(response);
  },

  async updateVehicle(id, payload) {
    const response = await apiClient.put(`/vehicle-management/vehicles/${id}`, payload);
    return unwrap(response);
  },

  async deleteVehicle() {
    throw new Error('Chuc nang Xóa xe Chưa duoc ho tro tren backend owner.');
  },

  async getDocuments() {
    throw new Error('Su dung module vehicle-management/documents thay vi ownerService.getDocuments.');
  },

  async updateDocumentStatus() {
    throw new Error('Không ho tro update Trạng thái giấy tờ tu owner side.');
  },

  async getBookings(params) {
    const response = await apiClient.get('/rental-bookings', { params });
    return withPagination(response, params);
  },

  async updateBookingStatus(id, status) {
    const response = await apiClient.patch(`/rental-bookings/${id}/status`, { nextStatus: status });
    return unwrap(response);
  },

  async getMaintenanceRecords(params) {
    const response = await apiClient.get('/vehicle-maintenance/records', { params });
    return withPagination(response, params);
  },

  async createMaintenanceRecord(payload) {
    const response = await apiClient.post('/vehicle-maintenance/records', payload);
    return unwrap(response);
  },

  async getPayments(params) {
    const response = await apiClient.get('/owner-revenue/payments', { params });
    return withPagination(response, params);
  },
};

