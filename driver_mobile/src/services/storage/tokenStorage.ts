import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../../types/auth';

const TOKEN_KEY = 'driver.auth.tokens';

let inMemoryTokens: AuthTokens | null = null;

export const tokenStorage = {
  async loadTokens(): Promise<AuthTokens | null> {
    if (inMemoryTokens) {
      return inMemoryTokens;
    }

    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthTokens;
      inMemoryTokens = parsed;
      return parsed;
    } catch {
      return null;
    }
  },

  async saveTokens(tokens: AuthTokens): Promise<void> {
    inMemoryTokens = tokens;
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  },

  async clearTokens(): Promise<void> {
    inMemoryTokens = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};
