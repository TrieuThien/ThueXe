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

export const rentalBookingService = {
  async getRentalOrders(query = {}) {
    const safeQuery = { ...query };
    if (safeQuery.pageSize !== undefined) {
      const parsed = Number(safeQuery.pageSize);
      safeQuery.pageSize = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10;
    }

    const response = await apiClient.get('/rental-bookings', { params: safeQuery });
    return withPagination(response, safeQuery);
  },

  async getRentalOrderDetail(bookingId) {
    const response = await apiClient.get(`/rental-bookings/${bookingId}`);
    return unwrap(response);
  },

  async updateRentalOrderStatus(bookingId, payload) {
    const response = await apiClient.patch(`/rental-bookings/${bookingId}/status`, payload);
    return unwrap(response);
  },

  async getRentalContracts(params = {}) {
    const response = await apiClient.get('/rental-bookings/contracts', { params });
    return unwrap(response);
  },

  async getContractDetail(contractId) {
    const response = await apiClient.get(`/rental-bookings/contracts/${contractId}`);
    return unwrap(response);
  },
};
