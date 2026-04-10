import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { EmptyState, ErrorState } from '../../components/states';
import { HistoryListSkeleton, HistoryTripCard } from '../../components/history';
import { useTripHistoryInfiniteQuery } from '../../hooks/useTripHistoryQueries';
import type { HistoryStackParamList } from '../../types/navigation';
import type { TripHistoryStatus } from '../../types/history';

type Props = NativeStackScreenProps<HistoryStackParamList, 'TripHistory'>;

const STATUS_OPTIONS: { label: string; value: 'tat_ca' | TripHistoryStatus }[] = [
  { label: 'Tất cả', value: 'tat_ca' },
  { label: 'Hoàn thành', value: 'hoan_thanh' },
  { label: 'Đã hủy', value: 'da_huy' },
  { label: 'Đã từ chối', value: 'da_tu_choi' }
];

export const TripHistoryScreen = ({ navigation }: Props) => {
  const [searchText, setSearchText] = useState('');
  const [fromDateText, setFromDateText] = useState('');
  const [toDateText, setToDateText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'tat_ca' | TripHistoryStatus>('tat_ca');

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<'tat_ca' | TripHistoryStatus>('tat_ca');

  const historyQuery = useTripHistoryInfiniteQuery({
    search: appliedSearch || undefined,
    fromDate: appliedFromDate || undefined,
    toDate: appliedToDate || undefined,
    status: appliedStatus
  });

  const items = useMemo(() => historyQuery.data?.pages.flatMap((page) => page.items) ?? [], [historyQuery.data]);

  const applyFilter = () => {
    setAppliedSearch(searchText.trim());
    setAppliedFromDate(fromDateText.trim());
    setAppliedToDate(toDateText.trim());
    setAppliedStatus(selectedStatus);
  };

  if (historyQuery.isLoading) {
    return <HistoryListSkeleton />;
  }

  if (historyQuery.isError) {
    return <ErrorState title="Không tải được lịch sử chuyến" onRetry={() => historyQuery.refetch()} />;
  }

  return (
    <MainLayout title="Lịch sử chuyến" scrollable={false}>
      <View style={styles.filterCard}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm theo mã chuyến"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
        <View style={styles.dateRow}>
          <TextInput
            value={fromDateText}
            onChangeText={setFromDateText}
            placeholder="Từ ngày"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.flexInput]}
          />
          <TextInput
            value={toDateText}
            onChangeText={setToDateText}
            placeholder="Đến ngày"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.flexInput]}
          />
        </View>

        <View style={styles.statusWrap}>
          {STATUS_OPTIONS.map((status) => {
            const active = selectedStatus === status.value;
            return (
              <Pressable
                key={status.value}
                onPress={() => setSelectedStatus(status.value)}
                style={[styles.statusChip, active && styles.statusChipActive]}
              >
                <Text style={[styles.statusText, active && styles.statusTextActive]}>{status.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={applyFilter} style={styles.applyBtn}>
          <Text style={styles.applyText}>Áp dụng bộ lọc</Text>
        </Pressable>
      </View>

      {!items.length ? (
        <EmptyState title="Chưa có dữ liệu" description="Không tìm thấy chuyến phù hợp với bộ lọc." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.tripId}
          renderItem={({ item }) => (
            <HistoryTripCard item={item} onPress={() => navigation.navigate('TripHistoryDetail', { tripId: item.tripId })} />
          )}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.3}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          onEndReached={() => {
            if (historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
              void historyQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            historyQuery.isFetchingNextPage ? <Text style={styles.footerText}>Đang tải thêm...</Text> : <View style={{ height: 8 }} />
          }
        />
      )}
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    color: '#0F172A'
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8
  },
  flexInput: {
    flex: 1
  },
  statusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1'
  },
  statusText: {
    color: '#334155',
    fontWeight: '600'
  },
  statusTextActive: {
    color: '#0F766E'
  },
  applyBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  list: {
    gap: 10,
    paddingBottom: 20
  },
  footerText: {
    textAlign: 'center',
    color: '#64748B',
    paddingVertical: 10
  }
});
