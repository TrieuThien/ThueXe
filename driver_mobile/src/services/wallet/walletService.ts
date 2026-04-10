import { apiClient } from '../api/client';
import type {
  CreateTopupPaymentPayload,
  CreateTopupPaymentResponse,
  CreateWithdrawalPayload,
  CreateWithdrawalResponse,
  IncomePeriod,
  IncomeStatsResponse,
  PayoutAccount,
  TopupPaymentCallbackPayload,
  TopupPaymentCallbackResponse,
  WalletSummary,
  WalletTimeFilter,
  WalletTransactionsResponse,
  WithdrawalHistoryResponse
} from '../../types/wallet';

export const walletService = {
  async getWalletSummary(): Promise<WalletSummary> {
    const response = await apiClient.get('/driver/wallet/summary');
    return response.data.data;
  },

  async getIncomeStats(period: IncomePeriod, filter?: WalletTimeFilter): Promise<IncomeStatsResponse> {
    const response = await apiClient.get('/driver/wallet/income-stats', {
      params: {
        period,
        fromDate: filter?.fromDate,
        toDate: filter?.toDate
      }
    });
    return response.data.data;
  },

  async getWalletTransactions(filter?: WalletTimeFilter): Promise<WalletTransactionsResponse> {
    const response = await apiClient.get('/driver/wallet/transactions', {
      params: {
        fromDate: filter?.fromDate,
        toDate: filter?.toDate
      }
    });
    return response.data.data;
  },

  async createTopupPayment(payload: CreateTopupPaymentPayload): Promise<CreateTopupPaymentResponse> {
    const response = await apiClient.post('/driver/wallet/topup/create', payload);
    return response.data.data;
  },

  async topupPaymentCallback(payload: TopupPaymentCallbackPayload): Promise<TopupPaymentCallbackResponse> {
    const response = await apiClient.post('/driver/wallet/topup/callback', payload);
    return response.data.data;
  },

  async getPayoutAccount(): Promise<PayoutAccount | null> {
    const response = await apiClient.get('/driver/wallet/payout-account');
    return response.data.data;
  },

  async createWithdrawalRequest(payload: CreateWithdrawalPayload): Promise<CreateWithdrawalResponse> {
    const response = await apiClient.post('/driver/wallet/withdrawals/create', payload);
    return response.data.data;
  },

  async getWithdrawalHistory(): Promise<WithdrawalHistoryResponse> {
    const response = await apiClient.get('/driver/wallet/withdrawals/history');
    return response.data.data;
  }
};
