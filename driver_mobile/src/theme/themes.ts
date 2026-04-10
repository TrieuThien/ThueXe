import { DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { palette } from '../constants/colors';

export type AppTheme = Theme & {
  custom: {
    card: string;
    mutedText: string;
    border: string;
    success: string;
    warning: string;
  };
};

export const lightTheme: AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: '#F3F6FB',
    card: palette.white,
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#DC2626'
  },
  custom: {
    card: palette.white,
    mutedText: '#64748B',
    border: '#E2E8F0',
    success: palette.success,
    warning: palette.warning
  }
};

export const darkTheme: AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#2DD4BF',
    background: '#0B1220',
    card: '#111827',
    text: '#F8FAFC',
    border: '#1F2937',
    notification: '#FB7185'
  },
  custom: {
    card: '#111827',
    mutedText: '#9CA3AF',
    border: '#1F2937',
    success: '#4ADE80',
    warning: '#FB923C'
  }
};
