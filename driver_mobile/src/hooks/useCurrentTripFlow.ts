import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { currentTripService } from '../services/trip/currentTripService';

export const useCurrentTripDetailQuery = () =>
  useQuery({
    queryKey: queryKeys.tripCurrent,
    queryFn: currentTripService.getCurrentTripDetail,
    refetchInterval: 5000
  });

export const useTripSummaryQuery = (tripId: string) =>
  useQuery({
    queryKey: queryKeys.tripSummary(tripId),
    queryFn: () => currentTripService.getTripSummary(tripId),
    enabled: Boolean(tripId)
  });

export const useAcceptTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentTripService.acceptTrip,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tripCurrent, data);
    }
  });
};

export const useRejectTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentTripService.rejectTrip,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.tripCurrent, null);
    }
  });
};

export const useArrivedPickupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentTripService.arrivedPickup,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tripCurrent, data);
    }
  });
};

export const useStartTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentTripService.startTrip,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tripCurrent, data);
    }
  });
};

export const useUpdateTripLocationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentTripService.updateTripLocation,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tripCurrent, data);
    }
  });
};

export const useFinishTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: currentTripService.finishTrip,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tripSummary(data.tripId), data);
      queryClient.setQueryData(queryKeys.tripCurrent, null);
    }
  });
};
