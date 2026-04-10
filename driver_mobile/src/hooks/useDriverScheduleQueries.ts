import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { driverScheduleService } from '../services/schedule/driverScheduleService';
import type {
  CreateUnavailableSlotPayload,
  ScheduleViewMode,
  UpdateDriverScheduleSlotPayload
} from '../types/schedule';

export const useDriverScheduleQuery = (date: string, viewMode: ScheduleViewMode) =>
  useQuery({
    queryKey: queryKeys.driverSchedule(date, viewMode),
    queryFn: () => driverScheduleService.getDriverSchedule({ date, viewMode }),
    enabled: Boolean(date)
  });

export const useCreateUnavailableSlotMutation = (_date: string, _viewMode: ScheduleViewMode) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUnavailableSlotPayload) => driverScheduleService.createUnavailableSlot(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverSchedule'] });
    }
  });
};

export const useUpdateDriverScheduleSlotMutation = (_date: string, _viewMode: ScheduleViewMode) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDriverScheduleSlotPayload) => driverScheduleService.updateScheduleSlot(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverSchedule'] });
    }
  });
};

export const useRentalBookingDetailQuery = (bookingId: string) =>
  useQuery({
    queryKey: queryKeys.rentalBookingDetail(bookingId),
    queryFn: () => driverScheduleService.getRentalBookingDetail(bookingId),
    enabled: Boolean(bookingId)
  });
