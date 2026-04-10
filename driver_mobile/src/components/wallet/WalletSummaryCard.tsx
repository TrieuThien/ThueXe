import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WalletSummary } from '../../types/wallet';
import { formatCurrency } from '../../utils/format';

export const WalletSummaryCard = ({ summary }: { summary: WalletSummary }) => (
  <View style={styles.card}>
    <Text style={styles.title}>Tổng quan ví</Text>
    <Text style={styles.balance}>{formatCurrency(summary.currentBalance)}</Text>
    <View style={styles.grid}>
      <View style={styles.item}>
        <Text style={styles.label}>Hôm nay</Text>
        <Text style={styles.value}>{formatCurrency(summary.todayIncome)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Tháng này</Text>
        <Text style={styles.value}>{formatCurrency(summary.monthIncome)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Chuyến hoàn thành</Text>
        <Text style={styles.value}>{summary.completedTrips}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10
  },
  title: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 16
  },
  balance: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 30
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  item: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    padding: 8,
    gap: 4
  },
  label: {
    color: '#4B5563',
    fontSize: 12
  },
  value: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 13
  }
});
