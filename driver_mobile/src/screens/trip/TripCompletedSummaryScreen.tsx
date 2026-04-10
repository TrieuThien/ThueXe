import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { FareSummaryCard } from '../../components/trip';
import { useTripSummaryQuery } from '../../hooks/useCurrentTripFlow';
import type { WorkStackParamList } from '../../types/navigation';
import { formatDateTime } from '../../utils/format';

type Props = NativeStackScreenProps<WorkStackParamList, 'TripCompletedSummary'>;

export const TripCompletedSummaryScreen = ({ navigation, route }: Props) => {
  const summaryQuery = useTripSummaryQuery(route.params.tripId);

  if (summaryQuery.isLoading) {
    return <LoadingState label="Đang tải tổng quan chuyến..." />;
  }

  if (summaryQuery.isError) {
    return <ErrorState title="Không tải được tổng quan" onRetry={() => summaryQuery.refetch()} />;
  }

  if (!summaryQuery.data) {
    return <EmptyState title="Không có dữ liệu" description="Tổng quan chuyến đi không tồn tại." />;
  }

  const summary = summaryQuery.data;

  return (
    <MainLayout title="Tổng quan chuyến hoàn thành">
      <View style={styles.card}>
        <Text style={styles.title}>Chuyến #{summary.tripId}</Text>
        <Text style={styles.info}>Khách hàng: {summary.customerName}</Text>
        <Text style={styles.info}>Điểm đón: {summary.pickupAddress}</Text>
        <Text style={styles.info}>Điểm trả: {summary.dropoffAddress}</Text>
        <Text style={styles.info}>Tổng quãng đường: {summary.totalDistanceKm} km</Text>
        <Text style={styles.info}>Tổng thời gian: {summary.totalDurationMin} phút</Text>
        <Text style={styles.info}>Hoàn tất lúc: {formatDateTime(summary.completedAt)}</Text>
      </View>

      <FareSummaryCard summary={summary} />

      <AppButton title="Nhận yêu cầu mới" onPress={() => navigation.navigate('CurrentTrip')} />
      <AppButton title="Về trạng thái làm việc" onPress={() => navigation.navigate('WorkingStatus')} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    padding: 14,
    gap: 6
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534'
  },
  info: {
    color: '#334155'
  }
});
