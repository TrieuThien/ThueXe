import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WalletTransaction } from '../../types/wallet';
import { formatCurrency, formatDateTime } from '../../utils/format';

const typeMeta: Record<WalletTransaction['type'], { label: string; color: string }> = {
  nap_tien: { label: 'Nạp tiền', color: '#2563EB' },
  thanh_toan: { label: 'Thanh toán', color: '#16A34A' },
  khau_tru: { label: 'Khấu trừ', color: '#DC2626' },
  rut_tien: { label: 'Rút tiền', color: '#EA580C' },
  hoan_tien: { label: 'Hoàn tiền', color: '#7C3AED' }
};

export const TransactionItem = ({ item }: { item: WalletTransaction }) => {
  const meta = typeMeta[item.type];

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.badge, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
      <View style={styles.rowBottom}>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.balance}>Số dư: {formatCurrency(item.balanceAfter)}</Text>
      </View>
      {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontWeight: '700',
    color: '#0F172A',
    flex: 1
  },
  badge: {
    fontSize: 12,
    fontWeight: '700'
  },
  date: {
    color: '#64748B',
    fontSize: 12
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  amount: {
    color: '#0F766E',
    fontWeight: '800'
  },
  balance: {
    color: '#334155',
    fontSize: 12
  },
  note: {
    color: '#64748B',
    fontSize: 12
  }
});
