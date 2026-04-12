import { WalletAccount, WalletTransaction, WalletTransactionType } from "../types";
import { walletApi } from "./api/modules";

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTransactionType(value: unknown): WalletTransactionType {
  const normalized = String(value ?? "").toUpperCase();
  if (
    normalized === "TOP_UP" ||
    normalized === "WITHDRAW" ||
    normalized === "BOOKING_PAYMENT" ||
    normalized === "REFUND" ||
    normalized === "PROMOTION"
  ) {
    return normalized;
  }
  return "TOP_UP";
}

function extractItems(payload: unknown): any[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: any[] }).items;
  }
  return [];
}

export const walletService = {
  getWalletAccount: async (): Promise<WalletAccount> => {
    const response = await walletApi.getWallet();
    const raw = (response.data as any)?.wallet ?? response.data ?? {};

    return {
      id: String(raw.wallet_id ?? raw.id ?? ""),
      customerId: String(raw.customer_id ?? raw.customerId ?? raw.user_id ?? ""),
      balance: toNumber(raw.balance),
      currency: "VND",
      updatedAt: String(raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()),
    };
  },

  getWalletTransactions: async (): Promise<WalletTransaction[]> => {
    const response = await walletApi.getWalletTransactions({ page: 1, limit: 20 });
    const items = extractItems(response.data);

    return items.map((item) => ({
      id: String(item.id ?? item.entry_id ?? ""),
      walletAccountId: String(item.wallet_id ?? item.walletAccountId ?? ""),
      type: toTransactionType(item.type ?? item.entry_type),
      amount: toNumber(item.amount),
      balanceAfter: toNumber(item.balance_after ?? item.balanceAfter),
      description: String(item.description ?? ""),
      referenceId: item.reference_id != null ? String(item.reference_id) : item.referenceId != null ? String(item.referenceId) : undefined,
      createdAt: String(item.created_at ?? item.createdAt ?? new Date().toISOString()),
    }));
  },
};
