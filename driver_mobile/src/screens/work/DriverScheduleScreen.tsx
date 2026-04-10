import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import {
  useCreateUnavailableSlotMutation,
  useDriverScheduleQuery,
  useUpdateDriverScheduleSlotMutation
} from '../../hooks/useDriverScheduleQueries';
import type { DriverScheduleSlot, ScheduleViewMode } from '../../types/schedule';
import type { WorkStackParamList } from '../../types/navigation';
import { formatDateTime } from '../../utils/format';

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

type TimeRange = {
  startHour: number;
  endHour: number;
  status: 'available' | 'booked' | 'unavailable';
  slot?: DriverScheduleSlot;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const findSlotAtHour = (slots: DriverScheduleSlot[], hour: number) => {
  const candidates = slots.filter((slot) => {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    return start.getHours() <= hour && end.getHours() > hour;
  });

  const booked = candidates.find((item) => item.status === 'booked');
  if (booked) {
    return booked;
  }

  const unavailable = candidates.find((item) => item.status === 'unavailable');
  if (unavailable) {
    return unavailable;
  }

  return candidates[0];
};

const groupTimeRanges = (slots: DriverScheduleSlot[]): TimeRange[] => {
  const ranges: TimeRange[] = [];
  let currentHour = 0;
  let currentStatus: 'available' | 'booked' | 'unavailable' = 'available';
  let currentSlot: DriverScheduleSlot | undefined;
  let rangeStart = 0;

  for (let hour = 0; hour <= 24; hour++) {
    const slot = hour < 24 ? findSlotAtHour(slots, hour) : undefined;
    const status = slot?.status || 'available';

    if (hour === 0) {
      currentStatus = status;
      currentSlot = slot;
      rangeStart = 0;
    } else if (status !== currentStatus) {
      // Status changed, save the current range
      ranges.push({
        startHour: rangeStart,
        endHour: hour,
        status: currentStatus,
        slot: currentSlot
      });
      currentStatus = status;
      currentSlot = slot;
      rangeStart = hour;
    }
  }

  return ranges;
};

export const DriverScheduleScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkStackParamList>>();
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('day');
  const [focusDate, setFocusDate] = useState(new Date());
  const [startHourInput, setStartHourInput] = useState('12');
  const [endHourInput, setEndHourInput] = useState('14');
  const [noteInput, setNoteInput] = useState('Tạm ngưng hoạt động');
  const [errorText, setErrorText] = useState('');

  const dateIso = useMemo(() => {
    const item = new Date(focusDate);
    item.setHours(0, 0, 0, 0);
    return item.toISOString();
  }, [focusDate]);

  const scheduleQuery = useDriverScheduleQuery(dateIso, viewMode);
  const createUnavailableMutation = useCreateUnavailableSlotMutation(dateIso, viewMode);
  const updateSlotMutation = useUpdateDriverScheduleSlotMutation(dateIso, viewMode);

  const onCreateUnavailable = () => {
    if (!scheduleQuery.data) {
      return;
    }
    const startHour = Number(startHourInput);
    const endHour = Number(endHourInput);

    if (Number.isNaN(startHour) || Number.isNaN(endHour) || endHour <= startHour) {
      setErrorText('Khoảng giờ không hợp lệ. Ví dụ 12 -> 14.');
      return;
    }

    const start = new Date(focusDate);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(focusDate);
    end.setHours(endHour, 0, 0, 0);

    setErrorText('');
    createUnavailableMutation.mutate({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      note: noteInput.trim() || undefined
    });
  };

  const onPressTimelineSlot = (slot: DriverScheduleSlot) => {
    if (slot.status === 'booked' && slot.bookingId) {
      navigation.navigate('RentalBookingDetail', { bookingId: slot.bookingId });
      return;
    }

    if (slot.status === 'available' || slot.status === 'unavailable') {
      updateSlotMutation.mutate({
        slotId: slot.id,
        status: slot.status === 'available' ? 'unavailable' : 'available'
      });
    }
  };

  if (scheduleQuery.isLoading) {
    return <LoadingState label="Đang tải lịch cho thuê..." />;
  }

  if (scheduleQuery.isError) {
    return <ErrorState title="Không tải được lịch" onRetry={() => scheduleQuery.refetch()} />;
  }

  if (!scheduleQuery.data) {
    return <EmptyState title="Không có dữ liệu lịch" description="Vui lòng thử lại sau." />;
  }

  const data = scheduleQuery.data;
  const safeSlots = Array.isArray(data.slots) ? data.slots : [];
  const safeAssignedBookings = Array.isArray(data.assignedBookings) ? data.assignedBookings : [];
  const groupedRanges = useMemo(() => groupTimeRanges(safeSlots), [safeSlots]);

  return (
    <MainLayout title="Lịch làm việc / cho thuê" scrollable={true}>
      <View style={styles.topBar}>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setViewMode('day')}
            style={[styles.modeChip, viewMode === 'day' && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, viewMode === 'day' && styles.modeTextActive]}>Theo ngày</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('week')}
            style={[styles.modeChip, viewMode === 'week' && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, viewMode === 'week' && styles.modeTextActive]}>Theo tuần</Text>
          </Pressable>
        </View>

        <View style={styles.dateRow}>
          <Pressable onPress={() => setFocusDate((prev) => addDays(prev, viewMode === 'day' ? -1 : -7))} style={styles.dateNavBtn}>
            <Text style={styles.dateNavText}>{'<'}</Text>
          </Pressable>
          <Text style={styles.dateText}>{DATE_FORMAT.format(focusDate)}</Text>
          <Pressable onPress={() => setFocusDate((prev) => addDays(prev, viewMode === 'day' ? 1 : 7))} style={styles.dateNavBtn}>
            <Text style={styles.dateNavText}>{'>'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Có sẵn: {data.summary.available}</Text>
        <Text style={styles.summaryText}>Đã thuê: {data.summary.booked}</Text>
        <Text style={styles.summaryText}>Không sẵn sàng: {data.summary.unavailable}</Text>
      </View>

      <FlatList
        data={groupedRanges}
        keyExtractor={(item) => `${item.startHour}-${item.endHour}`}
        scrollEnabled={false}
        contentContainerStyle={styles.timelineList}
        renderItem={({ item: range }) => {
          const title = `${String(range.startHour).padStart(2, '0')}:00 - ${String(range.endHour).padStart(2, '0')}:00`;
          const badgeLabel =
            range.status === 'booked' ? 'BOOKED' : range.status === 'unavailable' ? 'UNAVAILABLE' : 'AVAILABLE';
          return (
            <Pressable
              onPress={() => range.slot && onPressTimelineSlot(range.slot)}
              style={[
                styles.timeRow,
                range.status === 'booked'
                  ? styles.timeRowBooked
                  : range.status === 'unavailable'
                    ? styles.timeRowUnavailable
                    : styles.timeRowAvailable
              ]}
            >
              <Text style={styles.timeLabel}>{title}</Text>
              <Text style={styles.badgeLabel}>{badgeLabel}</Text>
              {range.status === 'booked' ? (
                <Text style={styles.noteText}>Nhấn để xem chi tiết</Text>
              ) : range.status === 'unavailable' ? (
                <Text style={styles.noteText}>Nhấn để mở lại khung giờ</Text>
              ) : (
                <Text style={styles.noteText}>Nhấn để đóng khung giờ</Text>
              )}
            </Pressable>
          );
        }}
      />

      <View style={styles.blockCard}>
        <Text style={styles.blockTitle}>Khung giờ tạm ngừng hoạt động</Text>
        <View style={styles.blockInputRow}>
          <TextInput
            value={startHourInput}
            onChangeText={setStartHourInput}
            keyboardType="number-pad"
            style={styles.hourInput}
            placeholder="Bắt đầu"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            value={endHourInput}
            onChangeText={setEndHourInput}
            keyboardType="number-pad"
            style={styles.hourInput}
            placeholder="Kết thúc"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TextInput
          value={noteInput}
          onChangeText={setNoteInput}
          style={styles.noteInput}
          placeholder="Ghi chú"
          placeholderTextColor="#94A3B8"
        />
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        <AppButton title="Tạo" onPress={onCreateUnavailable} loading={createUnavailableMutation.isPending} />
      </View>

      <View style={styles.bookingWrap}>
        <Text style={styles.blockTitle}>Chuyến đi đã được gán</Text>
        {safeAssignedBookings.map((booking) => (
          <Pressable
            key={booking.id}
            onPress={() => navigation.navigate('RentalBookingDetail', { bookingId: booking.id })}
            style={styles.bookingCard}
          >
            <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
            <Text style={styles.bookingText}>{booking.customerName}</Text>
            <Text style={styles.bookingText}>{formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}</Text>
          </Pressable>
        ))}
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  topBar: {
    gap: 10
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8
  },
  modeChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF'
  },
  modeChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB'
  },
  modeText: {
    color: '#475569',
    fontWeight: '700'
  },
  modeTextActive: {
    color: '#1D4ED8'
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateNavText: {
    color: '#0F172A',
    fontWeight: '800'
  },
  dateText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  summaryText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13
  },
  timelineList: {
    gap: 8
  },
  timeRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  timeRowAvailable: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4'
  },
  timeRowBooked: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF'
  },
  timeRowUnavailable: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2'
  },
  timeLabel: {
    color: '#0F172A',
    fontWeight: '800'
  },
  badgeLabel: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12
  },
  noteText: {
    color: '#475569',
    fontSize: 12
  },
  blockCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF'
  },
  blockTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15
  },
  blockInputRow: {
    flexDirection: 'row',
    gap: 8
  },
  hourInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#0F172A'
  },
  noteInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#0F172A'
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600'
  },
  bookingWrap: {
    gap: 8
  },
  bookingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 10,
    gap: 4
  },
  bookingCode: {
    color: '#1D4ED8',
    fontWeight: '800'
  },
  bookingText: {
    color: '#334155',
    fontSize: 13
  }
});
