import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CancelTripRequest, SendTripMessageRequest, TripChatMessage } from "../../types";
import { tripCancellationQueryKeys, tripCancellationService } from "../../services/trip/tripCancellationService";
import { tripChatQueryKeys, tripChatService } from "../../services/trip/tripChatService";
import { QUERY_KEYS } from "../../constants";

export function useTripChatThreadQuery(bookingId?: string) {
  return useQuery({
    queryKey: tripChatQueryKeys.thread(bookingId ?? "none"),
    queryFn: () => tripChatService.getChatThreadByBookingId(bookingId ?? ""),
    enabled: Boolean(bookingId),
    refetchInterval: 2500,
  });
}

export function useSendTripMessageMutation(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendTripMessageRequest) => tripChatService.sendMessage(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tripChatQueryKeys.thread(bookingId) });
      const previousThread = queryClient.getQueryData<
        { bookingId: string; canChat: boolean; disabledReason?: string; messages: TripChatMessage[] }
      >(tripChatQueryKeys.thread(bookingId));

      const optimisticMessage: TripChatMessage = {
        id: `optimistic_${Date.now()}`,
        bookingId,
        senderRole: "CUSTOMER",
        receiverRole: payload.receiverRole ?? "DRIVER",
        content: payload.content,
        createdAt: new Date().toISOString(),
        deliveryStatus: "SENDING",
      };

      if (previousThread) {
        queryClient.setQueryData(tripChatQueryKeys.thread(bookingId), {
          ...previousThread,
          messages: [...previousThread.messages, optimisticMessage],
        });
      }

      return { previousThread, optimisticMessageId: optimisticMessage.id };
    },
    onError: (_error, _payload, context) => {
      if (!context?.previousThread) {
        return;
      }

      queryClient.setQueryData(tripChatQueryKeys.thread(bookingId), {
        ...context.previousThread,
        messages: context.previousThread.messages.map((message) =>
          message.id === context.optimisticMessageId
            ? {
                ...message,
                deliveryStatus: "FAILED" as const,
              }
            : message,
        ),
      });
    },
    onSuccess: (response, _payload, context) => {
      const previousThread = queryClient.getQueryData<
        { bookingId: string; canChat: boolean; disabledReason?: string; messages: TripChatMessage[] }
      >(tripChatQueryKeys.thread(bookingId));

      if (!previousThread) {
        return;
      }

      queryClient.setQueryData(tripChatQueryKeys.thread(bookingId), {
        ...previousThread,
        messages: previousThread.messages
          .filter((message) => message.id !== context?.optimisticMessageId)
          .concat(response.message),
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: tripChatQueryKeys.thread(bookingId) });
    },
  });
}

export function useTripCancelPolicyQuery(bookingId?: string) {
  return useQuery({
    queryKey: tripCancellationQueryKeys.policy(bookingId ?? "none"),
    queryFn: () => tripCancellationService.getCancelPolicy(bookingId ?? ""),
    enabled: Boolean(bookingId),
  });
}

export function useCancelTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CancelTripRequest) => tripCancellationService.cancelTrip(payload),
    onSuccess: async (_response, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTrip }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tripHistory }),
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.tripDetail, payload.bookingId] }),
      ]);
    },
  });
}
