import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ActiveTrip, PaymentMethod, TripSummary } from '../../types/trip';
import { formatCurrency } from '../../utils/format';

type Props = {
  trip?: ActiveTrip;
  summary?: TripSummary;
};

function getPaymentMethodLabel(method?: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'Tiền mặt';
    case 'WALLET':
      return 'Ví thuê xe';
    default:
      return 'Chưa xác định';
  }
}

export const FareSummaryCard = ({ trip, summary }: Props) => {
  const estimatedFare = trip?.estimatedFare ?? summary?.estimatedFare ?? 0;
  const actualFare = trip?.actualFare ?? summary?.actualFare;
  const paymentStatus = trip?.paymentStatus ?? summary?.paymentStatus ?? 'pending';
  const paymentMethod = trip?.paymentMethod ?? summary?.paymentMethod;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Thông tin cước phí</Text>
      <Text style={styles.info}>Giá ước tính: {formatCurrency(estimatedFare)}</Text>
      <Text style={styles.info}>Giá thực tế: {actualFare ? formatCurrency(actualFare) : 'Chưa chốt'}</Text>
      {paymentMethod && (
        <Text style={styles.paymentMethod}>
          Phương thức: {getPaymentMethodLabel(paymentMethod)}
        </Text>
      )}
      <Text style={styles.payment}>Thanh toán: {paymentStatus == 'pending' ? 'Chưa thanh toán' : 'Đã thanh toán'}</Text>
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
    gap: 6
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A'
  },
  info: {
    color: '#334155'
  },
  paymentMethod: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 4
  },
  payment: {
    color: '#0F766E',
    fontWeight: '700'
  }
});

