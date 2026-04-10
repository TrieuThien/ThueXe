import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { User } from "../types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (params: { accessToken: string; refreshToken: string; user: User }) => void;
  setProfile: (user: User) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHydrated: (value) => set({ hasHydrated: value }),
      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          currentUser: user,
          isAuthenticated: true,
        }),
      setProfile: (user) => set({ currentUser: user }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          currentUser: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "thuexe-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
