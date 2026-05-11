/**
 * DriverSearchScreen.tsx
 *
 * Màn hình tìm tài xế realtime sau khi đặt ngay (immediate).
 * Polling trạng thái mỗi 3 giây + lắng nghe socket events.
 *
 * Trạng thái hiển thị:
 *  scheduled  → "Đang tìm tài xế gần bạn..."
 *  pending    → "Tài xế đã nhận! Đang đến..." → navigate DriverFoundScreen
 *  cancelled  → "Không tìm được tài xế" / "Đã hủy"
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverHireApi } from '../../services/api/modules/driverHireApi';

interface Props {
  route: { params: { bookingId: number; packageName?: string } };
  navigation: any;
}

const POLL_INTERVAL_MS = 3000;

export function DriverSearchScreen({ route, navigation }: Props) {
  const { bookingId, packageName } = route.params;
  const queryClient = useQueryClient();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const { data: booking } = useQuery({
    queryKey: ['driverHire', 'status', bookingId],
    queryFn: () => driverHireApi.getStatus(bookingId),
    refetchInterval: (query: any) => {
      // Dừng polling khi đã gán tài xế hoặc hủy
      const booking = query.state?.data;
      if (booking && ['pending', 'in_progress', 'completed', 'cancelled'].includes(booking.status)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });

  // Handle status transitions
  useEffect(() => {
    if (!booking) return;

    if (booking.status === 'pending' || booking.status === 'in_progress') {
      navigation.replace('DriverFound', { bookingId, booking });
    } else if (booking.status === 'cancelled') {
      const reason = booking.cancel_reason ?? 'Không tìm được tài xế phù hợp.';
      Alert.alert('Không tìm được tài xế', reason, [
        { text: 'Về trang chủ', onPress: () => navigation.popToTop() },
        { text: 'Thử lại', onPress: () => navigation.goBack() },
      ]);
    }
  }, [booking?.status]);

  const cancelMutation = useMutation({
    mutationFn: () => driverHireApi.cancel(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverHire', 'status', bookingId] });
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.response?.data?.message ?? 'Không thể hủy');
    },
  });

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Hủy tìm tài xế',
      'Bạn có chắc muốn hủy tìm tài xế không?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy tìm', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    );
  }, [cancelMutation]);

  const attempts = booking?.matching_attempts ?? 0;

  return (
    <View style={styles.container}>
      {/* Animated search indicator */}
      <View style={styles.searchArea}>
        <Animated.View style={[styles.pulseOuter, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.pulseInner}>
            <Text style={styles.searchIcon}>🚗</Text>
          </View>
        </Animated.View>

        <Text style={styles.title}>Đang tìm tài xế...</Text>
        <Text style={styles.subtitle}>{packageName ?? 'Thuê tài xế'}</Text>

        <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 24 }} />

        {attempts > 0 && (
          <Text style={styles.attemptsText}>Đã liên hệ {attempts} tài xế</Text>
        )}

        <Text style={styles.hintText}>
          Hệ thống đang tìm tài xế gần bạn nhất.{'\n'}Vui lòng chờ trong giây lát...
        </Text>
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={[styles.cancelBtn, cancelMutation.isPending && styles.cancelBtnDisabled]}
        onPress={handleCancel}
        disabled={cancelMutation.isPending}
        activeOpacity={0.8}
      >
        {cancelMutation.isPending ? (
          <ActivityIndicator color="#EF4444" />
        ) : (
          <Text style={styles.cancelText}>Hủy tìm tài xế</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 48,
  },
  searchArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulseOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon:    { fontSize: 36 },
  title:         { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle:      { fontSize: 16, color: '#6B7280', marginBottom: 4 },
  attemptsText:  { fontSize: 13, color: '#9CA3AF', marginTop: 12 },
  hintText:      { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 24, lineHeight: 22 },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelText:    { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
