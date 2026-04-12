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
  WalletTransaction,
  WalletTransactionsResponse,
  WithdrawalHistoryResponse,
  WithdrawalRequest,
  WithdrawalStatus
} from '../../types/wallet';

type BackendTransaction = {
  id?: number;
  created_at?: string;
  entry_type?: string;
  direction?: string;
  amount?: number;
  balance_after?: number;
  note?: string | null;
  description?: string | null;
};

function mapTransactionType(entry_type?: string, direction?: string): WalletTransaction['type'] {
  if (entry_type === 'topup') return 'nap_tien';
  if (entry_type === 'withdrawal') return 'rut_tien';
  if (entry_type === 'refund') return 'hoan_tien';
  if (entry_type === 'commission') return 'khau_tru';
  if (direction === 'credit') return 'thanh_toan';
  return 'thanh_toan';
}

function mapTransaction(t: BackendTransaction): WalletTransaction {
  return {
    id: String(t.id ?? ''),
    createdAt: t.created_at ?? new Date().toISOString(),
    type: mapTransactionType(t.entry_type, t.direction),
    title: t.description ?? t.note ?? t.entry_type ?? 'Giao dịch',
    amount: t.amount ?? 0,
    balanceAfter: t.balance_after ?? 0,
    note: t.note ?? undefined
  };
}

type BackendWithdrawal = {
  id?: number;
  amount?: number;
  status?: string;
  created_at?: string;
  requested_date?: string;
  note?: string | null;
};

function mapWithdrawalStatus(s?: string): WithdrawalStatus {
  if (s === 'paid') return 'paid';
  if (s === 'failed') return 'failed';
  if (s === 'cancelled') return 'cancelled';
  return 'pending';
}

function mapWithdrawal(w: BackendWithdrawal): WithdrawalRequest {
  return {
    id: String(w.id ?? ''),
    amount: w.amount ?? 0,
    status: mapWithdrawalStatus(w.status),
    createdAt: w.created_at ?? w.requested_date ?? new Date().toISOString(),
    note: w.note ?? undefined
  };
}

export const walletService = {
  async getWalletSummary(): Promise<WalletSummary> {
    const response = await apiClient.get('/api/driver/wallet/summary');
    const data = response.data.data as {
      balance?: number;
      total_earned?: number;
    };
    // Lấy thêm income summary cho todayIncome và monthIncome
    const incomeResponse = await apiClient.get('/api/driver/income/summary');
    const income = incomeResponse.data.data as {
      income?: { today?: number; thisMonth?: number; allTime?: number }
    };

    return {
      currentBalance: data.balance ?? 0,
      todayIncome: income.income?.today ?? 0,
      monthIncome: income.income?.thisMonth ?? 0,
      completedTrips: 0
    };
  },

  async getIncomeStats(period: IncomePeriod, filter?: WalletTimeFilter): Promise<IncomeStatsResponse> {
    const response = await apiClient.get('/api/driver/income/chart', {
      params: {
        mode: period,
        fromDate: filter?.fromDate,
        toDate: filter?.toDate
      }
    });
    const data = response.data.data as {
      data?: Array<{ date?: string; label?: string; amount?: number }>;
      total?: number;
      mode?: string;
    };

    const points = (data.data ?? []).map((item) => ({
      label: item.label ?? item.date ?? '',
      amount: item.amount ?? 0
    }));

    return {
      period,
      points,
      total: data.total ?? points.reduce((sum, p) => sum + p.amount, 0)
    };
  },

  async getWalletTransactions(filter?: WalletTimeFilter): Promise<WalletTransactionsResponse> {
    const response = await apiClient.get('/api/driver/wallet/transactions', {
      params: {
        fromDate: filter?.fromDate,
        toDate: filter?.toDate,
        limit: 50
      }
    });
    const data = response.data.data as {
      transactions?: BackendTransaction[];
      items?: BackendTransaction[];
      pagination?: { total_items?: number };
    };
    const rawItems = data.transactions ?? data.items ?? [];
    return {
      items: rawItems.map(mapTransaction),
      total: data.pagination?.total_items ?? rawItems.length
    };
  },

  async createTopupPayment(payload: CreateTopupPaymentPayload): Promise<CreateTopupPaymentResponse> {
    const response = await apiClient.post('/api/driver/wallet/topup', {
      amount: payload.amount,
      gateway_name: payload.paymentMethod,
      note: undefined
    });
    const data = response.data.data as {
      paymentCode?: string;
      payment_url?: string;
      amount?: number;
      status?: string;
    };
    return {
      paymentId: data.paymentCode ?? '',
      amount: data.amount ?? payload.amount,
      paymentMethod: payload.paymentMethod,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      checkoutUrl: data.payment_url ?? ''
    };
  },

  async topupPaymentCallback(payload: TopupPaymentCallbackPayload): Promise<TopupPaymentCallbackResponse> {
    // Callback endpoint là server-to-server; từ mobile ta poll trạng thái topup
    const response = await apiClient.get(`/api/driver/wallet/topup/${payload.paymentId}`);
    const data = response.data.data as { status?: string; amount?: number; paymentCode?: string };
    const statusMap: Record<string, TopupPaymentCallbackResponse['status']> = {
      paid: 'success',
      failed: 'failed',
      cancelled: 'timeout'
    };
    return {
      paymentId: payload.paymentId,
      status: statusMap[data.status ?? ''] ?? 'failed',
      amount: data.amount ?? 0,
      message: data.status === 'paid' ? 'Nạp tiền thành công' : 'Nạp tiền thất bại'
    };
  },

  async getPayoutAccount(): Promise<PayoutAccount | null> {
    const response = await apiClient.get('/api/driver/me');
    const data = response.data.data as {
      driver?: { bank_name?: string | null; bank_acc_num?: string | null; bank_acc_holder_name?: string | null }
    };
    const driver = data.driver;
    if (!driver?.bank_name || !driver?.bank_acc_num) return null;
    return {
      bankName: driver.bank_name,
      accountNumber: driver.bank_acc_num,
      accountHolder: driver.bank_acc_holder_name ?? ''
    };
  },

  async createWithdrawalRequest(payload: CreateWithdrawalPayload): Promise<CreateWithdrawalResponse> {
    const response = await apiClient.post('/api/driver/wallet/withdrawals', {
      amount: payload.amount
    });
    const data = response.data.data as BackendWithdrawal & { message?: string };
    return {
      request: mapWithdrawal(data),
      message: data.message ?? 'Yêu cầu rút tiền đã được gửi'
    };
  },

  async getWithdrawalHistory(): Promise<WithdrawalHistoryResponse> {
    const response = await apiClient.get('/api/driver/wallet/withdrawals');
    const data = response.data.data as {
      withdrawals?: BackendWithdrawal[];
      items?: BackendWithdrawal[];
      pagination?: { total_items?: number };
    };
    const rawItems = data.withdrawals ?? data.items ?? [];
    return {
      items: rawItems.map(mapWithdrawal),
      total: data.pagination?.total_items ?? rawItems.length
    };
  }
};
