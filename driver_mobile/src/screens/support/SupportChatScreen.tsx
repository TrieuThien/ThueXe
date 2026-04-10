import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import {
  useSendSupportMessageMutation,
  useSupportMessagesQuery,
  useSupportMockImagesQuery,
  useSupportTicketsQuery
} from '../../hooks/useSupportModuleQueries';
import type { AccountStackParamList } from '../../types/navigation';
import type { SupportAttachment, SupportMessage, SupportMockImage, SupportTicketStatus } from '../../types/support';
import { formatDateTime } from '../../utils/format';

type SupportChatRoute = RouteProp<AccountStackParamList, 'SupportChat'>;

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Đang mở',
  pending: 'Đang xử lý',
  resolved: 'Đã xử lý',
  closed: 'Đã đóng'
};

export const SupportChatScreen = () => {
  const route = useRoute<SupportChatRoute>();
  const flatListRef = useRef<FlatList<SupportMessage>>(null);

  const [input, setInput] = useState('');
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const ticketId = route.params.ticketId;

  const ticketsQuery = useSupportTicketsQuery();
  const messagesQuery = useSupportMessagesQuery(ticketId);
  const mockImagesQuery = useSupportMockImagesQuery();
  const sendMutation = useSendSupportMessageMutation();

  const safeTickets = useMemo(() => (Array.isArray(ticketsQuery.data) ? ticketsQuery.data : []), [ticketsQuery.data]);
  const safeMessages = useMemo(() => (Array.isArray(messagesQuery.data) ? messagesQuery.data : []), [messagesQuery.data]);
  const safeMockImages = useMemo(() => (Array.isArray(mockImagesQuery.data) ? mockImagesQuery.data : []), [mockImagesQuery.data]);

  const ticket = useMemo(() => safeTickets.find((item) => item.id === ticketId), [ticketId, safeTickets]);
  const selectedImages = useMemo(
    () => safeMockImages.filter((item) => selectedImageIds.includes(item.id)),
    [safeMockImages, selectedImageIds]
  );

  const sendingDisabled = sendMutation.isPending || (!input.trim() && selectedImages.length === 0);

  const toggleImage = (image: SupportMockImage) => {
    setSelectedImageIds((previous) =>
      previous.includes(image.id) ? previous.filter((id) => id !== image.id) : [...previous, image.id]
    );
  };

  const onSend = () => {
    if (sendingDisabled) {
      return;
    }

    const attachments: SupportAttachment[] = selectedImages.map((item) => ({
      id: `att-${item.id}-${Date.now()}`,
      type: 'image',
      fileName: item.fileName,
      uri: item.uri,
      width: item.width,
      height: item.height
    }));

    sendMutation.mutate(
      {
        ticketId,
        content: input.trim(),
        attachments
      },
      {
        onSuccess: () => {
          setInput('');
          setSelectedImageIds([]);
          setShowAttachmentPanel(false);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    );
  };

  if (ticketsQuery.isLoading || messagesQuery.isLoading) {
    return <LoadingState label="Đang tải chat hỗ trợ..." />;
  }

  if (ticketsQuery.isError || messagesQuery.isError || mockImagesQuery.isError) {
    return (
      <ErrorState
        title="Không tải được màn hình chat"
        onRetry={() => {
          void ticketsQuery.refetch();
          void messagesQuery.refetch();
          void mockImagesQuery.refetch();
        }}
      />
    );
  }

  if (!ticket) {
    return <EmptyState title="Không tìm thấy ticket" description="Ticket có thể đã bị xóa hoặc không tồn tại." />;
  }

  const renderMessage: ListRenderItem<SupportMessage> = ({ item }) => {
    const isDriver = item.sender === 'driver';

    return (
      <View style={[styles.messageRow, isDriver ? styles.messageRowDriver : styles.messageRowSupport]}>
        <View style={[styles.messageBubble, isDriver ? styles.driverBubble : styles.supportBubble]}>
          <Text style={styles.messageSender}>{item.senderName}</Text>
          {item.content ? <Text style={[styles.messageText, isDriver && styles.messageTextDriver]}>{item.content}</Text> : null}

          {(Array.isArray(item.attachments) ? item.attachments : []).length ? (
            <View style={styles.attachmentWrap}>
              {(Array.isArray(item.attachments) ? item.attachments : []).map((attachment) => (
                <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.attachmentImage} resizeMode="cover" />
              ))}
            </View>
          ) : null}

          <Text style={[styles.messageTime, isDriver && styles.messageTimeDriver]}>{formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketCode}>{ticket.code}</Text>
          <Text style={styles.ticketStatus}>{STATUS_LABEL[ticket.status]}</Text>
          <Text style={styles.ticketTitle}>{ticket.subject}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={safeMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {selectedImages.length ? (
          <View style={styles.selectedWrap}>
            <Text style={styles.selectedLabel}>Ảnh đã chọn ({selectedImages.length})</Text>
            <FlatList
              horizontal
              data={selectedImages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.selectedList}
              renderItem={({ item }) => <Image source={{ uri: item.uri }} style={styles.selectedImage} />}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ) : null}

        {showAttachmentPanel ? (
          <View style={styles.attachmentPanel}>
            <Text style={styles.attachmentTitle}>Đính kèm hình ảnh mock</Text>
            <FlatList
              horizontal
              data={safeMockImages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.attachmentList}
              renderItem={({ item }) => {
                const active = selectedImageIds.includes(item.id);
                return (
                  <Pressable onPress={() => toggleImage(item)} style={[styles.attachmentPicker, active && styles.attachmentPickerActive]}>
                    <Image source={{ uri: item.uri }} style={styles.attachmentPickerImage} />
                    <Text style={styles.attachmentPickerText} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                  </Pressable>
                );
              }}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <Pressable onPress={() => setShowAttachmentPanel((value) => !value)} style={styles.attachBtn}>
            <Text style={styles.attachText}>{showAttachmentPanel ? 'Đóng' : 'Ảnh mock'}</Text>
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Nhắn tin cho support..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <Pressable onPress={onSend} disabled={sendingDisabled} style={[styles.sendBtn, sendingDisabled && styles.sendBtnDisabled]}>
            <Text style={styles.sendText}>{sendMutation.isPending ? '...' : 'Gửi'}</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10
  },
  ticketHeader: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    gap: 4
  },
  ticketCode: {
    color: '#1D4ED8',
    fontWeight: '800'
  },
  ticketStatus: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12
  },
  ticketTitle: {
    color: '#0F172A',
    fontWeight: '700'
  },
  messageList: {
    paddingVertical: 8,
    gap: 10
  },
  messageRow: {
    flexDirection: 'row'
  },
  messageRowDriver: {
    justifyContent: 'flex-end'
  },
  messageRowSupport: {
    justifyContent: 'flex-start'
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 12,
    padding: 10,
    gap: 6
  },
  driverBubble: {
    backgroundColor: '#2563EB'
  },
  supportBubble: {
    backgroundColor: '#E2E8F0'
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B'
  },
  messageText: {
    color: '#0F172A'
  },
  messageTextDriver: {
    color: '#FFFFFF'
  },
  messageTime: {
    fontSize: 11,
    color: '#475569'
  },
  messageTimeDriver: {
    color: '#DBEAFE'
  },
  attachmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  attachmentImage: {
    width: 130,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#CBD5E1'
  },
  selectedWrap: {
    gap: 8
  },
  selectedLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700'
  },
  selectedList: {
    gap: 8
  },
  selectedImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: '#CBD5E1'
  },
  attachmentPanel: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 8
  },
  attachmentTitle: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13
  },
  attachmentList: {
    gap: 8
  },
  attachmentPicker: {
    width: 140,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  attachmentPickerActive: {
    borderColor: '#2563EB',
    borderWidth: 2
  },
  attachmentPickerImage: {
    width: '100%',
    height: 88,
    backgroundColor: '#CBD5E1'
  },
  attachmentPickerText: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    color: '#334155'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  attachBtn: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF'
  },
  attachText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF'
  },
  sendBtn: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E'
  },
  sendBtnDisabled: {
    opacity: 0.5
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
