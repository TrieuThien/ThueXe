import { APP_CONFIG, QUERY_KEYS } from "../../constants";
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
  WalletTransactionFilter,
  WalletTransactionHistoryResponse,
  WalletOverviewResponse,
  WithdrawalRequestPayload,
  WithdrawalRequestResponse,
} from "../../types";
import { apiClient } from "../api/client";

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/[, ]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toLedgerDirection(value: unknown): "IN" | "OUT" {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "IN" || normalized === "CREDIT") {
    return "IN";
  }
  return "OUT";
}

function toPaymentStatus(value: unknown): "PENDING" | "PAID" | "FAILED" | "REFUNDED" {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "PAID") return "PAID";
  if (normalized === "FAILED" || normalized === "CANCELLED") return "FAILED";
  if (normalized === "REFUNDED") return "REFUNDED";
  return "PENDING";
}

function toLedgerType(value: unknown): "TOP_UP" | "WITHDRAWAL" | "BOOKING_PAYMENT" | "RENTAL_PAYMENT" | "REFUND" | "ADJUSTMENT" {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "TOP_UP" || normalized === "TOPUP") return "TOP_UP";
  if (normalized === "WITHDRAWAL" || normalized === "WITHDRAW") return "WITHDRAWAL";
  if (normalized === "BOOKING_PAYMENT" || normalized === "RIDE_PAYMENT") return "BOOKING_PAYMENT";
  if (normalized === "RENTAL_PAYMENT") return "RENTAL_PAYMENT";
  if (normalized === "REFUND") return "REFUND";
  return "ADJUSTMENT";
}

function toPaymentMethods(payload: unknown): PaymentMethodOption[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && Array.isArray((payload as { methods?: unknown[] }).methods)
        ? (payload as { methods: unknown[] }).methods
        : [];

  const normalized = list
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const id = row.id ?? row.payment_method_id ?? row.method_id ?? `pm_${index + 1}`;
      const type = String(row.type ?? "WALLET").toUpperCase() as PaymentMethodOption["type"];
      return {
        id: String(id),
        type,
        title: String(row.title ?? row.displayName ?? row.name ?? type),
        subtitle: row.subtitle ? String(row.subtitle) : undefined,
        isDefault: toBoolean(row.isDefault ?? row.default),
        isAvailable: toBoolean(row.isAvailable ?? row.available, true),
        linkedBankLabel: row.linkedBankLabel ? String(row.linkedBankLabel) : undefined,
      };
    })
    .filter((item) => item.id.length > 0);

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    { id: "pm_wallet", type: "WALLET", title: "Ví ThueXe", isDefault: true, isAvailable: true },
    { id: "pm_cash", type: "CASH", title: "Tiền mặt", isDefault: false, isAvailable: true },
    { id: "pm_momo", type: "MOMO", title: "Ví MoMo", isDefault: false, isAvailable: true },
    { id: "pm_sepay", type: "SEPAY", title: "SePay (QR/Ngân hàng)", isDefault: false, isAvailable: true },
    { id: "pm_card", type: "BANK_CARD", title: "Thẻ/Online Banking", isDefault: false, isAvailable: true },
  ];
}

