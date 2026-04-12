import { apiClient } from '../api/client';
import type {
  CreateSupportTicketPayload,
  CreateSupportTicketResponse,
  SendSupportMessagePayload,
  SupportIssueTopic,
  SupportMessage,
  SupportTicket
} from '../../types/support';

type BackendTopic = {
  id?: number;
  cat_id?: number;
  name?: string;
  title?: string;
  description?: string | null;
};

type BackendTicket = {
  ticketId?: number;
  id?: number;
  ticket_code?: string;
  subject?: string;
  status?: string;
  created_date?: string;
  updated_date?: string;
  cat_id?: number | null;
  last_message?: string | null;
  unread_count?: number;
};

type BackendMessage = {
  messageId?: number;
  id?: number;
  message?: string;
  sender_type?: string;
  sender_name?: string;
  sent_date?: string;
  created_at?: string;
};

function mapTopic(t: BackendTopic): SupportIssueTopic {
  const id = String(t.id ?? t.cat_id ?? '');
  return {
    id,
    type: 'tai_khoan',
    title: t.title ?? t.name ?? 'Hỗ trợ',
    description: t.description ?? ''
  };
}

function mapTicket(t: BackendTicket): SupportTicket {
  const id = String(t.ticketId ?? t.id ?? '');
  return {
    id,
    code: t.ticket_code ?? id,
    issueType: 'tai_khoan',
    subject: t.subject ?? '',
    content: t.subject ?? '',
    createdAt: t.created_date ?? new Date().toISOString(),
    updatedAt: t.updated_date ?? t.created_date ?? new Date().toISOString(),
    status: (t.status as SupportTicket['status']) ?? 'open',
    unreadCount: t.unread_count ?? 0,
    lastMessagePreview: t.last_message ?? undefined
  };
}

function mapMessage(m: BackendMessage, ticketId: string): SupportMessage {
  const id = String(m.messageId ?? m.id ?? '');
  const senderType = m.sender_type ?? 'agent';
  let sender: SupportMessage['sender'] = 'agent';
  if (senderType === 'driver' || senderType === 'user') sender = 'driver';
  if (senderType === 'system') sender = 'system';

  return {
    id,
    ticketId,
    sender,
    senderName: m.sender_name ?? (sender === 'driver' ? 'Tài xế' : 'Hỗ trợ viên'),
    content: m.message ?? '',
    attachments: [],
    createdAt: m.sent_date ?? m.created_at ?? new Date().toISOString()
  };
}

export const supportService = {
  async getSupportTopics(): Promise<SupportIssueTopic[]> {
    const response = await apiClient.get('/api/driver/support/topics');
    const data = response.data.data as { topics?: BackendTopic[] } | BackendTopic[];
    const items = Array.isArray(data) ? data : (data as { topics?: BackendTopic[] }).topics ?? [];
    return items.map(mapTopic);
  },

  async getSupportTickets(): Promise<SupportTicket[]> {
    const response = await apiClient.get('/api/driver/support/tickets');
    const data = response.data.data as { tickets?: BackendTicket[]; items?: BackendTicket[] } | BackendTicket[];
    const items = Array.isArray(data)
      ? data
      : (data as { tickets?: BackendTicket[]; items?: BackendTicket[] }).tickets ??
        (data as { tickets?: BackendTicket[]; items?: BackendTicket[] }).items ??
        [];
    return items.map(mapTicket);
  },

  async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    // Lấy detail ticket — messages nằm trong detail
    const response = await apiClient.get(`/api/driver/support/tickets/${ticketId}`);
    const data = response.data.data as {
      ticket?: BackendTicket & { messages?: BackendMessage[] };
      messages?: BackendMessage[];
    };
    const messages = data.ticket?.messages ?? data.messages ?? [];
    return messages.map((m) => mapMessage(m, ticketId));
  },

  async createSupportTicket(payload: CreateSupportTicketPayload): Promise<CreateSupportTicketResponse> {
    const response = await apiClient.post('/api/driver/support/tickets', {
      subject: payload.content.slice(0, 255),
      message: payload.content,
      cat_id: undefined
    });
    const data = response.data.data as BackendTicket & { messages?: BackendMessage[] };
    const ticket = mapTicket(data);
    const messages = (data.messages ?? []).map((m) => mapMessage(m, ticket.id));
    return { ticket, messages };
  },

  async sendSupportMessage(payload: SendSupportMessagePayload): Promise<SupportMessage[]> {
    const response = await apiClient.post(`/api/driver/support/tickets/${payload.ticketId}/messages`, {
      message: payload.content
    });
    const data = response.data.data as BackendMessage;
    return [mapMessage(data, payload.ticketId)];
  }
};
