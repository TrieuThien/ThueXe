import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { chatApi } from "../../services";

export function useChat(bookingId?: string | number, rentalId?: string | number) {
  const queryClient = useQueryClient();

  const bookingChatQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.chats.booking(bookingId ?? "none"),
    queryFn: () => chatApi.getRideMessages(bookingId as string | number),
    enabled: Boolean(bookingId),
    refetchInterval: 5000,
  });

  const rentalChatQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.chats.rental(rentalId ?? "none"),
    queryFn: () => chatApi.getRentalMessages(rentalId as string | number),
    enabled: Boolean(rentalId),
    refetchInterval: 5000,
  });

  const sendBookingMessageMutation = useMutation({
    mutationFn: (payload: { bookingId: string | number; body: unknown }) =>
      chatApi.sendRideMessage(payload.bookingId, payload.body),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.chats.booking(vars.bookingId) });
    },
  });

  return {
    bookingChatQuery,
    rentalChatQuery,
    sendBookingMessageMutation,
  };
}
