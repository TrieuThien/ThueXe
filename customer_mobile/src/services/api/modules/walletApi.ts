import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export interface WalletTransactionsQuery {
  page?: number;
  limit?: number;
  entry_type?: string;
}

export const walletApi = {
  getWallet: async () => apiClient.get(`${APP_CONFIG.customerApiPrefix}/wallet`),
  getWalletTransactions: async (params?: WalletTransactionsQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/wallet/transactions`, { params }),
  topUp: async (payload: { amount: number; gateway_name: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/wallet/topup/create-payment`, payload),
  confirmTopUp: async (payload: { payment_id: number; callback_data?: Record<string, unknown>; status?: string; gateway_status?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/wallet/topup/confirm`, payload),
  withdraw: async (payload: { amount: number; bank_account_id: number; note?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/wallet/withdrawals`, payload),
  getWithdrawals: async (params?: { page?: number; limit?: number }) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/wallet/withdrawals`, { params }),
  getPaymentDetail: async (paymentId: string | number) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/payments/${paymentId}`),
  payRideBooking: async (bookingId: string | number, payload: { payment_type: number; gateway_name?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/payments/ride/${bookingId}/pay`, payload),
  payRentalBooking: async (rentalId: string | number, payload: { payment_type: number; gateway_name?: string }) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/payments/rental/${rentalId}/pay`, payload),
  retryPayment: async (paymentId: string | number) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/payments/${paymentId}/retry`),
};
