export const VEHICLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  MAINTENANCE: 'maintenance',
};

export const DOCUMENT_STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

export const MAINTENANCE_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
};

export const STATUS_LABELS = {
  [VEHICLE_STATUS.ACTIVE]: 'Đang hoạt động',
  [VEHICLE_STATUS.INACTIVE]: 'Tạm ngừng',
  [VEHICLE_STATUS.PENDING]: 'Chờ duyệt',
  [VEHICLE_STATUS.MAINTENANCE]: 'Bảo trì',
  [DOCUMENT_STATUS.APPROVED]: 'Đã duyệt',
  [DOCUMENT_STATUS.PENDING]: 'Chờ duyệt',
  [DOCUMENT_STATUS.REJECTED]: 'Bị từ chối',
  [DOCUMENT_STATUS.EXPIRED]: 'Hết hạn',
  [BOOKING_STATUS.CONFIRMED]: 'Đã xác nhận',
  [BOOKING_STATUS.PENDING]: 'Chờ xác nhận',
  [BOOKING_STATUS.IN_PROGRESS]: 'Đang thuê',
  [BOOKING_STATUS.COMPLETED]: 'Hoàn tất',
  [BOOKING_STATUS.CANCELED]: 'Đã hủy',
  [MAINTENANCE_STATUS.PLANNED]: 'Đã lên lịch',
  [MAINTENANCE_STATUS.IN_PROGRESS]: 'Đang xử lý',
  [MAINTENANCE_STATUS.DONE]: 'Hoàn tất',
  [PAYMENT_STATUS.PENDING]: 'Chờ thanh toán',
  [PAYMENT_STATUS.SUCCESS]: 'Thành công',
  [PAYMENT_STATUS.FAILED]: 'Thất bại',
  [PAYMENT_STATUS.REFUNDED]: 'Đã hoàn tiền',
  [WITHDRAWAL_STATUS.PENDING]: 'Chờ duyệt',
  [WITHDRAWAL_STATUS.APPROVED]: 'Đã duyệt',
  [WITHDRAWAL_STATUS.REJECTED]: 'Bị từ chối',
  [WITHDRAWAL_STATUS.PAID]: 'Đã thanh toán',
};

export const STATUS_VARIANTS = {
  active: 'success',
  approved: 'success',
  success: 'success',
  completed: 'success',
  done: 'success',
  paid: 'success',
  in_progress: 'info',
  maintenance: 'info',
  pending: 'warning',
  planned: 'warning',
  inactive: 'neutral',
  canceled: 'danger',
  rejected: 'danger',
  expired: 'danger',
  failed: 'danger',
  refunded: 'neutral',
};


