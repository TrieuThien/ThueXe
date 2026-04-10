import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { supportService } from '../services/support/supportService';

export const useSupportTopicsQuery = () =>
  useQuery({
    queryKey: queryKeys.supportTopics,
    queryFn: supportService.getSupportTopics
  });

export const useSupportTicketsQuery = () =>
  useQuery({
    queryKey: queryKeys.supportTickets,
    queryFn: supportService.getSupportTickets
  });

export const useSupportMessagesQuery = (ticketId: string) =>
  useQuery({
    queryKey: queryKeys.supportMessages(ticketId),
    queryFn: () => supportService.getSupportMessages(ticketId),
    enabled: Boolean(ticketId)
  });

export const useSupportMockImagesQuery = () =>
  useQuery({
    queryKey: queryKeys.supportMockImages,
    queryFn: supportService.getMockImages
  });

export const useCreateSupportTicketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supportService.createSupportTicket,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets });
      queryClient.setQueryData(queryKeys.supportMessages(data.ticket.id), data.messages);
    }
  });
};

export const useSendSupportMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supportService.sendSupportMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets });
      queryClient.invalidateQueries({ queryKey: queryKeys.supportMessages(variables.ticketId) });
    }
  });
};
