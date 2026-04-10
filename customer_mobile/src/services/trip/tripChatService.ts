import { QUERY_KEYS } from "../../constants";
import {
  SendTripMessageRequest,
  SendTripMessageResponse,
  TripChatMessage,
  TripChatThreadResponse,
} from "../../types";
import { apiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { mockDelay } from "../mock/mockDelay";

const USE_MOCK_TRIP_CHAT = true;

const mockThreadStore: Record<string, TripChatMessage[]> = {
  booking_active_1: [
    {
      id: "chat_1",
      bookingId: "booking_active_1",
      userId: "user_1",
      senderRole: "CUSTOMER",
      receiverRole: "DRIVER",
      content: "Anh ơi, sắp đến chưa?",
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      deliveryStatus: "SENT",
    },
    {
      id: "chat_2",
      bookingId: "booking_active_1",
      driverId: "driver_active_1",
      senderRole: "DRIVER",
      receiverRole: "CUSTOMER",
      content: "Em sắp đến trong 5 phút.",
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      deliveryStatus: "SENT",
    },
  ],
};

function throwError(code: string, message: string, status: number): never {
  throw new ApiError({ code, message, status });
}

export const tripChatService = {
  getChatThreadByBookingId: async (bookingId: string): Promise<TripChatThreadResponse> => {
    if (USE_MOCK_TRIP_CHAT) {
      await mockDelay(250);

      const messages = mockThreadStore[bookingId] ?? [];
      const canChat = bookingId !== "booking_no_driver";

      return {
        bookingId,
        canChat,
        disabledReason: canChat ? undefined : "Chưa có tài xế nhận chuyến, bạn tạm thời chưa thể chat.",
        messages,
      };
    }

    const response = await apiClient.get<TripChatThreadResponse>(`/chats?bookingId=${bookingId}`);
    return response.data;
  },

  sendMessage: async (payload: SendTripMessageRequest): Promise<SendTripMessageResponse> => {
    if (USE_MOCK_TRIP_CHAT) {
      await mockDelay(220);

      if (payload.content.toLowerCase().includes("fail")) {
        throwError("CHAT_SEND_FAILED", "Gửi tin nhắn thất bại", 500);
      }

      const newMessage: TripChatMessage = {
        id: `chat_${Date.now()}`,
        bookingId: payload.bookingId,
        userId: "user_1",
        senderRole: "CUSTOMER",
        receiverRole: payload.receiverRole ?? "DRIVER",
        content: payload.content,
        createdAt: new Date().toISOString(),
        deliveryStatus: "SENT",
      };

      mockThreadStore[payload.bookingId] = [...(mockThreadStore[payload.bookingId] ?? []), newMessage];

      return {
        message: newMessage,
      };
    }

    const response = await apiClient.post<SendTripMessageResponse>("/chats", payload);
    return response.data;
  },
};

export const tripChatQueryKeys = {
  thread: (bookingId: string) => [...QUERY_KEYS.tripChatThread, bookingId] as const,
};
