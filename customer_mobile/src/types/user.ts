import { AppDateTime, ID } from "./common";

export interface User {
  id: ID;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  gender?: "male" | "female" | "other";
  country?: string;
  avatarUrl?: string;
  rewardPoints?: number;
  rewardPointsRedeemed?: number;
  isPhoneVerified: boolean;
  isEmailVerified?: boolean;
  accountStatus?: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
  createdAt: AppDateTime;
  updatedAt: AppDateTime;
}
