import { create } from "zustand";

import { ThemeMode } from "../theme";

interface AppState {
  themeMode: ThemeMode | "system";
  setThemeMode: (mode: ThemeMode | "system") => void;
}

export const useAppStore = create<AppState>((set) => ({
  themeMode: "system",
  setThemeMode: (mode) => set({ themeMode: mode }),
}));
