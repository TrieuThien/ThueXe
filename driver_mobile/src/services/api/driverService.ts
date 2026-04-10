import { apiClient } from './client';
import type {
  CurrentTrip,
  DashboardSummary,
  DriverAccountStatusResponse,
  DriverNotification,
  DriverNotificationGroup,
  NotificationUnreadCountResponse,
  TripHistoryItem,
  WalletOverview
} from '../../types/driver';
import type { DriverProfile, UpdateDriverProfilePayload } from '../../types/auth';

export const driverService = {
  async getProfile(): Promise<DriverProfile> {
    const response = await apiClient.get('/driver/profile');
    return response.data.data;
  },

  async updateProfile(payload: UpdateDriverProfilePayload): Promise<DriverProfile> {
    const response = await apiClient.patch('/driver/profile', payload);
    return response.data.data;
  },

  async getAccountStatus(): Promise<DriverAccountStatusResponse> {
    const response = await apiClient.get('/driver/account-status');
    return response.data.data;
  },

  async getDashboard(): Promise<DashboardSummary> {
    const response = await apiClient.get('/driver/dashboard');
    return response.data.data;
  },

  async getCurrentTrip(): Promise<CurrentTrip | null> {
    const response = await apiClient.get('/driver/current-trip');
    return response.data.data;
  },

  async getTripHistory(): Promise<TripHistoryItem[]> {
    const response = await apiClient.get('/driver/history');
    return response.data.data;
  },

  async getWallet(): Promise<WalletOverview> {
    const response = await apiClient.get('/driver/wallet');
    return response.data.data;
  },

  async getNotifications(filter?: { group?: DriverNotificationGroup; isRead?: boolean }): Promise<DriverNotification[]> {
    const response = await apiClient.get('/driver/notifications', {
      params: {
        group: filter?.group,
        isRead: typeof filter?.isRead === 'boolean' ? String(filter.isRead) : undefined
      }
    });
    return response.data.data;
  },

  async getNotificationDetail(notificationId: string): Promise<DriverNotification> {
    const response = await apiClient.get('/driver/notifications/detail', {
      params: { notificationId }
    });
    return response.data.data;
  },

  async getNotificationsUnreadCount(): Promise<NotificationUnreadCountResponse> {
    const response = await apiClient.get('/driver/notifications/unread-count');
    return response.data.data;
  },

  async markNotificationRead(notificationId: string, isRead: boolean): Promise<DriverNotification[]> {
    const response = await apiClient.patch('/driver/notifications/mark-read', {
      notificationId,
      isRead
    });
    return response.data.data;
  },

  async markAllNotificationsRead(): Promise<DriverNotification[]> {
    const response = await apiClient.patch('/driver/notifications/read-all');
    return response.data.data;
  },

  async updateWorkingStatus(online: boolean): Promise<{ online: boolean }> {
    const response = await apiClient.patch('/driver/working-status', { online });
    return { online: response.data.data.isOnline };
  }
};
