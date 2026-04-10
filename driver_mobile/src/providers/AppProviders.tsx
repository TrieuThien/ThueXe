import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { RootNavigator } from '../navigation/RootNavigator';
import { GlobalLoader } from '../components/common';

export const AppProviders = () => {
  const { theme, isDark } = useAppTheme();

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 30
          }
        }
      }),
    []
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer theme={theme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootNavigator />
            <GlobalLoader />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
