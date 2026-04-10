import { mockWalletAccount, mockWalletTransactions } from "./mock/data";
import { mockDelay } from "./mock/mockDelay";
import { WalletAccount, WalletTransaction } from "../types";

export const walletService = {
  getWalletAccount: async (): Promise<WalletAccount> => {
    await mockDelay();
    return mockWalletAccount;
  },
  getWalletTransactions: async (): Promise<WalletTransaction[]> => {
    await mockDelay();
    return mockWalletTransactions;
  },
};
