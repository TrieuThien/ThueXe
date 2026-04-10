export type SupportIssueType = 'tai_khoan' | 'chuyen_di' | 'vi' | 'phuong_tien' | 'ho_so';

export type SupportTicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export type SupportIssueTopic = {
  id: string;
  type: SupportIssueType;
  title: string;
  description: string;
};

export type SupportAttachment = {
  id: string;
  type: 'image';
  fileName: string;
  uri: string;
  width?: number;
  height?: number;
};

export type SupportMessageSender = 'driver' | 'agent' | 'system';

export type SupportMessage = {
  id: string;
  ticketId: string;
  sender: SupportMessageSender;
  senderName: string;
  content: string;
  attachments: SupportAttachment[];
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  code: string;
  issueType: SupportIssueType;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  status: SupportTicketStatus;
  unreadCount: number;
  lastMessagePreview?: string;
};

export type CreateSupportTicketPayload = {
  issueType: SupportIssueType;
  content: string;
};

export type CreateSupportTicketResponse = {
  ticket: SupportTicket;
  messages: SupportMessage[];
};

export type SendSupportMessagePayload = {
  ticketId: string;
  content: string;
  attachments?: SupportAttachment[];
};

export type SupportMockImage = {
  id: string;
  fileName: string;
  uri: string;
  width: number;
  height: number;
};
