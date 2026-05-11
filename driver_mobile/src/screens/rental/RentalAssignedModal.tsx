/**
 * RentalAssignedModal.tsx
 *
 * Hiển thị khi admin gán tài xế vào đơn thuê.
 * Nhận data từ SSE event RENTAL_ASSIGNED_BY_ADMIN hoặc push notification tap.
 * Không cần tài xế accept/reject — chỉ thông báo và cho xem chi tiết.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { RentalAssignedNotif } from '../../hooks/useRentalAssignedNotification';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDatetime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

interface Props {
  notif: RentalAssignedNotif | null;
  onClose: () => void;
  onViewDetail: (rentalId: number) => void;
}

export default function RentalAssignedModal({ notif, onClose, onViewDetail }: Props) {
  if (!notif) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>Bạn được gán đơn thuê mới</Text>
          <Text style={styles.subTitle}>Admin đã gán bạn vào đơn thuê sau:</Text>

          <View style={styles.separator} />

          <InfoRow label="Mã đơn" value={notif.rentalCode} />
          <InfoRow label="Bắt đầu" value={formatDatetime(notif.startDatetime)} />
          <InfoRow label="Kết thúc" value={formatDatetime(notif.endDatetime)} />
          {notif.pickupAddress ? (
            <InfoRow label="Điểm đón" value={notif.pickupAddress} />
          ) : null}
          <InfoRow label="Thu nhập dự kiến" value={formatCurrency(notif.totalPrice)} highlight />

          <View style={styles.separator} />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>Để sau</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => { onViewDetail(notif.rentalId); onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  icon: { fontSize: 40, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subTitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  separator: { width: '100%', height: 1, backgroundColor: '#E2E8F0' },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: { flex: 1, fontSize: 13, color: '#64748B' },
  rowValue: { flex: 2, fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  rowValueHighlight: { color: '#F59E0B', fontSize: 15 },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  btnSecondaryText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  btnPrimary: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
