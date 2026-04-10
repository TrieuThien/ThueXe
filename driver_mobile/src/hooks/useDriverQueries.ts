import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { driverService } from '../services/api/driverService';
import { useNotificationStore } from '../store/notificationStore';
import type { DriverNotificationGroup } from '../types/driver';

export const useProfileQuery = () =>
  useQuery({ queryKey: queryKeys.profile, queryFn: driverService.getProfile });

export const useAccountStatusQuery = () =>
  useQuery({ queryKey: queryKeys.accountStatus, queryFn: driverService.getAccountStatus });

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driverService.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.accountStatus });
    }
  });
};

export const useDashboardQuery = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: driverService.getDashboard });

export const useCurrentTripQuery = () =>
  useQuery({ queryKey: queryKeys.currentTrip, queryFn: driverService.getCurrentTrip, refetchInterval: 15000 });

export const useTripHistoryQuery = () =>
  useQuery({ queryKey: queryKeys.history, queryFn: driverService.getTripHistory });

export const useWalletQuery = () =>
  useQuery({ queryKey: queryKeys.wallet, queryFn: driverService.getWallet });

export const useNotificationsQuery = (group?: DriverNotificationGroup, readState?: 'all' | 'read' | 'unread') => {
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  return useQuery({
    queryKey: queryKeys.notifications(group, readState),
    queryFn: async () => {
      const response = await driverService.getNotifications({
        group,
        isRead: readState === 'read' ? true : readState === 'unread' ? false : undefined
      });
      const data = Array.isArray(response) ? response : [];
      if (!readState || readState === 'all') {
        setUnreadCount(data.filter((item) => !item.isRead).length);
      }
      return data;
    }
  });
};

export const useNotificationDetailQuery = (notificationId: string) =>
  useQuery({
    queryKey: queryKeys.notificationDetail(notificationId),
    queryFn: () => driverService.getNotificationDetail(notificationId),
    enabled: Boolean(notificationId)
  });

export const useUnreadNotificationsCountQuery = () => {
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  return useQuery({
    queryKey: queryKeys.notificationsUnreadCount,
    queryFn: async () => {
      const data = await driverService.getNotificationsUnreadCount();
      setUnreadCount(data.unreadCount);
      return data;
    },
    refetchInterval: 30000
  });
};

export const useMarkReadMutation = () => {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  return useMutation({
    mutationFn: ({ notificationId, isRead }: { notificationId: string; isRead: boolean }) =>
      driverService.markNotificationRead(notificationId, isRead),
    onSuccess: (response) => {
      const data = Array.isArray(response) ? response : [];
      const unreadCount = data.filter((item) => !item.isRead).length;
      setUnreadCount(unreadCount);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
    }
  });
};

export const useMarkReadAllMutation = () => {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  return useMutation({
    mutationFn: driverService.markAllNotificationsRead,
    onSuccess: (response) => {
      const data = Array.isArray(response) ? response : [];
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
      queryClient.setQueryData(queryKeys.notifications(undefined, 'all'), data);
    }
  });
};

export const useUpdateWorkStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driverService.updateWorkingStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountStatus });
    }
  });
};
