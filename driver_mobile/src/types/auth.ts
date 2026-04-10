export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type AccountStatus = 'da_kich_hoat' | 'chua_kich_hoat' | 'dang_cho_xac_thuc';
export type VerificationStatus = 'verified' | 'pending' | 'rejected';
export type WorkingStatus = 'online' | 'offline' | 'busy';

export type DriverVehicleInfo = {
  model: string;
  plate: string;
  color: string;
  year: number;
};

export type DriverBankInfo = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export type DriverProfile = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  rating: number;
  online: boolean;
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  workingStatus: WorkingStatus;
  vehicle: DriverVehicleInfo;
  bank: DriverBankInfo;
  vehicleName?: string;
  vehiclePlate?: string;
};

export type UpdateDriverProfilePayload = {
  fullName: string;
  email: string;
  bank: DriverBankInfo;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  profile: DriverProfile;
  tokens: AuthTokens;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type OtpPurpose = 'register' | 'forgot_password';

export type OtpChallengeResponse = {
  otpRef: string;
  expiresIn: number;
  identifier: string;
  purpose: OtpPurpose;
};

export type VerifyOtpPayload = {
  otpRef: string;
  identifier: string;
  otp: string;
  purpose: OtpPurpose;
};

export type VerifyOtpResponse = {
  verified: boolean;
  resetToken?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  identifier: string;
  resetToken: string;
  newPassword: string;
};

export type ServiceErrorCode =
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'EMAIL_NOT_FOUND'
  | 'INVALID_PASSWORD'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'DUPLICATE_ACCOUNT'
  | 'INVALID_RESET_TOKEN'
  | 'LOCATION_PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'GPS_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export type ServiceError = {
  message: string;
  code: ServiceErrorCode;
  status?: number;
};
