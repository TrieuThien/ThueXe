import { create } from 'zustand';
import type { AuthTokens, DriverProfile } from '../types/auth';

type AuthState = {
  isAuthenticated: boolean;
  profile: DriverProfile | null;
  tokens: AuthTokens | null;
  setSession: (profile: DriverProfile, tokens: AuthTokens) => void;
  setProfile: (profile: DriverProfile) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  profile: null,
  tokens: null,
  setSession: (profile, tokens) => set({ isAuthenticated: true, profile, tokens }),
  setProfile: (profile) => set((state) => ({ profile, isAuthenticated: Boolean(state.tokens) })),
  setTokens: (tokens) => set((state) => ({ tokens, isAuthenticated: Boolean(tokens && state.profile) })),
  clearSession: () => set({ isAuthenticated: false, profile: null, tokens: null })
}));
