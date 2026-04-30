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
  RentalLocationPickup: undefined;
  RentalLocationDropoff: { pickupLocation: { address: string; coordinate: { latitude: number; longitude: number } } };
  RentalLocationMapPicker: { addressType: "pickup" | "dropoff" };
  RentalPackageList: undefined;
  /** Danh sách xe khả dụng của gói thuê, sau khi chọn gói trên màn hình nearby */
  RentalPackageCars: { packageId: number; packageName: string; packageBasePrice?: number; packageDurationHours?: number };
  /** Chi tiết xe thuê – truyền toàn bộ object xe để tránh fetch thêm */
  RentalCarDetail: {
    car: {
      vehicle_id: number;
      brand: string;
      model: string;
      year: string | null;
      color: string | null;
      license_plate: string;
      seat_count: number;
      transmission: "auto" | "manual";
      fuel_type: "petrol" | "diesel" | "electric" | "hybrid";
      status: string;
      type_name: string;
      owner_name: string | null;
      owner_phone: string | null;
      avg_rating: number | null;
      rating_count: number;
      photo_url?: string | null;
      interior_photo_urls?: string[];
    };
    packageId: number;
    packageName: string;
    packageBasePrice?: number;
    packageDurationHours?: number;
  };
  /** Xác nhận đặt xe thuê – chọn phương thức thanh toán và gửi yêu cầu */
  RentalVehicleConfirm: {
    car: {
      vehicle_id: number;
      brand: string;
      model: string;
      year: string | null;
      color: string | null;
      license_plate: string;
      seat_count: number;
      transmission: "auto" | "manual";
      fuel_type: "petrol" | "diesel" | "electric" | "hybrid";
      status: string;
      type_name: string;
      owner_name: string | null;
      owner_phone: string | null;
      avg_rating: number | null;
      rating_count: number;
      photo_url?: string | null;
      interior_photo_urls?: string[];
    };
    packageId: number;
    packageName: string;
    packageBasePrice?: number;
    packageDurationHours?: number;
  };
  RentalBookingConfirm: undefined;
  RentalBookingDetail: { bookingId: string };
  RentalBookingSuccess: { bookingId: string; status: "PENDING" | "SCHEDULED"; message: string };
  RideLocationPickup: undefined;
  RideLocationDropoff: {
    pickupLocation: { address: string; coordinate: { latitude: number; longitude: number } };
  };
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
