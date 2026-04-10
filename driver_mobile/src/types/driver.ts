import type { AccountStatus, VerificationStatus, WorkingStatus } from './auth';

export type DashboardSummary = {
  todayTrips: number;
  todayIncome: number;
  onlineHours: number;
  acceptanceRate: number;
};

export type DriverAccountStatusResponse = {
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  workingStatus: WorkingStatus;
};

export type CurrentTrip = {
  id: string;
  customerName: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fare: number;
  status: 'dang_don' | 'dang_di_chuyen' | 'hoan_thanh';
};

export type TripHistoryItem = {
  id: string;
  date: string;
  route: string;
  fare: number;
  status: 'hoan_thanh' | 'huy';
};

export type WalletOverview = {
  availableBalance: number;
  pendingPayout: number;
  weeklyIncome: number;
};

export type DriverNotificationGroup = 'chuyen_di' | 'vi' | 'ho_so' | 'ho_tro' | 'van_hanh';

export type DriverNotification = {
  id: string;
  group: DriverNotificationGroup;
  title: string;
  body: string;
  detail: string;
  refCode?: string;
  createdAt: string;
  isRead: boolean;
};

export type NotificationUnreadCountResponse = {
  unreadCount: number;
};
