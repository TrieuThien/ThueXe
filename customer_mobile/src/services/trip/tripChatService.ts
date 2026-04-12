import { APP_CONFIG, QUERY_KEYS } from "../../constants";
import {
  SendTripMessageRequest,
  SendTripMessageResponse,
  TripChatThreadResponse,
} from "../../types";
import { apiClient } from "../api/client";

export const tripChatService = {
  getChatThreadByBookingId: async (bookingId: string): Promise<TripChatThreadResponse> => {
    const response = await apiClient.get<TripChatThreadResponse>(`${APP_CONFIG.customerApiPrefix}/chats/booking/${bookingId}`);
    return response.data;
  },

  sendMessage: async (payload: SendTripMessageRequest): Promise<SendTripMessageResponse> => {
    const response = await apiClient.post<SendTripMessageResponse>(
      `${APP_CONFIG.customerApiPrefix}/chats/booking/${payload.bookingId}`,
      { message: payload.content, message_type: "text" },
    );
    return response.data;
  },
};

export const tripChatQueryKeys = {
  thread: (bookingId: string) => [...QUERY_KEYS.tripChatThread, bookingId] as const,
};
