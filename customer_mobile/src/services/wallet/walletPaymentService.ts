import { QUERY_KEYS } from "../../constants";
import {
  BookingPaymentRequest,
  BookingPaymentResponse,
  BookingPaymentSummary,
  CreateTopUpRequest,
  CreateTopUpResponse,
  PaymentMethodOption,
  RetryPaymentRequest,
  RetryPaymentResponse,
  SetDefaultPaymentMethodRequest,
  SetDefaultPaymentMethodResponse,
  WalletLedgerEntry,
  WalletOverviewResponse,
  WalletTransactionFilter,
  WalletTransactionHistoryResponse,
  WithdrawalRequestPayload,
  WithdrawalRequestResponse,
} from "../../types";
import { apiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { mockDelay } from "../mock/mockDelay";

const USE_MOCK_WALLET_PAYMENT = true;

const now = () => new Date().toISOString();

const walletState: {
  overview: WalletOverviewResponse;
  ledger: WalletLedgerEntry[];
  methods: PaymentMethodOption[];
  bookingPayments: Record<string, BookingPaymentSummary>;
} = {
  overview: {
    accountId: "wallet_1",
    customerId: "user_1",
    balance: 1520000,
    availableBalance: 1520000,
    pendingBalance: 0,
    currency: "VND",
    updatedAt: now(),
  },
  ledger: [
    {
      id: "ledger_1",
      walletAccountId: "wallet_1",
      type: "TOP_UP",
      status: "PAID",
      direction: "IN",
      amount: 500000,
      balanceAfter: 1520000,
      description: "Nap vi qua MOMO",
      paymentMethodType: "MOMO",
      createdAt: now(),
    },
    {
      id: "ledger_2",
      walletAccountId: "wallet_1",
      type: "BOOKING_PAYMENT",
      status: "PAID",
      direction: "OUT",
      amount: 118000,
      balanceAfter: 1020000,
      description: "Thanh toan booking #ride_1",
      referenceType: "BOOKING",
      referenceId: "ride_1",
      paymentMethodType: "WALLET",
      createdAt: now(),
    },
    {
      id: "ledger_3",
      walletAccountId: "wallet_1",
      type: "REFUND",
      status: "REFUNDED",
      direction: "IN",
      amount: 30000,
      balanceAfter: 1050000,
      description: "Hoan tien phi huy",
      paymentMethodType: "WALLET",
      createdAt: now(),
    },
  ],
  methods: [
    { id: "pm_cash", type: "CASH", title: "Tiền mặt", subtitle: "Trả trực tiếp", isDefault: false, isAvailable: true },
    { id: "pm_wallet", type: "WALLET", title: "Ví ThueXe", subtitle: "Dùng số dư ví", isDefault: true, isAvailable: true },
    { id: "pm_momo", type: "MOMO", title: "Ví điện tử MOMO", subtitle: "Liên kết ví", isDefault: false, isAvailable: true },
    {
      id: "pm_card",
      type: "BANK_CARD",
      title: "Thẻ/Online Banking",
      subtitle: "Có thể thêm tài khoản ngân hàng liên kết (sắp có)",
      isDefault: false,
      isAvailable: true,
      linkedBankLabel: "Chưa liên kết",
    },
  ],
  bookingPayments: {
    booking_demo_1: {
      payableAmount: 186000,
      paidAmount: 0,
      status: "PENDING",
      bookingId: "booking_demo_1",
      currency: "VND",
    },
  },
};

function throwApiError(code: string, message: string, status: number): never {
  throw new ApiError({ code, message, status });
}

function applyTransactionFilter(items: WalletLedgerEntry[], filter?: WalletTransactionFilter): WalletLedgerEntry[] {
  return items.filter((item) => {
    const typeMatch = !filter?.type || filter.type === "ALL" || item.type === filter.type;
    const statusMatch = !filter?.status || filter.status === "ALL" || item.status === filter.status;
    return typeMatch && statusMatch;
  });
}

export const walletPaymentService = {
  getWalletOverview: async (): Promise<WalletOverviewResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(250);
      return { ...walletState.overview };
    }

    const response = await apiClient.get<WalletOverviewResponse>("/wallet_accounts/me");
    return response.data;
  },

  getPaymentMethods: async (): Promise<PaymentMethodOption[]> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(220);
      return [...walletState.methods];
    }

    const response = await apiClient.get<PaymentMethodOption[]>("/payments/methods");
    return response.data;
  },

  setDefaultPaymentMethod: async (payload: SetDefaultPaymentMethodRequest): Promise<SetDefaultPaymentMethodResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(200);
      const selectedMethod = walletState.methods.find((item) => item.id === payload.paymentMethodId);

      if (!selectedMethod || !selectedMethod.isAvailable) {
        throwApiError("PAYMENT_METHOD_UNAVAILABLE", "Phương thức thanh toán không khả dụng", 400);
      }

      walletState.methods = walletState.methods.map((item) => ({
        ...item,
        isDefault: item.id === payload.paymentMethodId,
      }));

      return { paymentMethodId: payload.paymentMethodId };
    }

    const response = await apiClient.post<SetDefaultPaymentMethodResponse>("/payments/methods/default", payload);
    return response.data;
  },

  getTransactionHistory: async (filter?: WalletTransactionFilter): Promise<WalletTransactionHistoryResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(280);
      return {
        items: applyTransactionFilter(walletState.ledger, filter),
      };
    }

    const response = await apiClient.post<WalletTransactionHistoryResponse>("/wallet_ledger/filter", filter ?? {});
    return response.data;
  },

  createTopUp: async (payload: CreateTopUpRequest): Promise<CreateTopUpResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(420);
      const selectedMethod = walletState.methods.find((item) => item.id === payload.paymentMethodId);

      if (payload.amount < 10000) {
        throwApiError("TOPUP_INVALID_AMOUNT", "Số tiền nạp tối thiểu 10.000đ", 400);
      }

      if (!selectedMethod || !selectedMethod.isAvailable) {
        throwApiError("TOPUP_METHOD_UNAVAILABLE", "Phương thức nạp không khả dụng", 400);
      }

      if (selectedMethod.type === "WALLET") {
        throwApiError("TOPUP_INVALID_METHOD", "Không thể dùng ví ThueXe để nạp cho chính ví ThueXe", 400);
      }

      const paymentId = `payment_topup_${Date.now()}`;
      const newBalance = walletState.overview.balance + payload.amount;
      walletState.overview.balance = newBalance;
      walletState.overview.availableBalance = newBalance;
      walletState.overview.updatedAt = now();

      walletState.ledger.unshift({
        id: `ledger_${Date.now()}`,
        walletAccountId: walletState.overview.accountId,
        type: "TOP_UP",
        status: "PAID",
        direction: "IN",
        amount: payload.amount,
        balanceAfter: newBalance,
        description: "Nạp ví thành công",
        paymentMethodType: selectedMethod.type,
        createdAt: now(),
      });

      return {
        paymentId,
        status: "PAID",
      };
    }

    const response = await apiClient.post<CreateTopUpResponse>("/payments/topup", payload);
    return response.data;
  },

  getBookingPaymentSummary: async (params: { bookingId?: string; rentalBookingId?: string }): Promise<BookingPaymentSummary> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(240);
      const key = params.bookingId ?? params.rentalBookingId ?? "booking_demo_1";
      return walletState.bookingPayments[key] ?? {
        payableAmount: 225000,
        paidAmount: 0,
        status: "PENDING",
        bookingId: params.bookingId,
        rentalBookingId: params.rentalBookingId,
        currency: "VND",
      };
    }

    const query = params.bookingId ? `bookingId=${params.bookingId}` : `rentalBookingId=${params.rentalBookingId}`;
    const response = await apiClient.get<BookingPaymentSummary>(`/payments/summary?${query}`);
    return response.data;
  },

  payBooking: async (payload: BookingPaymentRequest): Promise<BookingPaymentResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(380);
      const key = payload.bookingId ?? payload.rentalBookingId ?? "booking_demo_1";
      const summary = walletState.bookingPayments[key] ?? {
        payableAmount: 225000,
        paidAmount: 0,
        status: "PENDING",
        bookingId: payload.bookingId,
        rentalBookingId: payload.rentalBookingId,
        currency: "VND",
      };

      const method = walletState.methods.find((m) => m.id === payload.paymentMethodId);

      if (!method || !method.isAvailable) {
        throwApiError("PAYMENT_METHOD_UNAVAILABLE", "Phương thức thanh toán không khả dụng", 400);
      }

      if (method.type === "WALLET" && walletState.overview.availableBalance < summary.payableAmount) {
        summary.status = "FAILED";
        walletState.bookingPayments[key] = summary;
        throwApiError("INSUFFICIENT_BALANCE", "Số dư ví không đủ", 400);
      }

      summary.status = "PAID";
      summary.paidAmount = summary.payableAmount;
      walletState.bookingPayments[key] = summary;

      if (method.type === "WALLET") {
        walletState.overview.balance -= summary.payableAmount;
        walletState.overview.availableBalance = walletState.overview.balance;
        walletState.overview.updatedAt = now();

        walletState.ledger.unshift({
          id: `ledger_${Date.now()}`,
          walletAccountId: walletState.overview.accountId,
          type: payload.bookingId ? "BOOKING_PAYMENT" : "RENTAL_PAYMENT",
          status: "PAID",
          direction: "OUT",
          amount: summary.payableAmount,
          balanceAfter: walletState.overview.balance,
          description: payload.bookingId ? `Thanh toÃ¡n Ä‘Æ¡n Ä‘áº·t #${payload.bookingId}` : `Thanh toÃ¡n Ä‘Æ¡n thuÃª #${payload.rentalBookingId}`,
          paymentMethodType: "WALLET",
          referenceType: payload.bookingId ? "BOOKING" : "RENTAL_BOOKING",
          referenceId: payload.bookingId ?? payload.rentalBookingId,
          createdAt: now(),
        });
      }

      return {
        paymentId: `payment_${Date.now()}`,
        status: summary.status,
      };
    }

    const response = await apiClient.post<BookingPaymentResponse>("/payments/booking", payload);
    return response.data;
  },

  retryPayment: async (payload: RetryPaymentRequest): Promise<RetryPaymentResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(320);
      return {
        paymentId: payload.paymentId,
        status: "PAID",
        message: "Thanh toÃ¡n láº¡i thÃ nh cÃ´ng",
      };
    }

    const response = await apiClient.post<RetryPaymentResponse>("/payments/retry", payload);
    return response.data;
  },

  requestWithdrawal: async (payload: WithdrawalRequestPayload): Promise<WithdrawalRequestResponse> => {
    if (USE_MOCK_WALLET_PAYMENT) {
      await mockDelay(360);

      if (payload.amount <= 0) {
        throwApiError("WITHDRAW_INVALID_AMOUNT", "Sá»‘ tiá»n rÃºt khÃ´ng há»£p lá»‡", 400);
      }

      if (payload.amount > walletState.overview.availableBalance) {
        throwApiError("WITHDRAW_INSUFFICIENT_BALANCE", "Sá»‘ dÆ° kháº£ dá»¥ng khÃ´ng Ä‘á»§", 400);
      }

      walletState.overview.availableBalance -= payload.amount;
      walletState.overview.pendingBalance += payload.amount;
      walletState.overview.updatedAt = now();

      walletState.ledger.unshift({
        id: `ledger_${Date.now()}`,
        walletAccountId: walletState.overview.accountId,
        type: "WITHDRAWAL",
        status: "PENDING",
        direction: "OUT",
        amount: payload.amount,
        balanceAfter: walletState.overview.availableBalance,
        description: "YÃªu cáº§u rÃºt tiá»n",
        paymentMethodType: "BANK_CARD",
        referenceType: "WITHDRAWAL_REQUEST",
        referenceId: `wr_${Date.now()}`,
        createdAt: now(),
      });

      return {
        withdrawalRequestId: `wr_${Date.now()}`,
        status: "PENDING",
        requestedAt: now(),
      };
    }

    const response = await apiClient.post<WithdrawalRequestResponse>("/withdrawal_requests", payload);
    return response.data;
  },
};

export const walletPaymentQueryKeys = {
  overview: QUERY_KEYS.wallet,
  methods: QUERY_KEYS.walletPaymentMethods,
  transactions: (filter?: WalletTransactionFilter) => [
    ...QUERY_KEYS.walletTransactions,
    filter?.type ?? "ALL",
    filter?.status ?? "ALL",
  ] as const,
  paymentSummary: (bookingId?: string, rentalBookingId?: string) => [
    ...QUERY_KEYS.walletBookingPaymentSummary,
    bookingId ?? "none",
    rentalBookingId ?? "none",
  ] as const,
};

