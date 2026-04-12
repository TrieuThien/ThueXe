import { apiClient } from './client';
import { mapDriverProfile, mapAccountStatus, mapNotification, buildAuthTokens, type BackendDriver, type BackendAccountStatus, type BackendNotification } from './mappers';
import type {
  DashboardSummary,
  DriverAccountStatusResponse,
  DriverNotification,
  DriverNotificationGroup,
  NotificationUnreadCountResponse,
  WalletOverview
} from '../../types/driver';
import type { DriverProfile, UpdateDriverProfilePayload } from '../../types/auth';

export const driverService = {
  async getProfile(): Promise<DriverProfile> {
    const response = await apiClient.get('/api/driver/me');
    const data = response.data.data as { driver: BackendDriver };
    return mapDriverProfile(data.driver);
  },

  async updateProfile(payload: UpdateDriverProfilePayload): Promise<DriverProfile> {
    const parts = payload.fullName.trim().split(/\s+/);
    const lastname = parts.length > 1 ? parts.pop()! : '';
    const firstname = parts.join(' ') || payload.fullName.trim();

    // Cập nhật tên: PATCH /me
    // Cập nhật bank: PATCH /me/bank-account
    await Promise.all([
      apiClient.patch('/api/driver/me', { firstname, lastname }),
      apiClient.patch('/api/driver/me/bank-account', {
        bank_name: payload.bank.bankName,
        bank_acc_holder_name: payload.bank.accountHolder,
        bank_acc_num: payload.bank.accountNumber
      })
    ]);

    // Lấy profile mới nhất sau khi cập nhật
    const profileResponse = await apiClient.get('/api/driver/me');
    const data = profileResponse.data.data as { driver: BackendDriver };
    return mapDriverProfile(data.driver);
  },

  async getAccountStatus(): Promise<DriverAccountStatusResponse> {
    const response = await apiClient.get('/api/driver/me/account-status');
    return mapAccountStatus(response.data.data as BackendAccountStatus);
  },

  // Dashboard: dùng income/summary vì không có endpoint dashboard riêng
  async getDashboard(): Promise<DashboardSummary> {
    const response = await apiClient.get('/api/driver/income/summary');
    const data = response.data.data as { income?: { today?: number; thisMonth?: number; allTime?: number } };
    return {
      todayIncome: data.income?.today ?? 0
    };
  },

  // Không dùng trực tiếp — xem currentTripService
  async getWallet(): Promise<WalletOverview> {
    try {
      const response = await apiClient.get('/api/driver/wallet/summary');
      const data = response.data.data as {
        balance?: number;
        total_credited?: number;
      };
      return {
        availableBalance: data.balance ?? 0,
        pendingPayout: 0,
        weeklyIncome: data.total_credited ?? 0
      };
    } catch {
      return { availableBalance: 0, pendingPayout: 0, weeklyIncome: 0 };
    }
  },

  async getNotifications(filter?: {
    group?: DriverNotificationGroup;
    isRead?: boolean;
  }): Promise<DriverNotification[]> {
    const params: Record<string, string | number | undefined> = {};
    if (filter?.isRead === true) params.is_read = 1;
    if (filter?.isRead === false) params.is_read = 0;

    const response = await apiClient.get('/api/driver/notifications', { params });
    const data = response.data.data as { items?: BackendNotification[] };
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map(mapNotification);
  },

  async getNotificationDetail(notificationId: string): Promise<DriverNotification> {
    // Backend không có endpoint GET single notification; lấy danh sách và tìm
    const response = await apiClient.get('/api/driver/notifications', {
      params: { limit: 100 }
    });
    const data = response.data.data as { items?: BackendNotification[] };
    const items = Array.isArray(data?.items) ? data.items : [];
    const found = items.find((n) => String(n.id) === notificationId);
    if (!found) {
      throw new Error('Không tìm thấy thông báo');
    }
    return mapNotification(found);
  },

  async getNotificationsUnreadCount(): Promise<NotificationUnreadCountResponse> {
    const response = await apiClient.get('/api/driver/notifications/unread-count');
    const data = response.data.data as { unread_count?: number };
    return { unreadCount: data.unread_count ?? 0 };
  },

  async markNotificationRead(notificationId: string, _isRead: boolean): Promise<DriverNotification[]> {
    await apiClient.patch(`/api/driver/notifications/${notificationId}/read`);
    // Sau khi mark read, fetch lại danh sách để cập nhật cache
    return driverService.getNotifications();
  },

  async markAllNotificationsRead(): Promise<DriverNotification[]> {
    await apiClient.patch('/api/driver/notifications/read-all');
    return driverService.getNotifications();
  },

  async updateWorkingStatus(online: boolean): Promise<{ online: boolean }> {
    const response = await apiClient.patch('/api/driver/working-status/online', {
      online: online ? 1 : 0
    });
    const data = response.data.data as { online?: number };
    return { online: data.online === 1 };
  }
};
