/**
 * DriverFoundScreen.tsx
 *
 * Hiển thị thông tin tài xế sau khi được match thành công.
 * Route: DriverFound
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { DriverHireBookingDetail } from '../../services/api/modules/driverHireApi';

interface Props {
  route: {
    params: {
      bookingId: number;
      booking: DriverHireBookingDetail;
    };
  };
  navigation: any;
}

export default function DriverFoundScreen({ route, navigation }: Props) {
  const { booking } = route.params;
  const driver = booking.driver;

  const callDriver = () => {
    if (driver?.phone) {
      Linking.openURL(`tel:${driver.phone}`);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDatetime = (dt: string) => {
    try {
      return new Date(dt).toLocaleString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return dt; }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success header */}
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Tài xế đã nhận chuyến!</Text>
        <Text style={styles.successSub}>Tài xế đang trên đường đến</Text>
      </View>

      {/* Driver card */}
      {driver && (
        <View style={styles.driverCard}>
          <View style={styles.driverRow}>
            {driver.photo_file ? (
              <Image source={{ uri: driver.photo_file }} style={styles.driverPhoto} />
            ) : (
              <View style={styles.driverPhotoPlaceholder}>
                <Text style={styles.driverInitial}>
                  {driver.firstname?.[0] ?? 'T'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.driverName}>
                {driver.firstname} {driver.lastname}
              </Text>
              <View style={styles.ratingRow}>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.ratingText}>{driver.driver_rating.toFixed(1)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={callDriver} activeOpacity={0.8}>
              <Text style={styles.callIcon}>📞</Text>
              <Text style={styles.callText}>Gọi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking detail */}
      <View style={styles.bookingCard}>
        <Text style={styles.sectionTitle}>Chi tiết chuyến</Text>
        <DetailRow label="Mã đặt xe" value={booking.rental_code} />
        <DetailRow label="Gói" value={booking.package_name} />
        <DetailRow label="Bắt đầu" value={formatDatetime(booking.start_datetime)} />
        <DetailRow label="Kết thúc" value={formatDatetime(booking.end_datetime)} />
        <DetailRow label="Điểm đón" value={booking.pickup_address} />
        <DetailRow label="Tổng tiền" value={formatCurrency(booking.total_price)} highlight />
      </View>

      {/* Go home button */}
      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => navigation.popToTop()}
        activeOpacity={0.8}
      >
        <Text style={styles.homeBtnText}>Về trang chủ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  content:    { padding: 20, paddingBottom: 48 },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 28,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
  },
  successIcon:  { fontSize: 48, color: '#10B981', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#065F46' },
  successSub:   { fontSize: 14, color: '#047857', marginTop: 4 },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  driverRow:   { flexDirection: 'row', alignItems: 'center' },
  driverPhoto: { width: 64, height: 64, borderRadius: 32 },
  driverPhotoPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FCD34D',
    justifyContent: 'center', alignItems: 'center',
  },
  driverInitial: { fontSize: 28, fontWeight: '700', color: '#92400E' },
  driverName:    { fontSize: 18, fontWeight: '700', color: '#111827' },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  starIcon:      { fontSize: 14 },
  ratingText:    { fontSize: 14, fontWeight: '600', color: '#374151' },
  callBtn: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  callIcon: { fontSize: 20 },
  callText: { fontSize: 12, color: '#065F46', fontWeight: '600', marginTop: 2 },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel:          { color: '#6B7280', fontSize: 14, flex: 1 },
  detailValue:          { color: '#111827', fontSize: 14, fontWeight: '600', flex: 2, textAlign: 'right' },
  detailValueHighlight: { color: '#F59E0B', fontSize: 16 },
  homeBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  homeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
