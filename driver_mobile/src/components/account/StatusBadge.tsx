import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AccountStatus, VerificationStatus, WorkingStatus } from '../../types/auth';

type BadgeVariant = AccountStatus | VerificationStatus | WorkingStatus;

const mapping: Record<BadgeVariant, { label: string; bg: string; color: string }> = {
  da_kich_hoat: { label: 'Đã kích hoạt', bg: '#DCFCE7', color: '#166534' },
  chua_kich_hoat: { label: 'Chưa kích hoạt', bg: '#FEE2E2', color: '#991B1B' },
  dang_cho_xac_thuc: { label: 'Đang chờ xác thực', bg: '#FEF3C7', color: '#92400E' },
  verified: { label: 'Hồ sơ đã xác minh', bg: '#DCFCE7', color: '#166534' },
  pending: { label: 'Hồ sơ đang xác minh', bg: '#FEF3C7', color: '#92400E' },
  rejected: { label: 'Hồ sơ cần bổ sung', bg: '#FEE2E2', color: '#991B1B' },
  online: { label: 'Đang nhận chuyến', bg: '#DBEAFE', color: '#1E40AF' },
  offline: { label: 'Đang tạm nghỉ', bg: '#E2E8F0', color: '#334155' },
  busy: { label: 'Đang trong chuyến', bg: '#FCE7F3', color: '#9D174D' }
};

export const StatusBadge = ({ status }: { status: BadgeVariant }) => {
  const item = mapping[status];
  return (
    <View style={[styles.badge, { backgroundColor: item.bg }]}>
      <Text style={[styles.text, { color: item.color }]}>{item.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  text: {
    fontWeight: '700',
    fontSize: 12
  }
});
