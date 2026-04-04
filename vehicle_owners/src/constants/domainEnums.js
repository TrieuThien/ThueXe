export const OWNER_VERIFICATION_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const OWNER_ACCOUNT_STATUS = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  SUSPENDED: 'suspended',
};

export const VEHICLE_USAGE_STATUS = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance',
  UNAVAILABLE: 'unavailable',
};

export const VEHICLE_VERIFICATION_STATUS = {
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  MISSING_DOCUMENTS: 'missing_documents',
  REJECTED: 'rejected',
};

export const VEHICLE_DOCUMENT_VERIFICATION_STATUS = {
  MISSING: 'missing',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export const RENTAL_BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

export const RENTAL_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL_PAID: 'partial_paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
};

export const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const WALLET_LEDGER_DIRECTION = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

export const WALLET_LEDGER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

export const SCHEDULE_BLOCK_TYPE = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  BOOKED: 'booked',
  MAINTENANCE: 'maintenance',
};
