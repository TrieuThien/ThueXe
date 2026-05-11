/**
 * DriverHireServiceSummaryScreen.tsx
 *
 * Tổng kết sau khi hoàn thành dịch vụ thuê tài xế.
 * Hiển thị: thời gian thực tế, phí thực tế, thu nhập tài xế, trạng thái TT.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { ErrorState } from '../../components/states';
import { useQuery } from '@tanstack/react-query';
import { driverHireRentalApi } from '../../services/api/driverHireRentalApi';
import type { WorkStackParamList } from '../../types/navigation';
import { formatCurrency, formatDateTime } from '../../utils/format';

type Props = NativeStackScreenProps<WorkStackParamList, 'DriverHireServiceSummary'>;

export const DriverHireServiceSummaryScreen = ({ navigation, route }: Props) => {
  const { rentalId } = route.params;

  const summaryQuery = useQuery({
    queryKey: ['driverHireSummary', rentalId],
    queryFn: () => driverHireRentalApi.getSummary(rentalId),
    staleTime: 0,
  });

  if (summaryQuery.isLoading) {
    return (
      <MainLayout title="Tổng kết dịch vụ">
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải tổng kết...</Text>
        </View>
      </MainLayout>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <MainLayout title="Tổng kết dịch vụ">
        <ErrorState
          title="Không tải được tổng kết"
          description="Vui lòng thử lại."
          onRetry={() => summaryQuery.refetch()}
        />
      </MainLayout>
    );
  }

  const s = summaryQuery.data;

  const paymentStatusLabel: Record<string, string> = {
    pending: 'Chưa thanh toán',
    deposit_paid: 'Đã đặt cọc',
    paid: 'Đã thanh toán',
  };

  return (
    <MainLayout title="Tổng kết dịch vụ" scrollable>
      {/* Thông tin booking */}
      <View style={styles.bookingCard}>
        <Text style={styles.bookingCode}>{s.rental_code}</Text>
        <Text style={styles.bookingStatus}>
          {s.status === 'completed' ? '✅ Dịch vụ hoàn thành' : s.status}
        </Text>
        <InfoRow label="Khách hàng" value={s.customer_name} />
        <InfoRow label="Điểm đón" value={s.pickup_address} />
        <InfoRow label="Bắt đầu" value={formatDateTime(s.start_datetime)} />
        {s.actual_end_datetime ? (
          <InfoRow label="Kết thúc" value={formatDateTime(s.actual_end_datetime)} />
        ) : null}
      </View>

      {/* Thời gian thực tế */}
      <View style={styles.timeCard}>
        <Text style={styles.sectionTitle}>Thời gian phục vụ</Text>
        <TimeRow label="Tổng thời gian" value={`${s.total_elapsed_min} phút`} />
        {s.total_paused_min > 0 && (
          <TimeRow label="Thời gian tạm dừng" value={`${s.total_paused_min} phút`} isDeduction />
        )}
        <TimeRow label="Thời gian tính phí" value={`${s.billable_min} phút (${s.billable_hours.toFixed(2)} giờ)`} isHighlight />
      </View>

      {/* Phí & Thu nhập */}
      <View style={styles.earningCard}>
        <Text style={styles.sectionTitle}>Phí & Thu nhập</Text>
        <FeeRow label="Giá cơ bản" value={formatCurrency(s.base_price)} />
        {s.extra_time_fee > 0 && (
          <FeeRow label="Phí thêm giờ" value={formatCurrency(s.extra_time_fee)} />
        )}
        {s.extra_distance_fee > 0 && (
          <FeeRow label="Phí thêm km" value={formatCurrency(s.extra_distance_fee)} />
        )}
        <View style={styles.divider} />
        <FeeRow label="Tổng phí" value={formatCurrency(s.actual_cost)} isBold />
        <FeeRow label="Phí platform (20%)" value={`- ${formatCurrency(s.actual_cost - s.driver_earnings)}`} isDeduction />
        <View style={styles.divider} />
        <FeeRow label="Thu nhập của bạn" value={formatCurrency(s.driver_earnings)} isHighlight />
      </View>

      {/* Trạng thái thanh toán */}
      <View style={styles.paymentBadge}>
        <Text style={styles.paymentLabel}>Trạng thái thanh toán:</Text>
        <Text style={[
          styles.paymentStatus,
          s.payment_status === 'paid' && styles.paymentPaid,
        ]}>
          {paymentStatusLabel[s.payment_status] ?? s.payment_status}
        </Text>
      </View>

      <AppButton
        title="Nhận dịch vụ mới"
        onPress={() => navigation.navigate('WorkingStatus')}
      />
      <AppButton
        title="Xem lịch làm việc"
        onPress={() => navigation.navigate('DriverSchedule')}
      />
    </MainLayout>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TimeRow({ label, value, isDeduction, isHighlight }: {
  label: string;
  value: string;
  isDeduction?: boolean;
  isHighlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[
        styles.infoValue,
        isDeduction && styles.textDeduction,
        isHighlight && styles.textHighlight,
      ]}>
        {value}
      </Text>
    </View>
  );
}

function FeeRow({ label, value, isBold, isDeduction, isHighlight }: {
  label: string;
  value: string;
  isBold?: boolean;
  isDeduction?: boolean;
  isHighlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isBold && styles.textBold]}>{label}</Text>
      <Text style={[
        styles.infoValue,
        isBold && styles.textBold,
        isDeduction && styles.textDeduction,
        isHighlight && styles.textEarning,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 80,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  bookingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    padding: 14,
    gap: 6,
  },
  bookingCode: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 16,
  },
  bookingStatus: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  timeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  earningCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  textDeduction: {
    color: '#DC2626',
  },
  textHighlight: {
    color: '#2563EB',
    fontWeight: '700',
  },
  textEarning: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 16,
  },
  textBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentStatus: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentPaid: {
    color: '#059669',
  },
});
