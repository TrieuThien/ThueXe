export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryPressed: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  badgeText: string;
}

export interface AppTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  typography: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    bodySmall: number;
    caption: number;
  };
}

const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  typography: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 16,
    bodySmall: 14,
    caption: 12,
  },
};

export const lightTheme: AppTheme = {
  mode: "light",
  ...baseTheme,
  colors: {
    background: "#F3F6FB",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF3FA",
    primary: "#0A84FF",
    primaryPressed: "#0069D9",
    secondary: "#06B6D4",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#E2E8F0",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    badgeText: "#FFFFFF",
  },
};

export const darkTheme: AppTheme = {
  mode: "dark",
  ...baseTheme,
  colors: {
    background: "#0B1220",
    surface: "#111B2E",
    surfaceMuted: "#1A2740",
    primary: "#3B9BFF",
    primaryPressed: "#257FE0",
    secondary: "#22D3EE",
    text: "#E2E8F0",
    textMuted: "#94A3B8",
    border: "#273449",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#F87171",
    badgeText: "#FFFFFF",
  },
};
