import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useGlobalLoading } from '../../hooks/useGlobalLoading';

export const GlobalLoader = () => {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2,6,23,0.35)'
  }
});
