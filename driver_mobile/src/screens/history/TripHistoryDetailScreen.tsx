import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { EmptyState, ErrorState } from '../../components/states';
import { HistoryListSkeleton } from '../../components/history';
import { useTripHistoryDetailQuery } from '../../hooks/useTripHistoryQueries';
import type { HistoryStackParamList } from '../../types/navigation';
import { formatCurrency, formatDateTime } from '../../utils/format';

type Props = NativeStackScreenProps<HistoryStackParamList, 'TripHistoryDetail'>;

export const TripHistoryDetailScreen = ({ route }: Props) => {
  const detailQuery = useTripHistoryDetailQuery(route.params.tripId);

  if (detailQuery.isLoading) {
    return <HistoryListSkeleton />;
  }

  if (detailQuery.isError) {
    return <ErrorState title="Không tải được chi tiết chuyến" onRetry={() => detailQuery.refetch()} />;
  }

  if (!detailQuery.data) {
    return <EmptyState title="Không tìm thấy chuyến" description="Dữ liệu chi tiết không tồn tại." />;
  }

  const detail = detailQuery.data;
  return (
    <MainLayout title={`Chi tiết chuyến đi #${detail.tripCode}`} scrollable={false}>
      <View style={styles.card}>
        <Text style={styles.title}>Thông tin chung</Text>
        <Text style={styles.item}>Mã chuyến: {detail.tripCode}</Text>
        <Text style={styles.item}>Trạng thái: {detail.status}</Text>
        <Text style={styles.item}>Đơn khách: {formatDateTime(detail.pickupTime)}</Text>
        <Text style={styles.item}>Bắt đầu: {formatDateTime(detail.startTime)}</Text>
        <Text style={styles.item}>Hoàn thành: {detail.completedTime ? formatDateTime(detail.completedTime) : '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Thông tin cước phí</Text>
        <Text style={styles.item}>Quãng đường: {detail.distanceKm} km</Text>
        <Text style={styles.item}>Cước phí: {formatCurrency(detail.fare)}</Text>
        <Text style={styles.item}>Hoa hồng hệ thống: {formatCurrency(detail.systemCommission)}</Text>
        <Text style={styles.item}>Số tiền thực nhận: {formatCurrency(detail.netIncome)}</Text>
        <Text style={styles.item}>Thanh toán: {detail.paymentMethod}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Khách hàng</Text>
        <Text style={styles.item}>Tên: {detail.customer.name}</Text>
        <Text style={styles.item}>Số điện thoại: {detail.customer.phone}</Text>
        <Text style={styles.item}>Điểm đón: {detail.pickupAddress}</Text>
        <Text style={styles.item}>Điểm trả: {detail.dropoffAddress}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Timeline trạng thái</Text>
        <FlatList
          data={detail.timeline}
          keyExtractor={(item) => `timeline-${item.at}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.timelineRow}>
              <View style={styles.dot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>{item.status}</Text>
                <Text style={styles.timelineMeta}>{formatDateTime(item.at)}</Text>
                {item.note ? <Text style={styles.timelineMeta}>{item.note}</Text> : null}
              </View>
            </View>
          )}
        />
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  item: {
    color: '#334155',
    fontSize: 14
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    backgroundColor: '#0F766E'
  },
  timelineContent: {
    flex: 1,
    gap: 2
  },
  timelineStatus: {
    fontWeight: '700',
    color: '#0F172A'
  },
  timelineMeta: {
    color: '#64748B',
    fontSize: 12
  }
});
