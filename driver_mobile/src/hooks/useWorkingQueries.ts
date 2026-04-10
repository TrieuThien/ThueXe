import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { activeServiceTypesService } from '../services/working/activeServiceTypesService';
import { locationService } from '../services/location/locationService';
import { workingStatusService } from '../services/working/workingStatusService';

export const useWorkingOverviewQuery = () =>
  useQuery({ queryKey: queryKeys.workingOverview, queryFn: workingStatusService.getWorkingOverview });

export const useActiveServiceTypesQuery = () =>
  useQuery({ queryKey: queryKeys.activeServiceTypes, queryFn: activeServiceTypesService.getActiveServiceTypes });

export const useToggleOnlineMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workingStatusService.toggleOnline,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workingOverview, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.accountStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    }
  });
};

export const useUpdateServiceTypesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activeServiceTypesService.updateActiveServiceTypes,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.activeServiceTypes, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.workingOverview });
    }
  });
};

export const useManualLocationUpdateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationService.updateCurrentLocationManual,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workingOverview, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.locationStatus });
    }
  });
};

export const usePeriodicLocationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationService.setPeriodicUpdate,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.workingOverview, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.locationStatus });
    }
  });
};
