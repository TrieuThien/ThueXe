import type { DriverProfile, AuthTokens } from '../../types/auth';
import type { DriverAccountStatusResponse } from '../../types/driver';
import type { DriverNotification, DriverNotificationGroup } from '../../types/driver';

// ─── Backend shape types ───────────────────────────────────────────────────────

export type BackendDriver = {
  id?: number;
  driver_id?: number;
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_file?: string | null;
  car_model?: string | null;
  car_plate_num?: string | null;
  car_color?: string | null;
  car_year?: number | null;
  driver_rating?: number | null;
  available?: number;
  is_activated?: number;
  account_active?: number;
  operation_status?: string | null;
  bank_name?: string | null;
  bank_acc_num?: string | null;
  bank_acc_holder_name?: string | null;
};

export type BackendAccountStatus = {
  account_status?: {
    is_activated?: number;
    account_active?: number;
    available?: number;
    available_for_rental?: number;
    operation_status?: string | null;
  };
  flags?: {
    can_take_rides?: boolean;
    can_take_rentals?: boolean;
  };
};

export type BackendNotification = {
  id: number;
  n_type?: number | null;
  title?: string | null;
  body?: string | null;
  is_read?: number;
  created_at?: string | null;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapDriverProfile(d: BackendDriver): DriverProfile {
  const numericId = d.driver_id ?? d.id ?? 0;
  const isActivated = d.is_activated === 1;
  const isActive = d.account_active === 1;

  let accountStatus: DriverProfile['accountStatus'];
  if (isActivated && isActive) {
    accountStatus = 'da_kich_hoat';
  } else if (!isActivated) {
    accountStatus = 'chua_kich_hoat';
  } else {
    accountStatus = 'dang_cho_xac_thuc';
  }

  return {
    id: String(numericId),
    fullName: [d.firstname, d.lastname].filter(Boolean).join(' ') || 'Tài xế',
    phone: d.phone ?? '',
    email: d.email ?? '',
    avatarUrl: d.photo_file ?? undefined,
    rating: d.driver_rating ?? 0,
    online: d.available === 1,
    accountStatus,
    verificationStatus: isActivated ? 'verified' : 'pending',
    workingStatus: d.available === 1 ? 'online' : 'offline',
    vehicle: {
      model: d.car_model ?? '',
      plate: d.car_plate_num ?? '',
      color: d.car_color ?? '',
      year: d.car_year ?? 0
    },
    bank: {
      bankName: d.bank_name ?? '',
      accountNumber: d.bank_acc_num ?? '',
      accountHolder: d.bank_acc_holder_name ?? ''
    },
    vehicleName: d.car_model ?? undefined,
    vehiclePlate: d.car_plate_num ?? undefined
  };
}

export function mapAccountStatus(d: BackendAccountStatus): DriverAccountStatusResponse {
  const s = d.account_status ?? {};
  const isActivated = s.is_activated === 1;
  const isActive = s.account_active === 1;

  let accountStatus: DriverProfile['accountStatus'];
  if (isActivated && isActive) {
    accountStatus = 'da_kich_hoat';
  } else if (!isActivated) {
    accountStatus = 'chua_kich_hoat';
  } else {
    accountStatus = 'dang_cho_xac_thuc';
  }

  return {
    accountStatus,
    verificationStatus: isActivated ? 'verified' : 'pending',
    workingStatus: s.available === 1 ? 'online' : 'offline'
  };
}

export function buildAuthTokens(accessToken: string, refreshToken: string): AuthTokens {
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
}

// n_type integer → DriverNotificationGroup
const N_TYPE_MAP: Record<number, DriverNotificationGroup> = {
  1: 'chuyen_di',
  2: 'vi',
  3: 'ho_so',
  4: 'ho_tro'
};

export function mapNotification(n: BackendNotification): DriverNotification {
  return {
    id: String(n.id),
    group: N_TYPE_MAP[n.n_type ?? 0] ?? 'van_hanh',
    title: n.title ?? '',
    body: n.body ?? '',
    detail: n.body ?? '',
    createdAt: n.created_at ?? new Date().toISOString(),
    isRead: n.is_read === 1
  };
}
