import type { NavigatorScreenParams } from '@react-navigation/native';
import type { OtpPurpose } from './auth';
import type { TopupPaymentMethod, TopupResultStatus } from './wallet';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: {
    identifier: string;
    driver_id: number;
    purpose: OtpPurpose;
  };
  ForgotPassword: undefined;
  // Token đến từ deep link email; ResetPassword vẫn giữ trong stack để hỗ trợ deep link sau này
  ResetPassword: {
    token: string;
  };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
};

export type WorkStackParamList = {
  WorkingStatus: undefined;
  DriverSchedule: undefined;
  CurrentTrip: undefined;
  TripCompletedSummary: {
    tripId: string;
  };
  RentalBookingDetail: {
    bookingId: string;
  };
  DriverHireActiveService: {
    rentalId: string;
    bookingCode?: string;
    customerName?: string;
    pickupAddress?: string;
    pickupLat?: number;
    pickupLng?: number;
    durationHours?: number;
    userId?: number;
  };
  DriverHireServiceSummary: {
    rentalId: string;
  };
};

export type HistoryStackParamList = {
  TripHistory: undefined;
  TripHistoryDetail: {
    tripId: string;
  };
};

export type WalletStackParamList = {
  WalletIncome: undefined;
  WalletTopUp: undefined;
  WalletTopUpPayment: {
    paymentId: string;
    amount: number;
    paymentMethod: TopupPaymentMethod;
    expiresAt: string;
    checkoutUrl?: string;
  };
  WalletTopUpResult: {
    paymentId: string;
    status: TopupResultStatus;
    amount: number;
    message: string;
  };
  WalletWithdrawal: undefined;
};

export type AccountStackParamList = {
  Profile: undefined;
  Support: undefined;
  SupportCreateTicket: undefined;
  SupportChat: {
    ticketId: string;
  };
  Notifications: undefined;
  NotificationDetail: {
    notificationId: string;
  };
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  WorkTab: NavigatorScreenParams<WorkStackParamList>;
  HistoryTab: NavigatorScreenParams<HistoryStackParamList>;
  WalletTab: NavigatorScreenParams<WalletStackParamList>;
  AccountTab: NavigatorScreenParams<AccountStackParamList>;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
