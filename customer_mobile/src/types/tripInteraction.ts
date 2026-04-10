import { AppDateTime, ID } from "./common";

export type ChatParticipantRole = "CUSTOMER" | "DRIVER" | "OWNER" | "SYSTEM";

export type ChatDeliveryStatus = "SENDING" | "SENT" | "FAILED";

export interface TripChatMessage {
  id: ID;
  bookingId: ID;
  userId?: ID;
  driverId?: ID;
  senderRole: ChatParticipantRole;
  receiverRole?: Exclude<ChatParticipantRole, "SYSTEM">;
  content: string;
  createdAt: AppDateTime;
  deliveryStatus: ChatDeliveryStatus;
}

export interface TripChatThreadResponse {
  bookingId: ID;
  canChat: boolean;
  disabledReason?: string;
  messages: TripChatMessage[];
}

export interface SendTripMessageRequest {
  bookingId: ID;
  content: string;
  receiverRole?: Exclude<ChatParticipantRole, "SYSTEM">;
}

export interface SendTripMessageResponse {
  message: TripChatMessage;
}

export interface TripCancelPolicy {
  bookingId: ID;
  canCancel: boolean;
  disabledReason?: string;
  warningText?: string;
  estimatedCancellationFee?: number;
  reasons: string[];
}

export interface CancelTripRequest {
  bookingId: ID;
  reason: string;
}

export interface CancelTripResponse {
  bookingId: ID;
  newStatus: "CANCELLED";
  cancellationFee: number;
  message: string;
}
