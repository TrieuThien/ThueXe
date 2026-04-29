import { AppDateTime, ID } from "./common";
import { PaymentMethodType } from "./wallet";

export type LedgerDirection = "IN" | "OUT";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type WalletLedgerType =
  | "TOP_UP"
  | "WITHDRAWAL"
  | "BOOKING_PAYMENT"
  | "RENTAL_PAYMENT"
  | "REFUND"
  | "ADJUSTMENT";

export interface WalletLedgerEntry {
  id: ID;
  walletAccountId: ID;
  type: WalletLedgerType;
  status: PaymentStatus;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType?: "BOOKING" | "RENTAL_BOOKING" | "WITHDRAWAL_REQUEST";
  referenceId?: ID;
  paymentMethodType: PaymentMethodType;
  createdAt: AppDateTime;
}

export interface WalletOverviewResponse {
  accountId: ID;
  customerId: ID;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: "VND";
  updatedAt: AppDateTime;
}

export interface WalletTransactionFilter {
  type?: WalletLedgerType | "ALL";
  status?: PaymentStatus | "ALL";
}

export interface WalletTransactionHistoryResponse {
  items: WalletLedgerEntry[];
}

export interface PaymentMethodOption {
  id: ID;
  type: PaymentMethodType;
  title: string;
  subtitle?: string;
  isDefault: boolean;
  isAvailable: boolean;
  linkedBankLabel?: string;
}

export interface BookingPaymentSummary {
  payableAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  bookingId?: ID;
  rentalBookingId?: ID;
  currency: "VND";
}

export interface CreateTopUpRequest {
  amount: number;
  paymentMethodId: ID;
}

export interface CreateTopUpResponse {
  paymentId: ID;
  status: PaymentStatus;
  redirectUrl?: string;
}

export interface RetryPaymentRequest {
  paymentId: ID;
}

export interface RetryPaymentResponse {
  paymentId: ID;
  status: PaymentStatus;
  message: string;
}

export interface WithdrawalRequestPayload {
  amount: number;
  note?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
}

export interface WithdrawalRequestResponse {
  withdrawalRequestId: ID;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: AppDateTime;
}

export interface BookingPaymentRequest {
  bookingId?: ID;
  rentalBookingId?: ID;
  paymentMethodId: ID;
}

export interface BookingPaymentResponse {
  paymentId: ID;
  status: PaymentStatus;
  redirectUrl?: string;
}

export interface SetDefaultPaymentMethodRequest {
  paymentMethodId: ID;
}

export interface SetDefaultPaymentMethodResponse {
  paymentMethodId: ID;
}
