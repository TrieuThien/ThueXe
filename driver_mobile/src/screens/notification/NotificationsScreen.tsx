import React, { memo, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { useMarkReadAllMutation, useMarkReadMutation, useNotificationsQuery } from '../../hooks/useDriverQueries';
import type { DriverNotification, DriverNotificationGroup } from '../../types/driver';
import type { AccountStackParamList } from '../../types/navigation';
import { formatDateTime } from '../../utils/format';

type ReadFilter = 'all' | 'unread' | 'read';

const GROUP_ORDER: DriverNotificationGroup[] = ['chuyen_di', 'vi', 'ho_so', 'ho_tro', 'van_hanh'];

const GROUP_LABEL: Record<DriverNotificationGroup, string> = {
  chuyen_di: 'Chuyến đi',
  vi: 'Ví',
  ho_so: 'Hồ sơ',
  ho_tro: 'Hỗ trợ',
  van_hanh: 'Vận hành'
};

const FILTER_OPTIONS: Array<{ id: ReadFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'read', label: 'Đã đọc' }
];

type NotificationSection = {
  title: string;
  group: DriverNotificationGroup;
  data: DriverNotification[];
};

type AccountNav = NativeStackNavigationProp<AccountStackParamList>;

type NotificationCardProps = {
  item: DriverNotification;
  onToggleRead: (notification: DriverNotification) => void;
  onOpenDetail: (notificationId: string) => void;
};

const NotificationCard = memo(({ item, onToggleRead, onOpenDetail }: NotificationCardProps) => (
  <View style={styles.card}>
    <Pressable onPress={() => onOpenDetail(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }, styles.cardTapArea]}>
      <View style={styles.cardTop}>
        <Text style={styles.title}>{item.title}</Text>
        {!item.isRead ? <View style={styles.dot} /> : null}
      </View>
      <Text style={styles.body} numberOfLines={2}>
        {item.body}
      </Text>
    </Pressable>
    <View style={styles.cardBottom}>
      <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
      <Pressable
        onPress={() => onToggleRead(item)}
        style={({ pressed }) => [styles.readBtn, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.readBtnText}>{item.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}</Text>
      </Pressable>
    </View>
  </View>
));

export const NotificationsScreen = () => {
  const navigation = useNavigation<AccountNav>();
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  const notificationsQuery = useNotificationsQuery(undefined, readFilter);
  const markReadMutation = useMarkReadMutation();
  const markAllMutation = useMarkReadAllMutation();

  const sections = useMemo<NotificationSection[]>(() => {
    const items = Array.isArray(notificationsQuery.data) ? notificationsQuery.data : [];
    return GROUP_ORDER.map((group) => ({
      title: GROUP_LABEL[group],
      group,
      data: items.filter((item) => item.group === group)
    })).filter((section) => section.data.length > 0);
  }, [notificationsQuery.data]);

  if (notificationsQuery.isLoading) {
    return <LoadingState label="Đang tải thông báo..." />;
  }

  if (notificationsQuery.isError) {
    return <ErrorState title="Không tải được thông báo" onRetry={() => notificationsQuery.refetch()} />;
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Trung tâm thông báo</Text>
          <Pressable onPress={() => markAllMutation.mutate()} style={styles.allReadBtn}>
            <Text style={styles.allReadText}>{markAllMutation.isPending ? 'Đang xử lý...' : 'Đọc tất cả'}</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((item) => {
            const active = readFilter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setReadFilter(item.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!sections.length ? (
          <EmptyState title="Không có thông báo" description="Không có dữ liệu phù hợp với bộ lọc hiện tại." />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => `notification-${item.id}-${item.createdAt}`}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {section.title} ({section.data.length})
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <NotificationCard
                item={item}
                onOpenDetail={(notificationId) => navigation.navigate('NotificationDetail', { notificationId })}
                onToggleRead={(notification) =>
                  markReadMutation.mutate({ notificationId: notification.id, isRead: !notification.isRead })
                }
              />
            )}
            initialNumToRender={14}
            maxToRenderPerBatch={14}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A'
  },
  allReadBtn: {
    borderRadius: 999,
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  allReadText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF'
  },
  filterChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE'
  },
  filterText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700'
  },
  filterTextActive: {
    color: '#1D4ED8'
  },
  listContent: {
    paddingBottom: 16
  },
  sectionHeader: {
    paddingVertical: 8,
    backgroundColor: '#F8FAFC'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B'
  },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF'
  },
  cardTapArea: {
    gap: 8
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444'
  },
  body: {
    color: '#334155',
    fontSize: 14
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  time: {
    color: '#64748B',
    fontSize: 12
  },
  readBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  readBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700'
  }
});
