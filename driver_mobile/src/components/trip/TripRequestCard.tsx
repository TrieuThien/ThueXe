import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ActiveTrip } from '../../types/trip';
import { AppButton } from '../common';
import { formatCurrency } from '../../utils/format';

type Props = {
  trip: ActiveTrip;
  countdownText: string;
  onOpenDecision: () => void;
};

export const TripRequestCard = ({ trip, countdownText, onOpenDecision }: Props) => (
  <View style={styles.card}>
    <Text style={styles.title}>Yêu cầu chuyến mới #{trip.tripId}</Text>
    <Text style={styles.info}>Khách hàng: {trip.customerName}</Text>
    <Text style={styles.info}>Điểm đón: {trip.pickupAddress}</Text>
    <Text style={styles.info}>Điểm trả: {trip.dropoffAddress}</Text>
    <Text style={styles.info}>Ước tính: {trip.estimatedDistanceKm} km - {trip.estimatedDurationMin} phút</Text>
    <Text style={styles.fare}>{formatCurrency(trip.estimatedFare)}</Text>
    <Text style={styles.countdown}>Tự động timeout sau: {countdownText}</Text>
    <AppButton title="Xem lựa chọn chấp nhận / từ chối" onPress={onOpenDecision} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    padding: 14,
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E'
  },
  info: {
    color: '#334155'
  },
  fare: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F766E'
  },
  countdown: {
    color: '#B45309',
    fontWeight: '700'
  }
});
