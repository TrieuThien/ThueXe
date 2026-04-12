import { APP_CONFIG } from "../../../constants";
import { apiClient } from "../apiClient";

export interface ChatPaginationQuery {
  page?: number;
  limit?: number;
  last_message_id?: number;
}

export const chatApi = {
  getRideMessages: async (bookingId: string | number, params?: ChatPaginationQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/chats/booking/${bookingId}`, { params }),
  sendRideMessage: async (bookingId: string | number, payload: unknown) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/chats/booking/${bookingId}`, payload),
  pollRideMessages: async (bookingId: string | number, params?: ChatPaginationQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/chats/booking/${bookingId}/poll`, { params }),
  getRentalMessages: async (rentalId: string | number, params?: ChatPaginationQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rental-chats/${rentalId}`, { params }),
  sendRentalMessage: async (rentalId: string | number, payload: unknown) =>
    apiClient.post(`${APP_CONFIG.customerApiPrefix}/rental-chats/${rentalId}`, payload),
  pollRentalMessages: async (rentalId: string | number, params?: ChatPaginationQuery) =>
    apiClient.get(`${APP_CONFIG.customerApiPrefix}/rental-chats/${rentalId}/poll`, { params }),
};
