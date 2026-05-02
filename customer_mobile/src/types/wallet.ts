import { AppDateTime, ID } from "./common";

export type PaymentMethodType = "WALLET" | "CASH" | "BANK_CARD" | "MOMO" | "ZALOPAY" | "SEPAY";

export interface PaymentMethod {
  id: ID;
  type: PaymentMethodType;
  displayName: string;
  isDefault: boolean;
  metadata?: Record<string, string>;
}

export interface WalletAccount {
  id: ID;
  customerId: ID;
  balance: number;
  currency: "VND";
  updatedAt: AppDateTime;
}

export type WalletTransactionType =
  | "TOP_UP"
  | "WITHDRAW"
  | "BOOKING_PAYMENT"
  | "REFUND"
  | "PROMOTION";

export interface WalletTransaction {
  id: ID;
  walletAccountId: ID;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: ID;
  createdAt: AppDateTime;
}
