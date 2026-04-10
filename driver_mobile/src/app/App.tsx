import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from '../providers/AppProviders';
import { useBootstrapApp } from '../hooks/useBootstrapApp';
import { useUiStore } from '../store/uiStore';

void SplashScreen.preventAutoHideAsync();

export default function DriverApp() {
  useBootstrapApp();
  const bootstrapping = useUiStore((state) => state.bootstrapping);

  useEffect(() => {
    if (!bootstrapping) {
      void SplashScreen.hideAsync();
    }
  }, [bootstrapping]);

  return <AppProviders />;
}
