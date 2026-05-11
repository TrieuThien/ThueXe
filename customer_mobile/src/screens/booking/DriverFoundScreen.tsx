/**
 * DriverFoundScreen.tsx
 *
 * Hiển thị thông tin tài xế sau khi được match thành công.
 * Poll vị trí GPS tài xế mỗi 10s để cập nhật bản đồ.
 * Route: DriverFound
 */

import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { driverHireApi, DriverHireBookingDetail } from '../../services/api/modules/driverHireApi';

interface Props {
  route: {
    params: {
      bookingId: number;
      booking: DriverHireBookingDetail;
    };
  };
  navigation: any;
}

function secondsAgo(isoStr?: string): string {
  if (!isoStr) return '';
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  return `${Math.floor(diff / 60)}p trước`;
}

function DriverMap({ lat, lng, updatedAt }: { lat: number; lng: number; updatedAt?: string }) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.mapWrap, styles.webFallback]}>
        <Text style={styles.webCoords}>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        {updatedAt ? <Text style={styles.mapUpdated}>Cập nhật {secondsAgo(updatedAt)}</Text> : null}
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps') as { default: any; Marker: any };
  const MapView = maps.default;
  const Marker = maps.Marker;

  return (
    <View style={styles.mapWrap}>
      <MapView
        style={styles.map}
        region={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title="Tài xế"
        />
      </MapView>
      {updatedAt ? (
        <View style={styles.mapBadge}>
          <Text style={styles.mapUpdated}>Cập nhật {secondsAgo(updatedAt)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function DriverFoundScreen({ route, navigation }: Props) {
  const { bookingId, booking } = route.params;
  const driver = booking.driver;

  const { data: liveBooking } = useQuery({
    queryKey: ['driverHire', 'status', bookingId],
    queryFn: () => driverHireApi.getStatus(bookingId),
    refetchInterval: 10_000,
  });

  const driverLat = liveBooking?.driver?.current_lat ?? driver?.current_lat;
  const driverLng = liveBooking?.driver?.current_lng ?? driver?.current_lng;
  const hasLocation = driverLat != null && driverLng != null;

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

      {/* Live map */}
      {hasLocation ? (
        <DriverMap
          lat={driverLat!}
          lng={driverLng!}
          updatedAt={liveBooking?.updated_at}
        />
      ) : (
        <View style={[styles.mapWrap, styles.noLocationBox]}>
          <Text style={styles.noLocationText}>Chưa có vị trí tài xế</Text>
        </View>
      )}

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
  content:    { padding: 20, paddingBottom: 48, gap: 16 },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
  },
  successIcon:  { fontSize: 48, color: '#10B981', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#065F46' },
  successSub:   { fontSize: 14, color: '#047857', marginTop: 4 },

  mapWrap: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  mapBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mapUpdated: { fontSize: 11, color: '#FFFFFF' },
  webFallback: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  webCoords:     { fontSize: 13, color: '#334155', fontWeight: '600' },
  noLocationBox: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLocationText: { fontSize: 14, color: '#9CA3AF' },

  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
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
