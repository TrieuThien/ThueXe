/**
 * ScheduleScreen.tsx
 *
 * Lịch làm việc tài xế: hôm nay / ngày mai / tuần này.
 * Lấy dữ liệu từ GET /api/driver/rental/bookings
 * Route: /driver/schedule
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';

type TabKey = 'today' | 'tomorrow' | 'week';

interface ScheduleBooking {
  rental_id: number;
  rental_code: string;
  user_name: string | null;
  user_phone: string | null;
  pickup_address: string;
  package_name: string | null;
  service_type: number;
  start_datetime: string;
  end_datetime: string;
  status: string;
  total_price: number;
}

const TAB_LABELS: Record<TabKey, string> = {
  today:    'Hôm nay',
  tomorrow: 'Ngày mai',
  week:     'Tuần này',
};

function getDateRange(tab: TabKey): { fromDate: string; toDate: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (tab === 'today') {
    const today = fmt(now);
    return { fromDate: today, toDate: today };
  }
  if (tab === 'tomorrow') {
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const tomorrowStr = fmt(tom);
    return { fromDate: tomorrowStr, toDate: tomorrowStr };
  }
  // week: từ hôm nay đến +6 ngày
  const end = new Date(now);
  end.setDate(end.getDate() + 6);
  return { fromDate: fmt(now), toDate: fmt(end) };
}

async function fetchSchedule(tab: TabKey): Promise<ScheduleBooking[]> {
  const { fromDate, toDate } = getDateRange(tab);
  const res = await apiClient.get('/api/driver/rental/bookings', {
    params: { fromDate, toDate, limit: 50 },
  });
  return res.data.data.items ?? [];
}

export default function ScheduleScreen() {
  const [tab, setTab] = useState<TabKey>('today');

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['driver', 'schedule', tab],
    queryFn: () => fetchSchedule(tab),
  });

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {TAB_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.rental_id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />
          }
          renderItem={({ item }) => <BookingCard booking={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Không có lịch nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function BookingCard({ booking }: { booking: ScheduleBooking }) {
  const statusColor = STATUS_COLORS[booking.status] ?? '#6B7280';
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status;
  const startTime   = formatTime(booking.start_datetime);
  const endTime     = formatTime(booking.end_datetime);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.timeBlock}>
          <Text style={styles.startTime}>{startTime}</Text>
          <Text style={styles.endTime}>→ {endTime}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.customerName}>{booking.user_name ?? 'Khách hàng'}</Text>
      {booking.user_phone && (
        <Text style={styles.customerPhone}>📞 {booking.user_phone}</Text>
      )}
      <Text style={styles.address} numberOfLines={2}>
        📍 {booking.pickup_address}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.packageName}>{booking.package_name ?? '—'}</Text>
        <Text style={styles.price}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_price)}
        </Text>
      </View>
    </View>
  );
}

function formatTime(datetime: string): string {
  try {
    return new Date(datetime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return datetime;
  }
}

const STATUS_LABELS: Record<string, string> = {
  scheduled:   'Đã đặt',
  pending:     'Chờ bắt đầu',
  in_progress: 'Đang chạy',
  completed:   'Hoàn thành',
  cancelled:   'Đã hủy',
};
const STATUS_COLORS: Record<string, string> = {
  scheduled:   '#3B82F6',
  pending:     '#F59E0B',
  in_progress: '#10B981',
  completed:   '#6B7280',
  cancelled:   '#EF4444',
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  tabBar:     { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  tabActive:     { backgroundColor: '#FEF3C7' },
  tabText:       { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#92400E' },
  list:          { padding: 16, paddingBottom: 32 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:     { color: '#9CA3AF', fontSize: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  timeBlock:     {},
  startTime:     { fontSize: 18, fontWeight: '800', color: '#111827' },
  endTime:       { fontSize: 13, color: '#6B7280' },
  statusBadge:   { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  statusText:    { fontSize: 12, fontWeight: '700' },
  customerName:  { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  customerPhone: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  address:       { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 10 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageName:   { fontSize: 13, color: '#6B7280' },
  price:         { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
});
