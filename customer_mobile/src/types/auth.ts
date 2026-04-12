import { User } from "./user";

export type AuthIdentifierType = "EMAIL" | "PHONE";
export type AuthOtpPurpose = "ACCOUNT_ACTIVATION" | "PASSWORD_RESET";

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
  sessionId: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  verificationId: string;
  otpExpiredInSec: number;
  identifier: string;
  identifierType: AuthIdentifierType;
  requiresVerification: true;
}

export interface RequestOtpResponse {
  verificationId: string;
  otpExpiredInSec: number;
  identifier: string;
  identifierType: AuthIdentifierType;
  purpose: AuthOtpPurpose;
}

export interface VerifyOtpRequest {
  verificationId: string;
  otpCode: string;
  purpose: AuthOtpPurpose;
}

export interface VerifyOtpResponse {
  verified: boolean;
  purpose: AuthOtpPurpose;
  resetToken?: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ForgotPasswordResponse {
  verificationId: string;
  otpExpiredInSec: number;
  identifier: string;
  identifierType: AuthIdentifierType;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
}

export interface AuthApiErrorPayload {
  code:
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_ALREADY_EXISTS"
    | "OTP_INVALID"
    | "OTP_EXPIRED"
    | "IDENTIFIER_NOT_FOUND"
    | "RESET_TOKEN_INVALID"
    | "SERVER_ERROR";
  message: string;
  status: number;
}
