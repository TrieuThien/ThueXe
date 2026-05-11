/**
 * DriverHireActiveServiceScreen.tsx
 *
 * Màn hình quản lý dịch vụ thuê tài xế đang thực hiện.
 * Luồng trạng thái:
 *   pending → arrived (notify only) → start → in_progress → [pause/resume] → complete
 *
 * Lưu ý: trạng thái 'arrived' chỉ là local UI state, không đổi DB status.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { ErrorState } from '../../components/states';
import { driverHireRentalApi } from '../../services/api/driverHireRentalApi';
import { driverScheduleService } from '../../services/schedule/driverScheduleService';
import type { WorkStackParamList } from '../../types/navigation';
import { formatCurrency, formatDateTime } from '../../utils/format';

type Props = NativeStackScreenProps<WorkStackParamList, 'DriverHireActiveService'>;

type ServicePhase = 'going_to_pickup' | 'arrived_waiting' | 'in_progress' | 'paused';

const pad = (n: number) => String(n).padStart(2, '0');

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export const DriverHireActiveServiceScreen = ({ navigation, route }: Props) => {
  const {
    rentalId,
    bookingCode,
    customerName,
    pickupAddress,
    pickupLat,
    pickupLng,
    durationHours,
  } = route.params;

  const [phase, setPhase] = useState<ServicePhase>('going_to_pickup');
  const [serviceStartMs, setServiceStartMs] = useState<number>(0);
  const [pauseStartMs, setPauseStartMs] = useState<number>(0);
  const [totalPausedMs, setTotalPausedMs] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState('');
  const [bookingDetail, setBookingDetail] = useState<{
    totalPrice: number;
    startAt: string;
    endAt: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load booking detail for price info
  useEffect(() => {
    driverScheduleService.getRentalBookingDetail(rentalId).then((detail) => {
      setBookingDetail({
        totalPrice: detail.totalPrice,
        startAt: detail.startAt,
        endAt: detail.endAt,
      });
    }).catch(() => {});
  }, [rentalId]);

  // Timer: tính thời gian billable khi đang in_progress (không tính pause)
  useEffect(() => {
    if (phase === 'in_progress' && serviceStartMs > 0) {
      timerRef.current = setInterval(() => {
        const billable = Date.now() - serviceStartMs - totalPausedMs;
        setElapsed(billable);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, serviceStartMs, totalPausedMs]);

  const openNavigation = useCallback(() => {
    if (pickupLat == null || pickupLng == null) return;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${pickupLat},${pickupLng}&directionsmode=driving`,
      android: `google.navigation:q=${pickupLat},${pickupLng}&mode=d`,
    }) ?? `https://maps.google.com/maps?daddr=${pickupLat},${pickupLng}`;
    Linking.canOpenURL(url).then((supported) => {
      const fallback = `https://maps.google.com/maps?daddr=${pickupLat},${pickupLng}`;
      Linking.openURL(supported ? url : fallback);
    });
  }, [pickupLat, pickupLng]);

  const handleArrived = useCallback(async () => {
    setUiError('');
    setLoading(true);
    try {
      await driverHireRentalApi.arrivedAtPickup(rentalId);
      setPhase('arrived_waiting');
    } catch {
      setUiError('Không thể gửi thông báo đã đến. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  const handleStart = useCallback(async () => {
    setUiError('');
    setLoading(true);
    try {
      await driverHireRentalApi.startService(rentalId);
      setServiceStartMs(Date.now());
      setPhase('in_progress');
    } catch {
      setUiError('Không thể bắt đầu dịch vụ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  const handlePause = useCallback(async () => {
    setUiError('');
    setLoading(true);
    try {
      await driverHireRentalApi.pauseService(rentalId);
      setPauseStartMs(Date.now());
      setPhase('paused');
    } catch {
      setUiError('Không thể tạm dừng dịch vụ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  const handleResume = useCallback(async () => {
    setUiError('');
    setLoading(true);
    try {
      await driverHireRentalApi.resumeService(rentalId);
      const addedMs = Date.now() - pauseStartMs;
      setTotalPausedMs((prev) => prev + addedMs);
      setPauseStartMs(0);
      setPhase('in_progress');
    } catch {
      setUiError('Không thể tiếp tục dịch vụ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [rentalId, pauseStartMs]);

  const handleEnd = useCallback(async () => {
    setUiError('');
    setLoading(true);
    try {
      await driverHireRentalApi.endService(rentalId);
      navigation.replace('DriverHireServiceSummary', { rentalId });
    } catch {
      setUiError('Không thể kết thúc dịch vụ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [rentalId, navigation]);

  const canNavigate = pickupLat != null && pickupLng != null;

  return (
    <MainLayout title="Dịch vụ đang thực hiện" scrollable>
      {/* Thông tin khách */}
      <View style={styles.card}>
        <Text style={styles.code}>{bookingCode ?? rentalId}</Text>
        <InfoRow label="Khách hàng" value={customerName ?? 'Khách hàng'} />
        <InfoRow label="Điểm đón" value={pickupAddress ?? 'Đang tải...'} />
        {durationHours ? (
          <InfoRow label="Thời gian thuê" value={`${durationHours} giờ`} />
        ) : null}
        {bookingDetail ? (
          <>
            <InfoRow label="Bắt đầu dự kiến" value={formatDateTime(bookingDetail.startAt)} />
            <InfoRow label="Giá trị" value={formatCurrency(bookingDetail.totalPrice)} />
          </>
        ) : null}
      </View>

      {/* Navigation đến điểm đón */}
      {canNavigate && (
        <TouchableOpacity style={styles.mapBtn} onPress={openNavigation} activeOpacity={0.8}>
          <Text style={styles.mapBtnText}>🗺 Mở điều hướng đến điểm đón</Text>
        </TouchableOpacity>
      )}

      {/* Timer khi đang phục vụ */}
      {(phase === 'in_progress' || phase === 'paused') && (
        <View style={[styles.timerBox, phase === 'paused' && styles.timerBoxPaused]}>
          <Text style={styles.timerLabel}>
            {phase === 'paused' ? 'Đang tạm dừng' : 'Thời gian phục vụ'}
          </Text>
          <Text style={styles.timerValue}>{formatDuration(elapsed)}</Text>
          {phase === 'paused' && (
            <Text style={styles.pausedNote}>⏸ Không tính phí trong thời gian dừng</Text>
          )}
        </View>
      )}

      {/* Trạng thái hiện tại */}
      <View style={styles.phaseRow}>
        <PhaseStep label="Đang đến" active={phase === 'going_to_pickup'} done={phase !== 'going_to_pickup'} />
        <View style={styles.phaseSep} />
        <PhaseStep label="Đã đến" active={phase === 'arrived_waiting'} done={['in_progress', 'paused'].includes(phase)} />
        <View style={styles.phaseSep} />
        <PhaseStep label="Đang phục vụ" active={phase === 'in_progress' || phase === 'paused'} done={false} />
      </View>

      {/* Action buttons theo phase */}
      {phase === 'going_to_pickup' && (
        <AppButton
          title="Đã đến điểm đón"
          onPress={handleArrived}
          loading={loading}
        />
      )}

      {phase === 'arrived_waiting' && (
        <AppButton
          title="Bắt đầu dịch vụ"
          onPress={handleStart}
          loading={loading}
        />
      )}

      {phase === 'in_progress' && (
        <>
          <AppButton
            title="⏸ Tạm dừng"
            onPress={handlePause}
            loading={loading}
          />
          <AppButton
            title="Kết thúc dịch vụ"
            onPress={handleEnd}
            loading={loading}
          />
        </>
      )}

      {phase === 'paused' && (
        <>
          <AppButton
            title="▶ Tiếp tục"
            onPress={handleResume}
            loading={loading}
          />
          <AppButton
            title="Kết thúc dịch vụ"
            onPress={handleEnd}
            loading={loading}
          />
        </>
      )}

      {uiError ? (
        <ErrorState title="Có lỗi xảy ra" description={uiError} />
      ) : null}
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

function PhaseStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <View style={styles.phaseStep}>
      <View style={[styles.phaseDot, active && styles.phaseDotActive, done && styles.phaseDotDone]} />
      <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 6,
  },
  code: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 14,
    width: 120,
  },
  infoValue: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  mapBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mapBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  timerBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  timerBoxPaused: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  timerLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  timerValue: {
    color: '#166534',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
  },
  pausedNote: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseStep: {
    alignItems: 'center',
    gap: 4,
  },
  phaseSep: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  phaseDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  phaseDotActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  phaseDotDone: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
  },
  phaseLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  phaseLabelActive: {
    color: '#1D4ED8',
  },
});
