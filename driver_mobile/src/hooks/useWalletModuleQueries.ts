import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { walletService } from '../services/wallet/walletService';
import type { IncomePeriod } from '../types/wallet';

export const useWalletSummaryQuery = () =>
  useQuery({ queryKey: queryKeys.walletSummary, queryFn: walletService.getWalletSummary });

export const useWalletIncomeStatsQuery = (period: IncomePeriod, fromDate?: string, toDate?: string) =>
  useQuery({
    queryKey: queryKeys.walletIncomeStats(period, fromDate, toDate),
    queryFn: () => walletService.getIncomeStats(period, { fromDate, toDate })
  });

export const useWalletTransactionsQuery = (fromDate?: string, toDate?: string) =>
  useQuery({
    queryKey: queryKeys.walletTransactions(fromDate, toDate),
    queryFn: () => walletService.getWalletTransactions({ fromDate, toDate })
  });

export const useCreateTopupPaymentMutation = () =>
  useMutation({
    mutationFn: walletService.createTopupPayment
  });

export const useTopupPaymentCallbackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletService.topupPaymentCallback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.walletSummary });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['walletIncomeStats'] });
    }
  });
};

export const usePayoutAccountQuery = () =>
  useQuery({ queryKey: queryKeys.payoutAccount, queryFn: walletService.getPayoutAccount });

export const useWithdrawalHistoryQuery = () =>
  useQuery({ queryKey: queryKeys.withdrawalHistory, queryFn: walletService.getWithdrawalHistory });

export const useCreateWithdrawalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletService.createWithdrawalRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.walletSummary });
      queryClient.invalidateQueries({ queryKey: queryKeys.withdrawalHistory });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    }
  });
};
