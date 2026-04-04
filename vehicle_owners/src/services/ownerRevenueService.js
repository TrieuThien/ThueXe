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

export const ownerRevenueService = {
  async getRevenueSummary(params = {}) {
    const response = await apiClient.get('/owner-revenue/summary', { params });
    return unwrap(response);
  },

  async getRevenueByVehicle(params = {}) {
    const response = await apiClient.get('/owner-revenue/by-vehicle', { params });
    return withPagination(response, params);
  },

  async getWalletBalance() {
    const response = await apiClient.get('/owner-revenue/wallet');
    return unwrap(response);
  },

  async getWalletLedger(params = {}) {
    const response = await apiClient.get('/owner-revenue/ledger', { params });
    return withPagination(response, params);
  },

  async getPaymentHistory(params = {}) {
    const response = await apiClient.get('/owner-revenue/payments', { params });
    return withPagination(response, params);
  },

  async getWithdrawalRequests(params = {}) {
    const response = await apiClient.get('/owner-revenue/withdrawals', { params });
    return withPagination(response, params);
  },

  async createWithdrawalRequest(payload) {
    const response = await apiClient.post('/owner-revenue/withdrawals', payload, {
      headers: { 'Idempotency-Key': `wd-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    });
    return unwrap(response);
  },

  async createTopupTransaction(payload) {
    const response = await apiClient.post('/owner-revenue/topup', payload, {
      headers: { 'Idempotency-Key': `topup-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    });
    return unwrap(response);
  },
};
