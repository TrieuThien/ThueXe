/**
 * RequestModal.tsx
 *
 * Popup realtime khi có yêu cầu thuê tài xế mới.
 * Hiển thị:  điểm đón | gói | giá | khoảng cách | countdown 30s
 * Nút:       [Nhận chuyến]  [Từ chối]
 *
 * Cách dùng: render ở AppRoot, hiển thị khi socket nhận NEW_DRIVER_RENT_REQUEST.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { packagesApi } from '../../services/api/packagesApi';

const TIMEOUT_SECONDS = 30;

export interface RentRequest {
  requestId: number;
  bookingId: number;
  pickup_lat: number;
  pickup_lng: number;
  package_id: number;
  package_name?: string;
  base_price?: number;
  distance_km: number;
  expires_at: string;
}

interface Props {
  request: RentRequest | null;
  onClose: () => void;
  /** Được gọi sau khi tài xế nhấn Nhận chuyến thành công, với bookingId */
  onAccepted?: (bookingId: number) => void;
}

export default function RequestModal({ request, onClose, onAccepted }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const [loading, setLoading] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset và khởi động countdown mỗi khi có request mới
  useEffect(() => {
    if (!request) return;

    Vibration.vibrate([0, 500, 200, 500]);
    setSecondsLeft(TIMEOUT_SECONDS);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: TIMEOUT_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onClose(); // Auto close on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current!);
      progressAnim.setValue(1);
    };
  }, [request?.requestId]);

  const respond = useCallback(
    async (action: 'accept' | 'reject') => {
      if (!request || loading) return;
      setLoading(true);
      clearInterval(intervalRef.current!);
      try {
        await packagesApi.respondToRequest(request.requestId, action);
        if (action === 'accept' && onAccepted) {
          onClose();
          onAccepted(request.bookingId);
          return;
        }
      } catch {
        // Nếu timeout đã xảy ra bên server, chỉ close modal
      } finally {
        setLoading(false);
        onClose();
      }
    },
    [request, loading, onClose, onAccepted]
  );

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#EF4444', '#F59E0B', '#10B981'],
  });

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => !loading && onClose()}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Countdown bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: progressWidth, backgroundColor: progressColor }]}
            />
          </View>

          {/* Timer */}
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>Thời gian phản hồi</Text>
            <Text style={[styles.timerValue, secondsLeft <= 5 && styles.timerUrgent]}>
              {secondsLeft}s
            </Text>
          </View>

          <Text style={styles.title}>Yêu cầu thuê tài xế mới!</Text>

          {/* Package info */}
          <View style={styles.infoBox}>
            <InfoRow icon="📦" label="Gói thuê" value={request?.package_name ?? `Gói #${request?.package_id}`} />
            <InfoRow icon="📍" label="Điểm đón" value={`${request?.pickup_lat?.toFixed(5)}, ${request?.pickup_lng?.toFixed(5)}`} />
            <InfoRow icon="📏" label="Khoảng cách" value={`${request?.distance_km?.toFixed(1)} km`} />
            {request?.base_price != null && (
              <InfoRow
                icon="💰"
                label="Giá"
                value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.base_price)}
              />
            )}
          </View>

          {/* Action buttons */}
          {loading ? (
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => respond('reject')}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectText}>Từ chối</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => respond('accept')}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptText}>Nhận chuyến</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  timerLabel: { color: '#6B7280', fontSize: 14 },
  timerValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  timerUrgent: { color: '#EF4444' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon: { fontSize: 18, width: 24 },
  infoLabel: { color: '#6B7280', fontSize: 14, width: 90 },
  infoValue: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rejectText: { color: '#374151', fontSize: 16, fontWeight: '700' },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
