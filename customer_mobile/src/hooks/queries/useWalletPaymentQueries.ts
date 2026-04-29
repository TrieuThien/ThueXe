import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "../../constants";
import {
  BookingPaymentRequest,
  RetryPaymentRequest,
  SetDefaultPaymentMethodRequest,
  WalletTransactionFilter,
  WithdrawalRequestPayload,
} from "../../types";
import { walletPaymentQueryKeys, walletPaymentService } from "../../services/wallet/walletPaymentService";

export function useWalletOverviewQuery() {
  return useQuery({
    queryKey: walletPaymentQueryKeys.overview,
    queryFn: walletPaymentService.getWalletOverview,
  });
}

export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: walletPaymentQueryKeys.methods,
    queryFn: walletPaymentService.getPaymentMethods,
  });
}

export function useSetDefaultPaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetDefaultPaymentMethodRequest) => walletPaymentService.setDefaultPaymentMethod(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletPaymentMethods });
    },
  });
}

export function useWalletTransactionHistoryQuery(filter?: WalletTransactionFilter) {
  return useQuery({
    queryKey: walletPaymentQueryKeys.transactions(filter),
    queryFn: () => walletPaymentService.getTransactionHistory(filter),
  });
}

export function useTopUpWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletPaymentService.createTopUp,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wallet }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletTransactions }),
      ]);
    },
  });
}

export function useBookingPaymentSummaryQuery(params: { bookingId?: string; rentalBookingId?: string }) {
  return useQuery({
    queryKey: walletPaymentQueryKeys.paymentSummary(params.bookingId, params.rentalBookingId),
    queryFn: () => walletPaymentService.getBookingPaymentSummary(params),
    enabled: Boolean(params.bookingId || params.rentalBookingId),
    refetchInterval: 3000,
  });
}

export function usePayBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BookingPaymentRequest) => walletPaymentService.payBooking(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wallet }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletTransactions }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletBookingPaymentSummary }),
      ]);
    },
  });
}

export function useRetryPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RetryPaymentRequest) => walletPaymentService.retryPayment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletBookingPaymentSummary });
    },
  });
}

export function usePayRentalDepositMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rentalBookingId: string) => walletPaymentService.payDeposit(rentalBookingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wallet }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletTransactions }),
      ]);
    },
  });
}

export function useWithdrawalRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WithdrawalRequestPayload) => walletPaymentService.requestWithdrawal(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wallet }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletTransactions }),
      ]);
    },
  });
}
