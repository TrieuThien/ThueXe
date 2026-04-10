import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MainLayout } from '../../layouts/MainLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { useRentalBookingDetailQuery } from '../../hooks/useDriverScheduleQueries';
import type { WorkStackParamList } from '../../types/navigation';
import { formatCurrency, formatDateTime } from '../../utils/format';

type DetailRoute = RouteProp<WorkStackParamList, 'RentalBookingDetail'>;

export const RentalBookingDetailScreen = () => {
  const route = useRoute<DetailRoute>();
  const bookingId = route.params.bookingId;
  const bookingQuery = useRentalBookingDetailQuery(bookingId);

  if (bookingQuery.isLoading) {
    return <LoadingState label="Đang tải chi tiết..." />;
  }

  if (bookingQuery.isError) {
    return <ErrorState title="Không tải được chi tiết" onRetry={() => bookingQuery.refetch()} />;
  }

  if (!bookingQuery.data) {
    return <EmptyState title="Không tìm thấy" description="Chuyến đi không tồn tại hoặc đã bị hủy." />;
  }

  const booking = bookingQuery.data;

  return (
    <MainLayout title="Chi tiết đơn cho thuê">
      <View style={styles.card}>
        <Text style={styles.code}>{booking.bookingCode}</Text>
        <Text style={styles.row}>Khách hàng: {booking.customerName}</Text>
        <Text style={styles.row}>Điện thoại: {booking.customerPhone}</Text>
        <Text style={styles.row}>Trạng thái: {booking.status}</Text>
        <Text style={styles.row}>Bắt đầu: {formatDateTime(booking.startAt)}</Text>
        <Text style={styles.row}>Kết thúc: {formatDateTime(booking.endAt)}</Text>
        <Text style={styles.row}>Tổng giờ: {booking.totalHours} giờ</Text>
        <Text style={styles.row}>Giá trị: {formatCurrency(booking.totalPrice)}</Text>
        <Text style={styles.row}>Điểm đón: {booking.pickupAddress}</Text>
        <Text style={styles.row}>Điểm trả: {booking.dropoffAddress}</Text>
        {booking.note ? <Text style={styles.note}>Ghi chú: {booking.note}</Text> : null}
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8
  },
  code: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 18
  },
  row: {
    color: '#1E293B',
    fontSize: 14
  },
  note: {
    color: '#475569',
    fontSize: 13
  }
});
