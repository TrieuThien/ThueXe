import { apiClient } from '../api/client';
import type {
  CreateSupportTicketPayload,
  CreateSupportTicketResponse,
  SendSupportMessagePayload,
  SupportIssueTopic,
  SupportMessage,
  SupportMockImage,
  SupportTicket
} from '../../types/support';

export const supportService = {
  async getSupportTopics(): Promise<SupportIssueTopic[]> {
    const response = await apiClient.get('/driver/support/topics');
    return response.data.data;
  },

  async getSupportTickets(): Promise<SupportTicket[]> {
    const response = await apiClient.get('/driver/support/tickets');
    return response.data.data;
  },

  async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    const response = await apiClient.get('/driver/support/messages', {
      params: { ticketId }
    });
    return response.data.data;
  },

  async getMockImages(): Promise<SupportMockImage[]> {
    const response = await apiClient.get('/driver/support/mock-images');
    return response.data.data;
  },

  async createSupportTicket(payload: CreateSupportTicketPayload): Promise<CreateSupportTicketResponse> {
    const response = await apiClient.post('/driver/support/tickets/create', payload);
    return response.data.data;
  },

  async sendSupportMessage(payload: SendSupportMessagePayload): Promise<SupportMessage[]> {
    const response = await apiClient.post('/driver/support/messages/send', payload);
    return response.data.data;
  }
};
