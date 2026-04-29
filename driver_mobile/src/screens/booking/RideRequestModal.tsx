/**
 * RideRequestModal.tsx
 *
 * Popup xuất hiện khi có cuốc xe mới được dispatch đến tài xế.
 * Hiển thị: điểm đón | điểm đến | khoảng cách | giá ước tính | countdown 30s
 * Nút: [Nhận] [Từ chối]
 *
 * Render ở root layout (cùng cấp DashboardScreen), hiển thị khi SSE nhận NEW_RIDE_REQUEST.
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
import { apiClient } from '../../services/api/client';

const TIMEOUT_SECONDS = 30;

export interface RideRequest {
  allocation_id: number;
  booking_id:    number;
  expires_at:    string;
  timeout_sec:   number;
  pickup: {
    lat:         number;
    lng:         number;
    distance_km: number;
  };
  // Fields fetched after receiving the event (optional preview)
  pickup_address?:  string;
  dropoff_address?: string;
  estimated_cost?:  number;
}

interface Props {
  request: RideRequest | null;
  onClose: () => void;
}

export default function RideRequestModal({ request, onClose }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const [loading, setLoading]         = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!request) return;

    const totalMs = request.timeout_sec * 1000;
    const remaining = Math.max(
      0,
      Math.round((new Date(request.expires_at).getTime() - Date.now()) / 1000)
    );

    setSecondsLeft(remaining);
    progressAnim.setValue(remaining / request.timeout_sec);

    Vibration.vibrate([0, 400, 200, 400]);

    Animated.timing(progressAnim, {
      toValue:         0,
      duration:        remaining * 1000,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      Vibration.cancel();
    };
  }, [request?.allocation_id]);

  const handleAccept = useCallback(async () => {
    if (!request || loading) return;
    setLoading(true);
    try {
      await apiClient.post(`/api/driver/bookings/${request.booking_id}/accept`);
      onClose();
    } catch (err: any) {
      // If already responded, just close
      onClose();
    }
  }, [request, loading, onClose]);

  const handleReject = useCallback(async () => {
    if (!request || loading) return;
    setLoading(true);
    try {
      await apiClient.post(`/api/driver/bookings/${request.booking_id}/reject`);
    } finally {
      onClose();
    }
  }, [request, loading, onClose]);

  const formatCurrency = (n?: number) =>
    n != null
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
      : '—';

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Timer bar */}
          <View style={styles.timerTrack}>
            <Animated.View style={[styles.timerFill, { width: progressWidth }]} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Cuốc xe mới!</Text>
            <Text style={styles.timer}>{secondsLeft}s</Text>
          </View>

          <View style={styles.body}>
            <InfoRow label="Khoảng cách" value={`${request?.pickup.distance_km?.toFixed(1) ?? '—'} km`} />
            {request?.pickup_address  && <InfoRow label="Điểm đón"  value={request.pickup_address} />}
            {request?.dropoff_address && <InfoRow label="Điểm đến" value={request.dropoff_address} />}
            {request?.estimated_cost != null && (
              <InfoRow label="Giá ước tính" value={formatCurrency(request.estimated_cost)} highlight />
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.rejectBtn]}
              onPress={handleReject}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.rejectText}>Từ chối</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={handleAccept}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptText}>Nhận chuyến</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent:  'flex-end',
  },
  card: {
    backgroundColor:  '#FFFFFF',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingBottom:    32,
    overflow:         'hidden',
  },
  timerTrack: {
    height:          4,
    backgroundColor: '#E5E7EB',
  },
  timerFill: {
    height:          4,
    backgroundColor: '#F59E0B',
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        20,
    paddingBottom:  8,
  },
  title: {
    fontSize:   20,
    fontWeight: '800',
    color:      '#111827',
  },
  timer: {
    fontSize:   18,
    fontWeight: '700',
    color:      '#F59E0B',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom:     16,
  },
  infoRow: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    paddingVertical:  8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel:          { color: '#6B7280', fontSize: 14, flex: 1 },
  infoValue:          { color: '#111827', fontSize: 14, fontWeight: '600', flex: 2, textAlign: 'right' },
  infoValueHighlight: { color: '#F59E0B', fontSize: 16 },
  actions: {
    flexDirection:  'row',
    gap:            12,
    paddingHorizontal: 20,
    marginTop:      8,
  },
  btn: {
    flex:           1,
    paddingVertical: 14,
    borderRadius:   12,
    alignItems:     'center',
  },
  rejectBtn:  { backgroundColor: '#FEE2E2' },
  acceptBtn:  { backgroundColor: '#F59E0B' },
  rejectText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  acceptText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