export const walletPaymentService = {
  getWalletOverview: async (): Promise<WalletOverviewResponse> => {
    const response = await apiClient.get<unknown>(`${APP_CONFIG.customerApiPrefix}/wallet`);
    const payload = (response.data ?? {}) as Record<string, unknown>;
    const wallet = (payload.wallet ?? payload) as Record<string, unknown>;
    const accountId = wallet.wallet_id ?? wallet.accountId ?? wallet.id ?? "";
    const customerId = wallet.customer_id ?? wallet.customerId ?? wallet.user_id ?? "";
    const balance = toNumber(wallet.balance, 0);
    const updatedAt = wallet.updated_at ?? wallet.updatedAt ?? new Date().toISOString();

    return {
      accountId: String(accountId),
      customerId: String(customerId),
      balance,
      availableBalance: balance,
      pendingBalance: 0,
      currency: "VND",
      updatedAt: String(updatedAt),
    };
  },

  getPaymentMethods: async (): Promise<PaymentMethodOption[]> => {
    const response = await apiClient.get<PaymentMethodOption[]>(`${APP_CONFIG.customerApiPrefix}/wallet`);
    return toPaymentMethods(response.data);
  },

  setDefaultPaymentMethod: async (payload: SetDefaultPaymentMethodRequest): Promise<SetDefaultPaymentMethodResponse> => {
    const response = await apiClient.post<SetDefaultPaymentMethodResponse>(`${APP_CONFIG.customerApiPrefix}/wallet`, payload);
    return response.data;
  },

  getTransactionHistory: async (filter?: WalletTransactionFilter): Promise<WalletTransactionHistoryResponse> => {
    const response = await apiClient.get<WalletTransactionHistoryResponse>(`${APP_CONFIG.customerApiPrefix}/wallet/transactions`, {
      params: filter,
    });
    const payload = (response.data ?? {}) as { items?: unknown[] };
    const items = Array.isArray(payload.items) ? payload.items : [];

    return {
      items: items.map((entry, index) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        const amount = Number(row.amount ?? 0);
        const createdAtRaw = row.createdAt ?? row.created_at ?? new Date().toISOString();
        const payment = row.payment as Record<string, unknown> | null | undefined;

        return {
          id: String(row.id ?? row.ledger_id ?? `ledger_${index}`),
          walletAccountId: String(row.walletAccountId ?? row.wallet_id ?? ""),
          type: toLedgerType(row.type ?? row.entry_type),
          status: toPaymentStatus(row.status ?? payment?.status),
          direction: toLedgerDirection(row.direction),
          amount: Number.isFinite(amount) ? amount : 0,
          balanceAfter: Number(row.balanceAfter ?? row.balance_after ?? 0) || 0,
          description: String(row.description ?? ""),
          referenceType: undefined,
          referenceId: row.referenceId != null ? String(row.referenceId) : row.source_id != null ? String(row.source_id) : undefined,
          paymentMethodType: "WALLET",
          createdAt: String(createdAtRaw),
        };
      }),
    };
  },

  createTopUp: async (payload: CreateTopUpRequest): Promise<CreateTopUpResponse> => {
    // Map paymentMethodId sang gateway_name server nhận ("momo", "sepay", "mock", ...)
    const idLower = String(payload.paymentMethodId).toLowerCase();
    const gatewayName = idLower.includes("momo") ? "momo" : idLower.includes("sepay") ? "sepay" : String(payload.paymentMethodId);

    const response = await apiClient.post<Record<string, unknown>>(`${APP_CONFIG.customerApiPrefix}/wallet/topup/create-payment`, {
      amount: payload.amount,
      gateway_name: gatewayName,
    });

    const data = (response.data ?? {}) as Record<string, unknown>;
    return {
      paymentId: String(data.payment_id ?? data.paymentId ?? ""),
      status: toPaymentStatus(data.payment_status ?? data.status),
      redirectUrl: data.redirect_url ? String(data.redirect_url) : undefined,
    };
  },

  getBookingPaymentSummary: async (params: { bookingId?: string; rentalBookingId?: string }): Promise<BookingPaymentSummary> => {
    const query = params.bookingId ? `bookingId=${params.bookingId}` : `rentalBookingId=${params.rentalBookingId}`;
    const response = await apiClient.get<BookingPaymentSummary>(`${APP_CONFIG.customerApiPrefix}/payments/${query}`);
    return response.data;
  },

  payBooking: async (payload: BookingPaymentRequest): Promise<BookingPaymentResponse> => {
    const idLowerPay = String(payload.paymentMethodId ?? "").toLowerCase();
    const isMomo = idLowerPay.includes("momo");
    const isSepay = idLowerPay.includes("sepay");
    const isGateway = isMomo || isSepay;
    const requestBody: Record<string, unknown> = {
      payment_type: isGateway ? 3 : 2,
    };
    if (isMomo) requestBody.gateway_name = "momo";
    if (isSepay) requestBody.gateway_name = "sepay";

    const response = await apiClient.post<Record<string, unknown>>(
      payload.bookingId
        ? `${APP_CONFIG.customerApiPrefix}/payments/ride/${payload.bookingId}/pay`
        : `${APP_CONFIG.customerApiPrefix}/payments/rental/${payload.rentalBookingId}/pay`,
      requestBody,
    );

    const data = (response.data ?? {}) as Record<string, unknown>;
    return {
      paymentId: String(data.payment_id ?? ""),
      status: toPaymentStatus(data.status),
      redirectUrl: data.redirect_url ? String(data.redirect_url) : undefined,
    };
  },

  payDeposit: async (rentalBookingId: string): Promise<{ payment_id: number | null; rental_id: number; status: string; amount: number; wallet_balance_after: number | null }> => {
    const response = await apiClient.post<Record<string, unknown>>(
      `${APP_CONFIG.customerApiPrefix}/payments/rental/${rentalBookingId}/pay-deposit`,
    );
    const data = (response.data ?? {}) as Record<string, unknown>;
    return {
      payment_id: data.payment_id != null ? Number(data.payment_id) : null,
      rental_id: Number(data.rental_id ?? 0),
      status: String(data.status ?? "deposit_paid"),
      amount: toNumber(data.amount, 0),
      wallet_balance_after: data.wallet_balance_after != null ? toNumber(data.wallet_balance_after, 0) : null,
    };
  },

  retryPayment: async (payload: RetryPaymentRequest): Promise<RetryPaymentResponse> => {
    const response = await apiClient.post<RetryPaymentResponse>(`${APP_CONFIG.customerApiPrefix}/payments/${payload.paymentId}/retry`);
    return response.data;
  },

  requestWithdrawal: async (payload: WithdrawalRequestPayload): Promise<WithdrawalRequestResponse> => {
    const response = await apiClient.post<WithdrawalRequestResponse>(`${APP_CONFIG.customerApiPrefix}/wallet/withdrawals`, {
      amount: payload.amount,
      bank_account_id: 1,
      note: payload.note,
    });
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
