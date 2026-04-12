import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { walletApi } from "../../services";

export function useWallet() {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.wallet.overview(),
    queryFn: walletApi.getWallet,
  });

  const transactionsQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.wallet.transactions(),
    queryFn: () => walletApi.getWalletTransactions({ page: 1, limit: 20 }),
  });

  const topUpMutation = useMutation({
    mutationFn: walletApi.topUp,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.wallet.overview() }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] }),
      ]);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: walletApi.withdraw,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.wallet.overview() }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "withdrawals"] }),
      ]);
    },
  });

  return {
    walletQuery,
    transactionsQuery,
    topUpMutation,
    withdrawMutation,
  };
}
