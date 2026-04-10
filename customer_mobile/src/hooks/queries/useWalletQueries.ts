import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../../constants";
import { walletService } from "../../services";

export function useWalletAccountQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.wallet,
    queryFn: walletService.getWalletAccount,
  });
}

export function useWalletTransactionsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.walletTransactions,
    queryFn: walletService.getWalletTransactions,
  });
}
