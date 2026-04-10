import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TripHistoryListItem } from '../../types/history';
import { formatCurrency, formatDateTime } from '../../utils/format';

const statusMap: Record<TripHistoryListItem['status'], { label: string; color: string }> = {
  hoan_thanh: { label: 'Hoàn thành', color: '#16A34A' },
  da_huy: { label: 'Đã hủy', color: '#DC2626' },
  da_tu_choi: { label: 'Đã từ chối', color: '#92400E' }
};

export const HistoryTripCard = ({ item, onPress }: { item: TripHistoryListItem; onPress: () => void }) => {
  const status = statusMap[item.status];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.rowTop}>
        <Text style={styles.code}>{item.tripCode}</Text>
        <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
      </View>
      <Text style={styles.route}>{item.pickupAddress} {'->'} {item.dropoffAddress}</Text>
      <Text style={styles.meta}>{formatDateTime(item.pickupTime)}</Text>
      <View style={styles.rowBottom}>
        <Text style={styles.fare}>{formatCurrency(item.fare)}</Text>
        <Text style={styles.income}>Thực nhận: {formatCurrency(item.netIncome)}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  code: {
    fontWeight: '800',
    color: '#0F172A'
  },
  status: {
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase'
  },
  route: {
    color: '#334155',
    fontSize: 14
  },
  meta: {
    color: '#64748B',
    fontSize: 12
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fare: {
    color: '#0F766E',
    fontWeight: '800'
  },
  income: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12
  }
});
