import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/common';

export const SplashScreen = () => (
  <ScreenContainer>
    <View style={styles.container}>
      <Text style={styles.title}>ThueXe - Tài Xe</Text>
      <Text style={styles.subtitle}>Khởi tạo hệ thống...</Text>
      <ActivityIndicator size="large" color="#0F766E" />
    </View>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A'
  },
  subtitle: {
    color: '#64748B'
  }
});
