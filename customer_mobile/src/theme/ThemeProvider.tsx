import { createContext, useContext, useMemo } from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

import { useAppStore } from "../store/appStore";
import { AppTheme, darkTheme, lightTheme } from "./tokens";

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemMode = useNativeColorScheme();
  const selectedMode = useAppStore((state) => state.themeMode);

  const theme = useMemo(() => {
    const mode = selectedMode === "system" ? (systemMode === "dark" ? "dark" : "light") : selectedMode;
    return mode === "dark" ? darkTheme : lightTheme;
  }, [selectedMode, systemMode]);

  const value = useMemo(() => ({ theme, isDark: theme.mode === "dark" }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
