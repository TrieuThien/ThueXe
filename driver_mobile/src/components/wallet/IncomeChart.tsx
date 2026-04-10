import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IncomePoint } from '../../types/wallet';
import { formatCurrency } from '../../utils/format';

export const IncomeChart = ({ points }: { points: IncomePoint[] }) => {
  const safePoints = Array.isArray(points) ? points : [];

  if (!safePoints.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Không có dữ liệu biểu đồ</Text>
      </View>
    );
  }

  const maxValue = Math.max(...safePoints.map((point) => point.amount), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Biểu đồ thu nhập</Text>
      <View style={styles.chartWrap}>
        {safePoints.map((point) => {
          const maxHeightPixels = 140;
          const heightPixels = Math.max(6, Math.round((point.amount / maxValue) * maxHeightPixels));
          return (
            <View key={point.label} style={styles.barGroup}>
              <View style={[styles.bar, { height: heightPixels }]} />
              <Text style={styles.barLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.hint}>Mốc cao nhất: {formatCurrency(maxValue)}</Text>
    </View>
  );
};

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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  chartWrap: {
    minHeight: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },
  bar: {
    width: 14,
    borderRadius: 7,
    backgroundColor: '#0F766E'
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B'
  },
  hint: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748B'
  }
});
