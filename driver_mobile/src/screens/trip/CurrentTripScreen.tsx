import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import {
  CustomerInfoCard,
  FareSummaryCard,
  TripRequestCard,
  TripStatusStepper
} from '../../components/trip';
import {
  useAcceptTripMutation,
  useArrivedPickupMutation,
  useCurrentTripDetailQuery,
  useFinishTripMutation,
  useRejectTripMutation,
  useStartTripMutation,
  useUpdateTripLocationMutation
} from '../../hooks/useCurrentTripFlow';
import type { WorkStackParamList } from '../../types/navigation';

const toCountdown = (expiresAt?: string) => {
  if (!expiresAt) {
    return '00:00';
  }
  const sec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const mm = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const ss = (sec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

type Props = NativeStackScreenProps<WorkStackParamList, 'CurrentTrip'>;

export const CurrentTripScreen = ({ navigation }: Props) => {
  const currentQuery = useCurrentTripDetailQuery();
  const acceptMutation = useAcceptTripMutation();
  const rejectMutation = useRejectTripMutation();
  const arrivedMutation = useArrivedPickupMutation();
  const startMutation = useStartTripMutation();
  const locationMutation = useUpdateTripLocationMutation();
  const finishMutation = useFinishTripMutation();

  const [showDecisionSheet, setShowDecisionSheet] = useState(false);
  const [uiError, setUiError] = useState('');
  const [countdownText, setCountdownText] = useState('00:00');

  const trip = currentQuery.data;

  useEffect(() => {
    if (!trip?.expiresAt || trip.status !== 'incoming') {
      return;
    }

    setCountdownText(toCountdown(trip.expiresAt));
    const timer = setInterval(() => {
      setCountdownText(toCountdown(trip.expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [trip?.expiresAt, trip?.status]);

  useEffect(() => {
    if (trip?.status === 'incoming') {
      setShowDecisionSheet(true);
    } else {
      setShowDecisionSheet(false);
    }
  }, [trip?.status]);

  const busy = useMemo(
    () =>
      acceptMutation.isPending ||
      rejectMutation.isPending ||
      arrivedMutation.isPending ||
      startMutation.isPending ||
      finishMutation.isPending ||
      locationMutation.isPending,
    [
      acceptMutation.isPending,
      rejectMutation.isPending,
      arrivedMutation.isPending,
      startMutation.isPending,
      finishMutation.isPending,
      locationMutation.isPending
    ]
  );

  if (currentQuery.isLoading) {
    return <LoadingState label="Đang tải chuyến hiện tại..." />;
  }

  if (currentQuery.isError) {
    return <ErrorState title="Lỗi mạng" description="Không tải được chuyến hiện tại" onRetry={() => currentQuery.refetch()} />;
  }

  if (!trip) {
    return <EmptyState title="Chưa có chuyến" description="Chờ hệ thống tìm yêu cầu mới." />;
  }

  if (trip.status === 'timeout') {
    return <ErrorState title="Yêu cầu hết hạn" description="Bạn đã quá thời gian chấp nhận chuyến." onRetry={() => currentQuery.refetch()} />;
  }

  if (trip.status === 'cancelled') {
    return (
      <ErrorState
        title="Khách đã hủy chuyến"
        description={trip.cancelReason || 'Khách hàng đã hủy trước khi bắt đầu.'}
        onRetry={() => currentQuery.refetch()}
      />
    );
  }

  const onAccept = async () => {
    setUiError('');
    try {
      await acceptMutation.mutateAsync({ tripId: trip.tripId });
      await currentQuery.refetch();
    } catch {
      setUiError('Không thể chấp nhận chuyến, vui lòng thử lại.');
    }
  };

  const onReject = async () => {
    setUiError('');
    try {
      await rejectMutation.mutateAsync({ tripId: trip.tripId });
      await currentQuery.refetch();
    } catch {
      setUiError('Không thể từ chối chuyến lúc này.');
    }
  };

  const onArrived = async () => {
    setUiError('');
    try {
      await arrivedMutation.mutateAsync({ tripId: trip.tripId });
      await currentQuery.refetch();
    } catch {
      setUiError('Lỗi cập nhật đã đến điểm đón.');
    }
  };

  const onStart = async () => {
    setUiError('');
    try {
      await startMutation.mutateAsync({ tripId: trip.tripId });
      await currentQuery.refetch();
    } catch {
      setUiError('Không thể bắt đầu chuyến.');
    }
  };

  const onFinish = async () => {
    setUiError('');
    try {
      const summary = await finishMutation.mutateAsync({ tripId: trip.tripId });
      navigation.navigate('TripCompletedSummary', { tripId: summary.tripId });
    } catch {
      setUiError('Không thể kết thúc chuyến lúc này.');
    }
  };

  const onUpdateLocation = async () => {
    try {
      await locationMutation.mutateAsync({
        tripId: trip.tripId,
        lat: 10.7769 + Math.random() * 0.002,
        lng: 106.7009 + Math.random() * 0.002
      });
    } catch {
      setUiError('Lỗi mạng khi cập nhật vị trí.');
    }
  };

  return (
    <MainLayout title="Chuyến hiện tại">
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>Bản đồ điều hướng (placeholder)</Text>
        <Text style={styles.routeText}>
          {trip.pickupAddress} {'->'} {trip.dropoffAddress}
        </Text>
      </View>

      {trip.status === 'incoming' ? (
        <TripRequestCard trip={trip} countdownText={countdownText} onOpenDecision={() => setShowDecisionSheet(true)} />
      ) : null}

      <TripStatusStepper status={trip.status} />
      <CustomerInfoCard trip={trip} />
      <FareSummaryCard trip={trip} />

      <Text style={styles.meta}>Mã chuyến: {trip.tripId}</Text>
      <Text style={styles.meta}>Trạng thái thanh toán: {trip.paymentStatus}</Text>

      {trip.status === 'accepted' ? <AppButton title="Đã đến điểm đón" onPress={onArrived} loading={busy} /> : null}
      {trip.status === 'arrived_pickup' ? <AppButton title="Bắt đầu chuyến" onPress={onStart} loading={busy} /> : null}
      {trip.status === 'in_progress' ? <AppButton title="Kết thúc chuyến" onPress={onFinish} loading={busy} /> : null}

      <AppButton title="Cập nhật vị trí" onPress={onUpdateLocation} loading={locationMutation.isPending} />

      {uiError ? <ErrorState title="Có lỗi xảy ra" description={uiError} /> : null}

      <Modal visible={showDecisionSheet} transparent animationType="slide" onRequestClose={() => setShowDecisionSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Nhận chuyến</Text>
            <AppButton title="Chấp nhận chuyến" onPress={onAccept} loading={acceptMutation.isPending} />
            <AppButton title="Từ chối chuyến" onPress={onReject} loading={rejectMutation.isPending} />
            <Pressable onPress={() => setShowDecisionSheet(false)}>
              <Text style={styles.sheetClose}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    minHeight: 170,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8
  },
  mapText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A'
  },
  routeText: {
    color: '#1E40AF',
    textAlign: 'center'
  },
  meta: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600'
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end'
  },
  sheetCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  sheetClose: {
    textAlign: 'center',
    color: '#334155',
    fontWeight: '700'
  }
});
