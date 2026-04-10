import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MainLayout } from '../../layouts/MainLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { useMarkReadMutation, useNotificationDetailQuery } from '../../hooks/useDriverQueries';
import type { AccountStackParamList } from '../../types/navigation';
import type { DriverNotificationGroup } from '../../types/driver';
import { formatDateTime } from '../../utils/format';

type DetailRoute = RouteProp<AccountStackParamList, 'NotificationDetail'>;

const GROUP_LABEL: Record<DriverNotificationGroup, string> = {
  chuyen_di: 'Chuyến đi',
  vi: 'Vi',
  ho_so: 'Hồ sơ',
  ho_tro: 'Hỗ trợ',
  van_hanh: 'Vận hành'
};

export const NotificationDetailScreen = () => {
  const route = useRoute<DetailRoute>();
  const notificationId = route.params.notificationId;

  const detailQuery = useNotificationDetailQuery(notificationId);
  const markReadMutation = useMarkReadMutation();

  useEffect(() => {
    if (detailQuery.data && !detailQuery.data.isRead) {
      markReadMutation.mutate({ notificationId, isRead: true });
    }
  }, [detailQuery.data, markReadMutation, notificationId]);

  if (detailQuery.isLoading) {
    return <LoadingState label="Đang tải chi tiết thông báo..." />;
  }

  if (detailQuery.isError) {
    return <ErrorState title="Không tải được chi tiết thông báo" onRetry={() => detailQuery.refetch()} />;
  }

  if (!detailQuery.data) {
    return <EmptyState title="Không tìm thấy thông báo" description="Thông báo đã bị xóa hoặc không tồn tại." />;
  }

  const data = detailQuery.data;

  return (
    <MainLayout title="Chi tiết thông báo">
      <View style={styles.card}>
        <Text style={styles.group}>{GROUP_LABEL[data.group]}</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.meta}>{formatDateTime(data.createdAt)}</Text>
        {data.refCode ? <Text style={styles.refCode}>Mã tham chiếu: {data.refCode}</Text> : null}
        <Text style={styles.detail}>{data.detail}</Text>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8
  },
  group: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700'
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800'
  },
  meta: {
    color: '#64748B',
    fontSize: 12
  },
  refCode: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 13
  },
  detail: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22
  }
});
