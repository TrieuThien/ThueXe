import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton, SectionCard } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { useSupportTicketsQuery, useSupportTopicsQuery } from '../../hooks/useSupportModuleQueries';
import type { AccountStackParamList } from '../../types/navigation';
import type { SupportIssueType, SupportTicketStatus } from '../../types/support';
import { formatDateTime } from '../../utils/format';

const ISSUE_LABEL: Record<SupportIssueType, string> = {
  tai_khoan: 'Tài khoản',
  chuyen_di: 'Chuyến đi',
  vi: 'Ví',
  phuong_tien: 'Phương tiện',
  ho_so: 'Hồ sơ'
};

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Đang mở',
  pending: 'Đang xử lý',
  resolved: 'Đã xử lý',
  closed: 'Đã đóng'
};

type AccountNav = NativeStackNavigationProp<AccountStackParamList>;

export const SupportScreen = () => {
  const navigation = useNavigation<AccountNav>();
  const topicsQuery = useSupportTopicsQuery();
  const ticketsQuery = useSupportTicketsQuery();

  const isLoading = topicsQuery.isLoading || ticketsQuery.isLoading;
  const isError = topicsQuery.isError || ticketsQuery.isError;

  if (isLoading) {
    return <LoadingState label="Đang tải module hỗ trợ..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Không tải được dữ liệu hỗ trợ"
        onRetry={() => {
          void topicsQuery.refetch();
          void ticketsQuery.refetch();
        }}
      />
    );
  }

  if (!topicsQuery.data || !ticketsQuery.data) {
    return <EmptyState title="Không có dữ liệu" description="Vui lòng thử lại sau." />;
  }

  const safeTopics = Array.isArray(topicsQuery.data) ? topicsQuery.data : [];
  const safeTickets = Array.isArray(ticketsQuery.data) ? ticketsQuery.data : [];

  return (
    <MainLayout title="Hỗ trợ tài xe" scrollable={true}>
      <SectionCard title="Danh sách chủ đề hỗ trợ" subtitle="Chọn đúng nhóm vấn đề để được xử lý nhanh hơn">
        <View style={styles.topicWrap}>
          {safeTopics.map((topic, index) => (
            <View key={`topic-${topic.id}-${index}`} style={styles.topicChip}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDescription}>{topic.description}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <AppButton title="Tạo yêu cầu hỗ trợ mới" onPress={() => navigation.navigate('SupportCreateTicket')} />

      <SectionCard title="Ticket hỗ trợ trước đó" subtitle={`${safeTickets.length} ticket`}>
        {!safeTickets.length ? (
          <EmptyState title="Chưa có ticket" description="Bạn có thể tạo yêu cầu mới ngay bên trên." />
        ) : (
          <FlatList
            data={safeTickets}
            keyExtractor={(item) => `ticket-${item.id}`}
            scrollEnabled={false}
            contentContainerStyle={styles.ticketList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('SupportChat', { ticketId: item.id })}
                style={({ pressed }) => [styles.ticketCard, { opacity: pressed ? 0.82 : 1 }]}
              >
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketCode}>{item.code}</Text>
                  <Text style={styles.ticketStatus}>{STATUS_LABEL[item.status]}</Text>
                </View>
                <Text style={styles.ticketSubject}>{item.subject}</Text>
                <Text style={styles.ticketIssue}>{ISSUE_LABEL[item.issueType]}</Text>
                <Text style={styles.ticketPreview} numberOfLines={2}>
                  {item.lastMessagePreview || item.content}
                </Text>
                <Text style={styles.ticketTime}>{formatDateTime(item.updatedAt)}</Text>
              </Pressable>
            )}
          />
        )}
      </SectionCard>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  topicWrap: {
    gap: 8
  },
  topicChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#F8FAFC'
  },
  topicTitle: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14
  },
  topicDescription: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4
  },
  ticketList: {
    gap: 10
  },
  ticketCard: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    padding: 12,
    gap: 4
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ticketCode: {
    color: '#1E3A8A',
    fontWeight: '800'
  },
  ticketStatus: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700'
  },
  ticketSubject: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15
  },
  ticketIssue: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '600'
  },
  ticketPreview: {
    color: '#334155',
    fontSize: 13
  },
  ticketTime: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2
  }
});
