import React from 'react';
import { StyleSheet, View } from 'react-native';

export const HistoryListSkeleton = () => (
  <View style={styles.wrap}>
    {Array.from({ length: 6 }).map((_, index) => (
      <View key={index} style={styles.card}>
        <View style={[styles.bar, { width: '40%' }]} />
        <View style={[styles.bar, { width: '90%' }]} />
        <View style={[styles.bar, { width: '55%' }]} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    padding: 16
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8
  },
  bar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0'
  }
});
