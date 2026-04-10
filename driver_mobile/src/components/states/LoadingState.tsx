import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const LoadingState = ({ label = 'Đang tải dữ liệu...' }: { label?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#0F766E" />
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10
  },
  label: {
    color: '#64748B',
    fontSize: 14
  }
});
