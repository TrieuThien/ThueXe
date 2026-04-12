import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { User } from "../types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userProfile: User | null;
  currentUser: User | null;
  currentBooking: Record<string, unknown> | null;
  currentRental: Record<string, unknown> | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (params: { accessToken: string; refreshToken: string; user: User }) => void;
  setTokens: (params: { accessToken: string; refreshToken: string | null }) => void;
  setProfile: (user: User) => void;
  setCurrentBooking: (booking: Record<string, unknown> | null) => void;
  setCurrentRental: (rental: Record<string, unknown> | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userProfile: null,
      currentUser: null,
      currentBooking: null,
      currentRental: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHydrated: (value) => set({ hasHydrated: value }),
      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          userProfile: user,
          currentUser: user,
          isAuthenticated: true,
        }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(accessToken),
        }),
      setProfile: (user) => set({ userProfile: user, currentUser: user }),
      setCurrentBooking: (booking) => set({ currentBooking: booking }),
      setCurrentRental: (rental) => set({ currentRental: rental }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userProfile: null,
          currentUser: null,
          currentBooking: null,
          currentRental: null,
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
        userProfile: state.userProfile,
        currentUser: state.currentUser,
        currentBooking: state.currentBooking,
        currentRental: state.currentRental,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
