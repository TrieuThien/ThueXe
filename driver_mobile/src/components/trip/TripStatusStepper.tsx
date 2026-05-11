import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TripFlowStatus } from '../../types/trip';

const STEP_MAP: Record<TripFlowStatus, number> = {
  incoming: 0,
  accepted: 1,
  arrived_pickup: 2,
  in_progress: 3,
  completed: 4,
  timeout: 0,
  cancelled: 0
};

const STEPS = ['Nhận yêu cầu', 'Đã nhận', 'Đã đến điểm đón', 'Đang di chuyển', 'Hoàn tất'];

export const TripStatusStepper = ({ status }: { status: TripFlowStatus }) => {
  const current = STEP_MAP[status];

  return (
    <View style={styles.wrap}>
      {STEPS.map((step, index) => {
        const active = index <= current;
        return (
          <View key={`step-${index}`} style={styles.row}>
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.label, active && styles.labelActive]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 10,
    gap: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8'
  },
  dotActive: {
    backgroundColor: '#2563EB'
  },
  label: {
    color: '#64748B'
  },
  labelActive: {
    color: '#1E40AF',
    fontWeight: '700'
  }
});
