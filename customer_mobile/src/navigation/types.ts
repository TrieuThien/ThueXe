import { NavigatorScreenParams } from "@react-navigation/native";
import { AuthIdentifierType, AuthOtpPurpose } from "../types";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOTP: {
    verificationId: string;
    identifier: string;
    identifierType: AuthIdentifierType;
    purpose: AuthOtpPurpose;
  };
  ForgotPassword: undefined;
  ResetPassword: {
    resetToken: string;
    identifier: string;
  };
};

export type BookingStackParamList = {
  BookingHome: undefined;
  ActiveTrip: undefined;
  TripDetail: { bookingId: string };
  TripChat: { bookingId: string };
  DriverTrackingMap: { bookingId: string };
  TripHistoryList: undefined;
  TripHistoryDetail: { bookingId: string };
  RentalServiceChooser: undefined;
  RentalBookingForm: undefined;
  RentalPackageList: undefined;
  /** Danh sách xe khả dụng của gói thuê, sau khi chọn gói trên màn hình nearby */
  RentalPackageCars: { packageId: number; packageName: string };
  RentalBookingConfirm: undefined;
  RentalBookingSuccess: { bookingId: string; status: "PENDING" | "SCHEDULED"; message: string };
  RideLocationPicker: undefined;
  RideVehicleSelection: undefined;
  RideBookingConfirm: undefined;
  RideSearchingDriver: { bookingId: string };
  BookingHistory: undefined;
  BookingDetail: { bookingId: string };
};

export type WalletStackParamList = {
  WalletMain: undefined;
  PaymentMethod: { bookingId?: string; rentalBookingId?: string } | undefined;
  TopUpWallet: undefined;
  TransactionHistory: undefined;
  WithdrawalRequest: undefined;
};

export type AccountStackParamList = {
  AccountMain: undefined;
  AccountProfile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Booking: NavigatorScreenParams<BookingStackParamList>;
  Wallet: NavigatorScreenParams<WalletStackParamList>;
  Account: NavigatorScreenParams<AccountStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
