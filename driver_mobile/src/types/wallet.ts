export type IncomePeriod = 'day' | 'month';

export type WalletSummary = {
  currentBalance: number;
  todayIncome: number;
  monthIncome: number;
  completedTrips: number;
};

export type IncomePoint = {
  label: string;
  amount: number;
};

export type IncomeStatsResponse = {
  period: IncomePeriod;
  points: IncomePoint[];
  total: number;
};

export type WalletTransactionType = 'nap_tien' | 'thanh_toan' | 'khau_tru' | 'rut_tien' | 'hoan_tien';

export type WalletTransaction = {
  id: string;
  createdAt: string;
  type: WalletTransactionType;
  title: string;
  amount: number;
  balanceAfter: number;
  note?: string;
};

export type WalletTransactionsResponse = {
  items: WalletTransaction[];
  total: number;
};

export type WalletTimeFilter = {
  fromDate?: string;
  toDate?: string;
};

export type TopupPaymentMethod = 'momo' | 'sepay' | 'zalopay' | 'banking';
export type TopupResultStatus = 'success' | 'failed' | 'timeout';

export type CreateTopupPaymentPayload = {
  amount: number;
  paymentMethod: TopupPaymentMethod;
};

export type CreateTopupPaymentResponse = {
  paymentId: string;
  amount: number;
  paymentMethod: TopupPaymentMethod;
  expiresAt: string;
  checkoutUrl: string;
};

export type TopupPaymentCallbackPayload = {
  paymentId: string;
  status: TopupResultStatus;
};

export type TopupPaymentCallbackResponse = {
  paymentId: string;
  status: TopupResultStatus;
  amount: number;
  message: string;
};

export type PayoutAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export type WithdrawalStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export type WithdrawalRequest = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: string;
  note?: string;
};

export type CreateWithdrawalPayload = {
  amount: number;
};

export type CreateWithdrawalResponse = {
  request: WithdrawalRequest;
  message: string;
};

export type WithdrawalHistoryResponse = {
  items: WithdrawalRequest[];
  total: number;
};
