import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation';
import { useRentalFlowStore } from '../../store';
import { useWalletOverviewQuery } from '../../hooks';
import { driverHireApi } from '../../services/api/modules/driverHireApi';
import { AppHeader } from '../../components';

type Props = NativeStackScreenProps<BookingStackParamList, 'DriverHireConfirm'>;

type PaymentMethod = 'wallet' | 'cash';

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDatetime(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function DriverHireConfirmScreen({ route, navigation }: Props) {
  const { packageId, packageName, basePrice, depositAmount, durationHours, distanceLimitKm } = route.params;
  const criteria = useRentalFlowStore((s) => s.criteria);
  const walletQuery = useWalletOverviewQuery();
  const walletBalance = walletQuery.data?.balance ?? 0;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = basePrice + depositAmount;
  const effectiveDuration = durationHours ?? criteria?.durationHours;
  const isImmediate = criteria
    ? new Date(criteria.startAt).getTime() - Date.now() <= 15 * 60 * 1000
    : true;

  const insufficientBalance = paymentMethod === 'wallet' && walletBalance < totalAmount;
  const canConfirm = !loading && !insufficientBalance && !!criteria;

  const handleConfirm = useCallback(async () => {
    if (!criteria) return;
    const lat = criteria.pickupCoordinate?.latitude;
    const lng = criteria.pickupCoordinate?.longitude;
    if (!lat || !lng) {
      setError('Thiếu toạ độ điểm đón. Vui lòng quay lại và chọn lại vị trí.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await driverHireApi.create({
        package_id: packageId,
        booking_type: isImmediate ? 'immediate' : 'scheduled',
        schedule_time: isImmediate ? undefined : criteria.startAt,
        duration_hours: criteria.durationHours,
        pickup_address: criteria.pickupAddress,
        pickup_lat: lat,
        pickup_lng: lng,
        dropoff_address: criteria.dropoffAddress,
        payment_type: paymentMethod === 'wallet' ? 2 : 1,
      });

      if (isImmediate) {
        navigation.replace('DriverSearch', { bookingId: result.rental_id, packageName: result.package_name });
      } else {
        navigation.replace('RentalBookingSuccess', {
          bookingId: String(result.rental_id),
          status: 'PENDING',
          message: result.message,
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Không thể tạo yêu cầu. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [criteria, packageId, isImmediate, paymentMethod, navigation]);

  const handleTopUp = () => {
    (navigation.getParent() as any)?.navigate('Wallet', { screen: 'TopUpWallet' });
  };

  if (!criteria) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Xác nhận thuê tài xế" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Thiếu thông tin đặt thuê. Vui lòng quay lại.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Xác nhận thuê tài xế" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Package info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin gói thuê</Text>
          <Text style={styles.packageName}>{packageName}</Text>

          <View style={styles.metaRow}>
            {effectiveDuration ? (
              <View style={styles.chip}><Text style={styles.chipText}>⏱ {effectiveDuration}h</Text></View>
            ) : null}
            {distanceLimitKm && distanceLimitKm > 0 ? (
              <View style={styles.chip}><Text style={styles.chipText}>🚗 {distanceLimitKm} km</Text></View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá gói</Text>
            <Text style={styles.priceValue}>{formatVnd(basePrice)}</Text>
          </View>
          {depositAmount > 0 ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tiền đặt cọc</Text>
              <Text style={styles.priceValue}>{formatVnd(depositAmount)}</Text>
            </View>
          ) : null}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>{formatVnd(totalAmount)}</Text>
          </View>
        </View>

        {/* Booking info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin đặt xe</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày giờ</Text>
            <Text style={styles.infoValue}>{formatDatetime(criteria.startAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Điểm đón</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{criteria.pickupAddress}</Text>
          </View>
          {criteria.dropoffAddress ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Điểm trả</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{criteria.dropoffAddress}</Text>
            </View>
          ) : null}
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phương thức thanh toán</Text>
          <TouchableOpacity
            style={[styles.payOption, paymentMethod === 'wallet' && styles.payOptionSelected]}
            onPress={() => setPaymentMethod('wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.payOptionLeft}>
              <View style={[styles.radio, paymentMethod === 'wallet' && styles.radioSelected]} />
              <View>
                <Text style={styles.payOptionLabel}>Ví ThueXe</Text>
                <Text style={styles.payOptionSub}>
                  Số dư: <Text style={{ color: walletBalance >= totalAmount ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                    {formatVnd(walletBalance)}
                  </Text>
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payOption, paymentMethod === 'cash' && styles.payOptionSelected]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.8}
          >
            <View style={styles.payOptionLeft}>
              <View style={[styles.radio, paymentMethod === 'cash' && styles.radioSelected]} />
              <Text style={styles.payOptionLabel}>Tiền mặt</Text>
            </View>
          </TouchableOpacity>

          {paymentMethod === 'wallet' && insufficientBalance ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠ Số dư ví không đủ. Cần thêm {formatVnd(totalAmount - walletBalance)} để thanh toán.
              </Text>
              <TouchableOpacity onPress={handleTopUp} style={styles.topUpBtn}>
                <Text style={styles.topUpText}>Nạp tiền ngay</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {paymentMethod === 'wallet' && !insufficientBalance && depositAmount > 0 ? (
            <View style={styles.refundNotice}>
              <Text style={styles.refundText}>
                ✓ Tiền đặt cọc sẽ được hoàn lại tự động vào ví nếu không tìm được tài xế.
              </Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {isImmediate ? 'Xác nhận & Tìm tài xế' : 'Đặt lịch hẹn'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Chọn lại gói thuê</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { padding: 16, gap: 12, paddingBottom: 36 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  packageName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 13, color: '#374151' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  priceLabel: { fontSize: 14, color: '#6B7280' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#F59E0B' },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoLabel: { fontSize: 13, color: '#6B7280', width: 72, flexShrink: 0, paddingTop: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  payOptionSelected: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  payOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  radioSelected: { borderColor: '#F59E0B', backgroundColor: '#F59E0B' },
  payOptionLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  payOptionSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  warningText: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  topUpBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  topUpText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  refundNotice: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  refundText: { fontSize: 13, color: '#065F46', lineHeight: 18 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: '#B91C1C' },
  confirmBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmBtnDisabled: { backgroundColor: '#D1D5DB' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: '#6B7280', textDecorationLine: 'underline' },
});
