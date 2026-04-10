import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { MOCK_NETWORK_DELAY } from '../../constants/app';
import type { ApiResponse } from '../../types/api';
import type {
  AuthTokens,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  OtpChallengeResponse,
  OtpPurpose,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateDriverProfilePayload,
  VerifyOtpPayload,
  VerifyOtpResponse
} from '../../types/auth';
import type {
  CurrentTrip,
  DashboardSummary,
  DriverAccountStatusResponse,
  DriverNotification,
  TripHistoryItem,
  WalletOverview
} from '../../types/driver';
import type {
  CreateSupportTicketPayload,
  CreateSupportTicketResponse,
  SendSupportMessagePayload,
  SupportAttachment,
  SupportIssueTopic,
  SupportMessage,
  SupportMockImage,
  SupportTicket
} from '../../types/support';
import type {
  CreateUnavailableSlotPayload,
  DriverScheduleResponse,
  DriverScheduleSlot,
  RentalBookingDetail,
  RentalBookingSummary,
  ScheduleViewMode,
  UpdateDriverScheduleSlotPayload
} from '../../types/schedule';
import type {
  PaginatedTripHistoryResponse,
  TripHistoryDetail,
  TripHistoryListItem,
  TripHistoryStatus
} from '../../types/history';
import type { ActiveTrip, TripSummary } from '../../types/trip';
import type {
  CreateTopupPaymentPayload,
  CreateTopupPaymentResponse,
  CreateWithdrawalPayload,
  CreateWithdrawalResponse,
  IncomePeriod,
  IncomeStatsResponse,
  PayoutAccount,
  TopupPaymentCallbackPayload,
  TopupPaymentCallbackResponse,
  TopupResultStatus,
  WalletSummary,
  WalletTransaction,
  WalletTransactionsResponse,
  WithdrawalHistoryResponse,
  WithdrawalRequest
} from '../../types/wallet';
import type { DriverLocation, ServiceTypeId, WorkingOverview } from '../../types/working';
import {
  mockCurrentTrip,
  mockDashboard,
  mockDriver,
  mockNotifications,
  mockRentalBookingDetails,
  mockDriverScheduleSlots,
  mockSupportImageLibrary,
  mockSupportMessagesByTicket,
  mockSupportTopics,
  mockSupportTickets,
  mockTripHistory,
  mockWallet
} from './db';

type Method = 'GET' | 'POST' | 'PATCH';

type MockAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  verified: boolean;
};

type OtpRecord = {
  otpRef: string;
  identifier: string;
  otp: string;
  purpose: OtpPurpose;
  expiresAt: number;
};

type ResetTokenRecord = {
  identifier: string;
  resetToken: string;
  expiresAt: number;
};

let notificationsData = [...mockNotifications];
let driverProfile = { ...mockDriver };
let supportTopicsData: SupportIssueTopic[] = [...mockSupportTopics];
let supportTicketsData: SupportTicket[] = [...mockSupportTickets];
let supportImageLibraryData: SupportMockImage[] = [...mockSupportImageLibrary];
let availableForRentalData = true;
let driverScheduleSlotsData: DriverScheduleSlot[] = [...mockDriverScheduleSlots];
let rentalBookingDetailsData: RentalBookingDetail[] = [...mockRentalBookingDetails];
let supportMessagesByTicketData: Record<string, SupportMessage[]> = Object.fromEntries(
  Object.entries(mockSupportMessagesByTicket).map(([ticketId, messages]) => [
    ticketId,
    messages.map((message) => ({
      ...message,
      attachments: message.attachments.map((attachment) => ({ ...attachment }))
    }))
  ])
);

let workingOverview: WorkingOverview = {
  isOnline: driverProfile.online,
  operationZone: 'Quan 1, Quan 3, Phu Nhuan',
  gpsStatus: 'ready',
  permissionStatus: 'denied',
  networkStatus: 'online',
  workingStatusLabel: driverProfile.online ? 'Dang online' : 'Dang offline',
  activeServiceTypes: ['goi_xe'],
  lastLocation: null,
  autoUpdating: false
};

let activeTrip: ActiveTrip | null = {
  tripId: 'TX-240410-001',
  customerName: 'Tran Minh Anh',
  customerPhone: '0912345678',
  pickupAddress: 'Ben Thanh, Quan 1',
  dropoffAddress: 'San bay Tan Son Nhat',
  estimatedDistanceKm: 7.8,
  estimatedDurationMin: 24,
  estimatedFare: 165000,
  status: 'incoming',
  paymentStatus: 'pending',
  expiresAt: new Date(Date.now() + 90 * 1000).toISOString()
};
let acceptedAtMs: number | null = null;

let tripSummaries: TripSummary[] = [];
let historyDetailsDataset: TripHistoryDetail[] = [];

const WALLET_TRANSACTION_TYPES: WalletTransaction['type'][] = [
  'nap_tien',
  'thanh_toan',
  'khau_tru',
  'rut_tien',
  'hoan_tien'
];

let walletSummaryData: WalletSummary = {
  currentBalance: 5420000,
  todayIncome: 1320000,
  monthIncome: 24300000,
  completedTrips: 212
};

let payoutAccountData: PayoutAccount | null = {
  bankName: 'Vietcombank',
  accountNumber: '0123456789',
  accountHolder: 'NGUYEN VAN TAI'
};

let walletTransactionsData: WalletTransaction[] = Array.from({ length: 80 }).map((_, index) => {
  const amount = 80000 + (index % 9) * 25000;
  const type = WALLET_TRANSACTION_TYPES[index % WALLET_TRANSACTION_TYPES.length];
  return {
    id: `txn-${index + 1}`,
    createdAt: new Date(Date.now() - index * 1000 * 60 * 180).toISOString(),
    type,
    title:
      type === 'nap_tien'
        ? 'Nap tien vao vi'
        : type === 'thanh_toan'
          ? 'Thanh toan cuoc phi'
          : type === 'khau_tru'
            ? 'Khau tru phi he thong'
            : type === 'rut_tien'
              ? 'Rut tien ve ngan hang'
              : 'Hoan tien giao dich',
    amount: type === 'khau_tru' || type === 'rut_tien' ? -amount : amount,
    balanceAfter: 5000000 + index * 30000,
    note: `Giao dich #${index + 1}`
  };
});

let withdrawalHistoryData: WithdrawalRequest[] = [
  {
    id: 'wd-001',
    amount: 800000,
    status: 'paid',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    note: 'Da chuyen tien vao tai khoan ngan hang'
  },
  {
    id: 'wd-002',
    amount: 400000,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    note: 'Dang cho doi soat'
  },
  {
    id: 'wd-003',
    amount: 300000,
    status: 'failed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    note: 'Loi ket noi ngan hang'
  },
  {
    id: 'wd-004',
    amount: 250000,
    status: 'cancelled',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    note: 'Tai xe huy yeu cau'
  }
];

let topupPayments: Record<
  string,
  {
    amount: number;
    paymentMethod: 'momo' | 'zalopay' | 'banking';
    expiresAt: string;
    status: TopupResultStatus | 'pending';
  }
> = {};

let accounts: MockAccount[] = [
  {
    id: mockDriver.id,
    fullName: mockDriver.fullName,
    email: 'driver@thuexe.vn',
    phone: mockDriver.phone,
    password: '123456',
    verified: true
  }
];

let otpRecords: OtpRecord[] = [];
let resetTokenRecords: ResetTokenRecord[] = [];

const OTP_TTL_SECONDS = 90;

const HISTORY_STATUSES: TripHistoryStatus[] = ['hoan_thanh', 'da_huy', 'da_tu_choi'];
const ADDRESSES = [
  'Ben Thanh, Quan 1',
  'Thu Duc, TP HCM',
  'San bay Tan Son Nhat',
  'Binh Thanh, TP HCM',
  'Quan 7, TP HCM',
  'Go Vap, TP HCM'
];

function generateHistoryDetails(): TripHistoryDetail[] {
  const statuses: TripHistoryStatus[] =
    Array.isArray(HISTORY_STATUSES) && HISTORY_STATUSES.length ? HISTORY_STATUSES : ['hoan_thanh'];
  const addresses = Array.isArray(ADDRESSES) && ADDRESSES.length ? ADDRESSES : ['TP HCM'];

  return Array.from({ length: 120 }).map((_, index) => {
    const status = statuses[index % statuses.length];
    const pickup = addresses[index % addresses.length];
    const dropoff = addresses[(index + 2) % addresses.length];
    const pickupAt = new Date(Date.now() - (index + 1) * 1000 * 60 * 60 * 5);
    const startAt = new Date(pickupAt.getTime() + 1000 * 60 * 5);
    const doneAt = new Date(startAt.getTime() + 1000 * 60 * (18 + (index % 16)));
    const fare = 90000 + (index % 10) * 15000;
    const commission = Math.round(fare * 0.2);

      return {
      tripId: `history-${index + 1}`,
      tripCode: `TXH-${(10000 + index).toString()}`,
      status,
      pickupTime: pickupAt.toISOString(),
      startTime: startAt.toISOString(),
      completedTime: status === 'hoan_thanh' ? doneAt.toISOString() : undefined,
      distanceKm: Number((4 + (index % 12) * 0.8).toFixed(1)),
      fare,
      systemCommission: commission,
      netIncome: fare - commission,
      paymentMethod: index % 2 === 0 ? 'tien_mat' : 'vi_dien_tu',
      customer: {
        name: `Khach ${index + 1}`,
        phone: `09${(10000000 + index).toString().slice(0, 8)}`
      },
      pickupAddress: pickup,
      dropoffAddress: dropoff,
      timeline: [
        { status: 'Nhan yeu cau', at: new Date(pickupAt.getTime() - 1000 * 60 * 7).toISOString() },
        { status: 'Den diem don', at: pickupAt.toISOString() },
        { status: 'Bat dau chuyen', at: startAt.toISOString() },
        status === 'hoan_thanh'
          ? { status: 'Hoan thanh', at: doneAt.toISOString() }
          : status === 'da_huy'
            ? { status: 'Khach huy', at: new Date(startAt.getTime() + 1000 * 60 * 4).toISOString(), note: 'Khach huy giua chuyen' }
            : { status: 'Tai xe tu choi', at: new Date(pickupAt.getTime() - 1000 * 60 * 1).toISOString() }
      ]
      };
  });
}

historyDetailsDataset = generateHistoryDetails();

const createTokens = (): AuthTokens => ({
  accessToken: `access-${Date.now()}`,
  refreshToken: `refresh-${Date.now()}`,
  expiresAt: Date.now() + 1000 * 60 * 15
});

const ok = <T>(data: T, config: AxiosRequestConfig, message = 'OK'): AxiosResponse<ApiResponse<T>> => ({
  data: { success: true, message, data },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: config as never
});

const failed = (status: number, message: string, code: string, config: AxiosRequestConfig): AxiosResponse => ({
  data: { success: false, message, code },
  status,
  statusText: status === 401 ? 'Unauthorized' : status === 404 ? 'Not Found' : 'Bad Request',
  headers: {},
  config: config as never
});

const isEmail = (value: string) => value.includes('@');
const normalize = (value: string) => value.trim().toLowerCase();

const findAccount = (identifier: string) => {
  if (isEmail(identifier)) {
    return accounts.find((item) => normalize(item.email) === normalize(identifier));
  }
  return accounts.find((item) => item.phone === identifier.trim());
};

const syncWorkingToProfile = () => {
  driverProfile = {
    ...driverProfile,
    online: workingOverview.isOnline,
    workingStatus: workingOverview.isOnline ? 'online' : 'offline'
  };
};

const updateZoneByLocation = (location: DriverLocation) => {
  if (location.lat > 10.78) {
    workingOverview.operationZone = 'Thu Duc, Binh Thanh';
    return;
  }
  workingOverview.operationZone = 'Quan 1, Quan 3, Phu Nhuan';
};

const buildAccountStatusResponse = (): DriverAccountStatusResponse => ({
  accountStatus: driverProfile.accountStatus,
  verificationStatus: driverProfile.verificationStatus,
  workingStatus: driverProfile.workingStatus
});

const createOtpChallenge = (identifier: string, purpose: OtpPurpose): OtpChallengeResponse => {
  otpRecords = otpRecords.filter((item) => !(item.identifier === identifier && item.purpose === purpose));

  const record: OtpRecord = {
    otpRef: `otp-${Date.now()}`,
    identifier,
    otp: '123456',
    purpose,
    expiresAt: Date.now() + OTP_TTL_SECONDS * 1000
  };

  otpRecords.push(record);

  return {
    otpRef: record.otpRef,
    expiresIn: OTP_TTL_SECONDS,
    identifier,
    purpose
  };
};

const shouldRejectToken = (config: AxiosRequestConfig) => {
  const path = config.url ?? '';
  if (path.startsWith('/auth/')) {
    return false;
  }
  const authHeader = config.headers?.Authorization as string | undefined;
  return !authHeader || !authHeader.includes('access-');
};

const parseBody = <T>(config: AxiosRequestConfig): T =>
  (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as T;

const toHistoryListItem = (detail: TripHistoryDetail): TripHistoryListItem => ({
  tripId: detail.tripId,
  tripCode: detail.tripCode,
  customerName: detail.customer.name,
  pickupAddress: detail.pickupAddress,
  dropoffAddress: detail.dropoffAddress,
  pickupTime: detail.pickupTime,
  completedTime: detail.completedTime,
  fare: detail.fare,
  netIncome: detail.netIncome,
  status: detail.status
});

const buildIncomeStats = (period: IncomePeriod): IncomeStatsResponse => {
  if (period === 'day') {
    const points = Array.from({ length: 7 }).map((_, index) => ({
      label: `D${index + 1}`,
      amount: 300000 + (index % 5) * 180000
    }));
    return {
      period,
      points,
      total: points.reduce((sum, item) => sum + item.amount, 0)
    };
  }

  const points = Array.from({ length: 6 }).map((_, index) => ({
    label: `T${index + 1}`,
    amount: 9800000 + index * 850000
  }));
  return {
    period,
    points,
    total: points.reduce((sum, item) => sum + item.amount, 0)
  };
};

const refreshTripStatusByTime = () => {
  if (activeTrip?.status === 'incoming' && activeTrip.expiresAt) {
    if (Date.now() > new Date(activeTrip.expiresAt).getTime()) {
      activeTrip = {
        ...activeTrip,
        status: 'timeout'
      };
    }
  }

  if (activeTrip?.status === 'accepted' && acceptedAtMs && Date.now() - acceptedAtMs > 45000) {
    activeTrip = {
      ...activeTrip,
      status: 'cancelled',
      cancelReason: 'Khach hang huy chuyen sau khi doi qua lau.'
    };
    acceptedAtMs = null;
  }
};

const SUPPORT_SUBJECT_BY_TYPE: Record<CreateSupportTicketPayload['issueType'], string> = {
  tai_khoan: 'Ho tro tai khoan',
  chuyen_di: 'Ho tro chuyen di',
  vi: 'Ho tro vi',
  phuong_tien: 'Ho tro phuong tien',
  ho_so: 'Ho tro ho so'
};

const sortSupportTickets = () => {
  supportTicketsData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

const toSupportAttachment = (attachment: SupportAttachment): SupportAttachment => ({
  id: attachment.id || `att-${Date.now()}`,
  type: 'image',
  fileName: attachment.fileName,
  uri: attachment.uri,
  width: attachment.width,
  height: attachment.height
});

const sortNotifications = (items: DriverNotification[]) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const toRangeByView = (dateIso: string, viewMode: ScheduleViewMode) => {
  const start = new Date(dateIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (viewMode === 'day' ? 1 : 7));
  return { start, end };
};

const inRange = (slot: DriverScheduleSlot, start: Date, end: Date) =>
  new Date(slot.startAt).getTime() < end.getTime() && new Date(slot.endAt).getTime() > start.getTime();

const toBookingSummary = (detail: RentalBookingDetail): RentalBookingSummary => ({
  id: detail.id,
  bookingCode: detail.bookingCode,
  customerName: detail.customerName,
  startAt: detail.startAt,
  endAt: detail.endAt,
  status: detail.status,
  pickupAddress: detail.pickupAddress,
  dropoffAddress: detail.dropoffAddress
});

const buildScheduleResponse = (date: string, viewMode: ScheduleViewMode): DriverScheduleResponse => {
  const { start, end } = toRangeByView(date, viewMode);
  const slots = driverScheduleSlotsData
    .filter((slot) => inRange(slot, start, end))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const assignedBookings = rentalBookingDetailsData
    .filter((booking) => {
      const bookingStart = new Date(booking.startAt).getTime();
      return booking.status !== 'cancelled' && bookingStart >= start.getTime() && bookingStart < end.getTime();
    })
    .map(toBookingSummary)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return {
    date,
    viewMode,
    availableForRental: availableForRentalData,
    slots,
    assignedBookings,
    summary: {
      available: slots.filter((item) => item.status === 'available').length,
      booked: slots.filter((item) => item.status === 'booked').length,
      unavailable: slots.filter((item) => item.status === 'unavailable').length
    }
  };
};

export const mockApiAdapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_NETWORK_DELAY));
  refreshTripStatusByTime();

  const method = (config.method?.toUpperCase() as Method) ?? 'GET';
  const url = config.url ?? '';

  if (shouldRejectToken(config)) {
    return failed(401, 'Unauthorized', 'UNAUTHORIZED', config);
  }

  if (method === 'POST' && url === '/auth/register') {
    const body = parseBody<RegisterPayload>(config);
    const duplicated =
      accounts.some((item) => normalize(item.email) === normalize(body.email)) ||
      accounts.some((item) => item.phone === body.phone);

    if (duplicated) {
      return failed(400, 'Email hoac so dien thoai da ton tai', 'DUPLICATE_ACCOUNT', config);
    }

    accounts.push({
      id: `d-${Date.now()}`,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      password: body.password,
      verified: false
    });

    return ok(createOtpChallenge(body.email, 'register'), config, 'Dang ky thanh cong. Vui long xac thuc OTP');
  }

  if (method === 'POST' && url === '/auth/login') {
    const body = parseBody<LoginPayload>(config);
    const account = findAccount(body.identifier);

    if (!account) {
      return failed(404, 'Email hoac so dien thoai chua ton tai', 'EMAIL_NOT_FOUND', config);
    }
    if (account.password !== body.password) {
      return failed(400, 'Mat khau khong chinh xac', 'INVALID_PASSWORD', config);
    }
    if (!account.verified) {
      return failed(403, 'Tai khoan chua xac thuc OTP', 'ACCOUNT_NOT_VERIFIED', config);
    }

    driverProfile = {
      ...driverProfile,
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone
    };

    return ok<LoginResponse>({ profile: driverProfile, tokens: createTokens() }, config, 'Dang nhap thanh cong');
  }

  if (method === 'POST' && url === '/auth/verify-otp') {
    const body = parseBody<VerifyOtpPayload>(config);
    const record = otpRecords.find(
      (item) => item.otpRef === body.otpRef && item.identifier === body.identifier && item.purpose === body.purpose
    );

    if (!record || body.otp !== record.otp) {
      return failed(400, 'Ma OTP khong dung', 'OTP_INVALID', config);
    }
    if (Date.now() > record.expiresAt) {
      return failed(400, 'Ma OTP da het han', 'OTP_EXPIRED', config);
    }

    otpRecords = otpRecords.filter((item) => item.otpRef !== record.otpRef);

    if (body.purpose === 'register') {
      accounts = accounts.map((item) =>
        normalize(item.email) === normalize(body.identifier) ? { ...item, verified: true } : item
      );
      driverProfile = {
        ...driverProfile,
        accountStatus: 'da_kich_hoat',
        verificationStatus: 'verified'
      };
      return ok<VerifyOtpResponse>({ verified: true }, config, 'Xac thuc tai khoan thanh cong');
    }

    const resetToken = `reset-${Date.now()}`;
    resetTokenRecords = resetTokenRecords.filter((item) => item.identifier !== body.identifier);
    resetTokenRecords.push({
      identifier: body.identifier,
      resetToken,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    return ok<VerifyOtpResponse>({ verified: true, resetToken }, config, 'OTP hop le');
  }

  if (method === 'POST' && url === '/auth/resend-otp') {
    const body = parseBody<{ identifier: string; purpose: OtpPurpose }>(config);
    return ok(createOtpChallenge(body.identifier, body.purpose), config, 'Da gui lai OTP');
  }

  if (method === 'POST' && url === '/auth/forgot-password') {
    const body = parseBody<ForgotPasswordPayload>(config);
    const account = accounts.find((item) => normalize(item.email) === normalize(body.email));

    if (!account) {
      return failed(404, 'Email chua ton tai trong he thong', 'EMAIL_NOT_FOUND', config);
    }

    return ok(createOtpChallenge(account.email, 'forgot_password'), config, 'OTP da duoc gui den email');
  }

  if (method === 'POST' && url === '/auth/reset-password') {
    const body = parseBody<ResetPasswordPayload>(config);
    const tokenRecord = resetTokenRecords.find(
      (item) => item.identifier === body.identifier && item.resetToken === body.resetToken
    );

    if (!tokenRecord || Date.now() > tokenRecord.expiresAt) {
      return failed(400, 'Phien dat lai mat khau khong hop le', 'INVALID_RESET_TOKEN', config);
    }

    accounts = accounts.map((item) =>
      normalize(item.email) === normalize(body.identifier) ? { ...item, password: body.newPassword } : item
    );
    resetTokenRecords = resetTokenRecords.filter((item) => item.identifier !== body.identifier);

    return ok({ success: true }, config, 'Dat lai mat khau thanh cong');
  }

  if (method === 'POST' && url === '/auth/refresh') {
    return ok<AuthTokens>(createTokens(), config, 'Lam moi token thanh cong');
  }

  if (method === 'GET' && url === '/driver/profile') {
    return ok(driverProfile, config);
  }

  if (method === 'PATCH' && url === '/driver/profile') {
    const body = parseBody<UpdateDriverProfilePayload>(config);
    driverProfile = {
      ...driverProfile,
      fullName: body.fullName,
      email: body.email,
      bank: {
        ...driverProfile.bank,
        ...body.bank
      }
    };
    return ok(driverProfile, config, 'Cap nhat thong tin tai khoan thanh cong');
  }

  if (method === 'GET' && url === '/driver/account-status') {
    return ok<DriverAccountStatusResponse>(buildAccountStatusResponse(), config);
  }

  if (method === 'GET' && url === '/driver/working-overview') {
    return ok(workingOverview, config);
  }

  if (method === 'PATCH' && url === '/driver/working-status') {
    const body = parseBody<{ online: boolean }>(config);

    if (body.online && workingOverview.permissionStatus !== 'granted') {
      return failed(403, 'Can cap quyen vi tri truoc khi bat online', 'LOCATION_PERMISSION_DENIED', config);
    }

    if (body.online && workingOverview.gpsStatus === 'disabled') {
      return failed(400, 'GPS dang tat, khong the bat online', 'GPS_DISABLED', config);
    }

    workingOverview = {
      ...workingOverview,
      isOnline: body.online,
      workingStatusLabel: body.online ? 'Dang nhan chuyen' : 'Tam nghi'
    };
    syncWorkingToProfile();
    return ok(workingOverview, config, 'Cap nhat trang thai thanh cong');
  }

  if (method === 'GET' && url === '/driver/active-service-types') {
    return ok<ServiceTypeId[]>(workingOverview.activeServiceTypes, config);
  }

  if (method === 'PATCH' && url === '/driver/active-service-types') {
    const body = parseBody<{ serviceTypes: ServiceTypeId[] }>(config);
    workingOverview = {
      ...workingOverview,
      activeServiceTypes: body.serviceTypes
    };
    return ok<ServiceTypeId[]>(workingOverview.activeServiceTypes, config, 'Cap nhat loai hinh thanh cong');
  }

  if (method === 'GET' && url === '/driver/location/status') {
    return ok(
      {
        gpsStatus: workingOverview.gpsStatus,
        permissionStatus: workingOverview.permissionStatus,
        networkStatus: workingOverview.networkStatus,
        lastLocation: workingOverview.lastLocation
      },
      config
    );
  }

  if (method === 'PATCH' && url === '/driver/location/permission') {
    const body = parseBody<{ permissionStatus: 'granted' | 'denied' }>(config);
    workingOverview = {
      ...workingOverview,
      permissionStatus: body.permissionStatus
    };
    return ok(workingOverview, config, 'Cap nhat quyen vi tri thanh cong');
  }

  if (method === 'PATCH' && url === '/driver/location/manual-update') {
    if (workingOverview.networkStatus === 'offline') {
      return failed(503, 'Khong co ket noi mang', 'NETWORK_ERROR', config);
    }
    if (workingOverview.permissionStatus !== 'granted') {
      return failed(403, 'Can cap quyen vi tri', 'LOCATION_PERMISSION_DENIED', config);
    }
    if (workingOverview.gpsStatus === 'disabled') {
      return failed(400, 'GPS dang tat', 'GPS_DISABLED', config);
    }

    const body = parseBody<DriverLocation>(config);
    updateZoneByLocation(body);
    workingOverview = {
      ...workingOverview,
      lastLocation: body
    };

    return ok(workingOverview, config, 'Da cap nhat vi tri');
  }

  if (method === 'PATCH' && url === '/driver/location/auto-update') {
    const body = parseBody<{ enabled: boolean }>(config);
    workingOverview = {
      ...workingOverview,
      autoUpdating: body.enabled
    };
    return ok(workingOverview, config, 'Cap nhat che do tu dong thanh cong');
  }

  if (method === 'GET' && url === '/driver/schedule') {
    const date = String(config.params?.date ?? new Date().toISOString()).trim();
    const viewMode = (String(config.params?.viewMode ?? 'day') as ScheduleViewMode) || 'day';
    return ok(buildScheduleResponse(date, viewMode), config);
  }

  if (method === 'POST' && url === '/driver/schedule/unavailable') {
    const body = parseBody<CreateUnavailableSlotPayload>(config);
    const startTime = new Date(body.startAt).getTime();
    const endTime = new Date(body.endAt).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      return failed(400, 'Khoang thoi gian khong hop le', 'INVALID_TIME_RANGE', config);
    }

    const blockedSlot: DriverScheduleSlot = {
      id: `sch-un-${Date.now()}`,
      startAt: body.startAt,
      endAt: body.endAt,
      status: 'unavailable',
      source: 'driver_schedule',
      note: body.note
    };
    driverScheduleSlotsData = [blockedSlot, ...driverScheduleSlotsData];

    return ok(buildScheduleResponse(body.startAt, 'day'), config, 'Da tao khoang thoi gian ban');
  }

  if (method === 'PATCH' && url === '/driver/schedule/slot') {
    const body = parseBody<UpdateDriverScheduleSlotPayload>(config);
    const target = driverScheduleSlotsData.find((item) => item.id === body.slotId);

    if (!target) {
      return failed(404, 'Khong tim thay slot', 'NOT_FOUND', config);
    }
    if (target.status === 'booked') {
      return failed(400, 'Khong the sua slot da duoc dat', 'SLOT_BOOKED_LOCKED', config);
    }

    driverScheduleSlotsData = driverScheduleSlotsData.map((slot) =>
      slot.id === body.slotId
        ? {
            ...slot,
            status: body.status,
            note: body.note ?? slot.note
          }
        : slot
    );

    return ok(buildScheduleResponse(target.startAt, 'day'), config, 'Cap nhat slot thanh cong');
  }

  if (method === 'GET' && url === '/driver/rental-bookings/detail') {
    const bookingId = String(config.params?.bookingId ?? '').trim();
    const booking = rentalBookingDetailsData.find((item) => item.id === bookingId);
    if (!booking) {
      return failed(404, 'Khong tim thay booking', 'NOT_FOUND', config);
    }
    return ok<RentalBookingDetail>(booking, config);
  }

  if (method === 'GET' && url === '/driver/trips/current') {
    return ok(activeTrip, config);
  }

  if (method === 'POST' && url === '/driver/trips/accept') {
    const body = parseBody<{ tripId: string }>(config);
    if (!activeTrip || activeTrip.tripId !== body.tripId) {
      return failed(404, 'Khong tim thay yeu cau chuyen', 'NOT_FOUND', config);
    }
    if (activeTrip.status === 'timeout') {
      return failed(400, 'Yeu cau da het han', 'TRIP_TIMEOUT', config);
    }

    activeTrip = {
      ...activeTrip,
      status: 'accepted',
      expiresAt: undefined
    };
    acceptedAtMs = Date.now();
    return ok(activeTrip, config, 'Da chap nhan chuyen');
  }

  if (method === 'POST' && url === '/driver/trips/reject') {
    const body = parseBody<{ tripId: string }>(config);
    if (!activeTrip || activeTrip.tripId !== body.tripId) {
      return failed(404, 'Khong tim thay yeu cau chuyen', 'NOT_FOUND', config);
    }
    activeTrip = null;
    acceptedAtMs = null;
    return ok({ success: true }, config, 'Da tu choi chuyen');
  }

  if (method === 'POST' && url === '/driver/trips/arrived') {
    const body = parseBody<{ tripId: string }>(config);
    if (!activeTrip || activeTrip.tripId !== body.tripId) {
      return failed(404, 'Khong tim thay chuyen di', 'NOT_FOUND', config);
    }
    activeTrip = {
      ...activeTrip,
      status: 'arrived_pickup'
    };
    return ok(activeTrip, config, 'Da den diem don');
  }

  if (method === 'POST' && url === '/driver/trips/start') {
    const body = parseBody<{ tripId: string }>(config);
    if (!activeTrip || activeTrip.tripId !== body.tripId) {
      return failed(404, 'Khong tim thay chuyen di', 'NOT_FOUND', config);
    }
    activeTrip = {
      ...activeTrip,
      status: 'in_progress'
    };
    acceptedAtMs = null;
    return ok(activeTrip, config, 'Da bat dau chuyen');
  }

  if (method === 'PATCH' && url === '/driver/trips/location') {
    const body = parseBody<{ tripId: string; lat: number; lng: number }>(config);
    if (!activeTrip || activeTrip.tripId !== body.tripId) {
      return failed(404, 'Khong tim thay chuyen di', 'NOT_FOUND', config);
    }
    if (workingOverview.networkStatus === 'offline') {
      return failed(503, 'Khong co ket noi mang', 'NETWORK_ERROR', config);
    }
    if (activeTrip.status === 'cancelled') {
      return failed(400, 'Khach da huy chuyen', 'TRIP_CANCELLED', config);
    }

    const nextLocation: DriverLocation = {
      lat: body.lat,
      lng: body.lng,
      updatedAt: new Date().toISOString()
    };
    workingOverview = {
      ...workingOverview,
      lastLocation: nextLocation
    };
    return ok(activeTrip, config, 'Da cap nhat vi tri chuyen');
  }

  if (method === 'POST' && url === '/driver/trips/finish') {
    const body = parseBody<{ tripId: string }>(config);
    if (!activeTrip || activeTrip.tripId !== body.tripId) {
      return failed(404, 'Khong tim thay chuyen di', 'NOT_FOUND', config);
    }

    const summary: TripSummary = {
      tripId: activeTrip.tripId,
      customerName: activeTrip.customerName,
      pickupAddress: activeTrip.pickupAddress,
      dropoffAddress: activeTrip.dropoffAddress,
      totalDistanceKm: Number((activeTrip.estimatedDistanceKm + 0.6).toFixed(1)),
      totalDurationMin: activeTrip.estimatedDurationMin + 4,
      estimatedFare: activeTrip.estimatedFare,
      actualFare: Math.round(activeTrip.estimatedFare * 1.08),
      paymentStatus: 'paid_cash',
      completedAt: new Date().toISOString()
    };
    tripSummaries = [summary, ...tripSummaries];
    activeTrip = null;
    acceptedAtMs = null;
    return ok(summary, config, 'Da ket thuc chuyen');
  }

  if (method === 'GET' && url.startsWith('/driver/trips/summary')) {
    const tripId = String(config.params?.tripId ?? '');
    const summary = tripSummaries.find((item) => item.tripId === tripId);
    if (!summary) {
      return failed(404, 'Khong tim thay tom tat chuyen', 'NOT_FOUND', config);
    }
    return ok(summary, config);
  }

  if (method === 'GET' && url === '/driver/dashboard') {
    return ok<DashboardSummary>(mockDashboard, config);
  }

  if (method === 'GET' && url === '/driver/history/list') {
    const page = Number(config.params?.page ?? 1);
    const pageSize = Number(config.params?.pageSize ?? 12);
    const search = String(config.params?.search ?? '').trim().toLowerCase();
    const status = String(config.params?.status ?? 'tat_ca');
    const fromDate = String(config.params?.fromDate ?? '').trim();
    const toDate = String(config.params?.toDate ?? '').trim();

    let filtered = [...historyDetailsDataset];

    if (search) {
      filtered = filtered.filter((item) => item.tripCode.toLowerCase().includes(search));
    }
    if (status && status !== 'tat_ca') {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (fromDate) {
      const fromTime = new Date(fromDate).getTime();
      if (!Number.isNaN(fromTime)) {
        filtered = filtered.filter((item) => new Date(item.pickupTime).getTime() >= fromTime);
      }
    }
    if (toDate) {
      const toTime = new Date(toDate).getTime();
      if (!Number.isNaN(toTime)) {
        filtered = filtered.filter((item) => new Date(item.pickupTime).getTime() <= toTime + 1000 * 60 * 60 * 24);
      }
    }

    filtered.sort((a, b) => new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end).map(toHistoryListItem);

    const payload: PaginatedTripHistoryResponse = {
      items: slice,
      page,
      pageSize,
      total,
      hasNextPage: end < total
    };

    return ok(payload, config);
  }

  if (method === 'GET' && url === '/driver/history/detail') {
    const tripId = String(config.params?.tripId ?? '');
    const detail = historyDetailsDataset.find((item) => item.tripId === tripId);
    if (!detail) {
      return failed(404, 'Khong tim thay chi tiet chuyen', 'NOT_FOUND', config);
    }
    return ok(detail, config);
  }

  if (method === 'GET' && url === '/driver/current-trip') {
    return ok<CurrentTrip | null>(mockCurrentTrip, config);
  }

  if (method === 'GET' && url === '/driver/history') {
    return ok<TripHistoryItem[]>(
      historyDetailsDataset.slice(0, 20).map((item) => ({
        id: item.tripId,
        date: item.pickupTime,
        route: `${item.pickupAddress} -> ${item.dropoffAddress}`,
        fare: item.fare,
        status: item.status === 'hoan_thanh' ? 'hoan_thanh' : 'huy'
      })),
      config
    );
  }

  if (method === 'GET' && url === '/driver/wallet') {
    return ok<WalletOverview>(mockWallet, config);
  }

  if (method === 'GET' && url === '/driver/wallet/summary') {
    return ok(walletSummaryData, config);
  }

  if (method === 'GET' && url === '/driver/wallet/income-stats') {
    const period = (String(config.params?.period ?? 'day') as IncomePeriod) || 'day';
    return ok(buildIncomeStats(period), config);
  }

  if (method === 'GET' && url === '/driver/wallet/transactions') {
    const fromDate = String(config.params?.fromDate ?? '').trim();
    const toDate = String(config.params?.toDate ?? '').trim();

    let items = [...walletTransactionsData];

    if (fromDate) {
      const fromTime = new Date(fromDate).getTime();
      if (!Number.isNaN(fromTime)) {
        items = items.filter((item) => new Date(item.createdAt).getTime() >= fromTime);
      }
    }

    if (toDate) {
      const toTime = new Date(toDate).getTime();
      if (!Number.isNaN(toTime)) {
        items = items.filter((item) => new Date(item.createdAt).getTime() <= toTime + 1000 * 60 * 60 * 24);
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const payload: WalletTransactionsResponse = {
      items,
      total: items.length
    };
    return ok(payload, config);
  }

  if (method === 'GET' && url === '/driver/wallet/payout-account') {
    return ok(payoutAccountData, config);
  }

  if (method === 'GET' && url === '/driver/wallet/withdrawals/history') {
    const payload: WithdrawalHistoryResponse = {
      items: withdrawalHistoryData,
      total: withdrawalHistoryData.length
    };
    return ok(payload, config);
  }

  if (method === 'POST' && url === '/driver/wallet/withdrawals/create') {
    const body = parseBody<CreateWithdrawalPayload>(config);

    if (!payoutAccountData) {
      return failed(400, 'Chua co thong tin tai khoan nhan tien', 'PAYOUT_ACCOUNT_REQUIRED', config);
    }

    if (body.amount > walletSummaryData.currentBalance) {
      return failed(400, 'So du khong du', 'INSUFFICIENT_BALANCE', config);
    }

    const request: WithdrawalRequest = {
      id: `wd-${Date.now()}`,
      amount: body.amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      note: 'Yeu cau rut tien da duoc gui'
    };

    walletSummaryData = {
      ...walletSummaryData,
      currentBalance: walletSummaryData.currentBalance - body.amount
    };

    withdrawalHistoryData = [request, ...withdrawalHistoryData];

    walletTransactionsData = [
      {
        id: `txn-withdraw-${Date.now()}`,
        createdAt: new Date().toISOString(),
        type: 'rut_tien',
        title: 'Yeu cau rut tien ve ngan hang',
        amount: -body.amount,
        balanceAfter: walletSummaryData.currentBalance,
        note: `Cho xu ly ${payoutAccountData.bankName}`
      },
      ...walletTransactionsData
    ];

    const payload: CreateWithdrawalResponse = {
      request,
      message: 'Gui yeu cau rut tien thanh cong'
    };
    return ok(payload, config);
  }

  if (method === 'POST' && url === '/driver/wallet/topup/create') {
    const body = parseBody<CreateTopupPaymentPayload>(config);
    const paymentId = `topup-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    topupPayments[paymentId] = {
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      expiresAt,
      status: 'pending'
    };

    const payload: CreateTopupPaymentResponse = {
      paymentId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      expiresAt,
      checkoutUrl: `https://mock-gateway.thuexe.vn/pay/${paymentId}`
    };

    return ok(payload, config, 'Tao phien nap tien thanh cong');
  }

  if (method === 'POST' && url === '/driver/wallet/topup/callback') {
    const body = parseBody<TopupPaymentCallbackPayload>(config);
    const payment = topupPayments[body.paymentId];

    if (!payment) {
      return failed(404, 'Khong tim thay phien thanh toan', 'NOT_FOUND', config);
    }

    if (new Date(payment.expiresAt).getTime() < Date.now() && body.status === 'success') {
      payment.status = 'timeout';
      const timeoutResult: TopupPaymentCallbackResponse = {
        paymentId: body.paymentId,
        status: 'timeout',
        amount: payment.amount,
        message: 'Giao dich da het han.'
      };
      return ok(timeoutResult, config);
    }

    payment.status = body.status;

    if (body.status === 'success') {
      walletSummaryData = {
        ...walletSummaryData,
        currentBalance: walletSummaryData.currentBalance + payment.amount
      };

      walletTransactionsData = [
        {
          id: `txn-topup-${Date.now()}`,
          createdAt: new Date().toISOString(),
          type: 'nap_tien',
          title: 'Nap tien vao vi tai xe',
          amount: payment.amount,
          balanceAfter: walletSummaryData.currentBalance,
          note: `Thanh toan qua ${payment.paymentMethod}`
        },
        ...walletTransactionsData
      ];
    }

    const result: TopupPaymentCallbackResponse = {
      paymentId: body.paymentId,
      status: body.status,
      amount: payment.amount,
      message:
        body.status === 'success'
          ? 'Nap tien thanh cong vao vi.'
          : body.status === 'failed'
            ? 'Thanh toan that bai. Vui long thu lai.'
            : 'Giao dich qua han thanh toan.'
    };

    return ok(result, config);
  }

  if (method === 'GET' && url === '/driver/support/topics') {
    return ok<SupportIssueTopic[]>(supportTopicsData, config);
  }

  if (method === 'GET' && (url === '/driver/support/tickets' || url === '/driver/support')) {
    sortSupportTickets();
    return ok<SupportTicket[]>(supportTicketsData, config);
  }

  if (method === 'GET' && url === '/driver/support/messages') {
    const ticketId = String(config.params?.ticketId ?? '').trim();
    if (!ticketId) {
      return failed(400, 'Thieu ticketId', 'MISSING_TICKET_ID', config);
    }
    const ticket = supportTicketsData.find((item) => item.id === ticketId);
    if (!ticket) {
      return failed(404, 'Khong tim thay ticket', 'NOT_FOUND', config);
    }
    const messages = supportMessagesByTicketData[ticketId] ?? [];
    return ok<SupportMessage[]>(messages, config);
  }

  if (method === 'GET' && url === '/driver/support/mock-images') {
    return ok<SupportMockImage[]>(supportImageLibraryData, config);
  }

  if (method === 'POST' && url === '/driver/support/tickets/create') {
    const body = parseBody<CreateSupportTicketPayload>(config);
    const content = body.content.trim();

    if (!content) {
      return failed(400, 'Noi dung yeu cau khong duoc de trong', 'INVALID_CONTENT', config);
    }

    const now = Date.now();
    const ticketId = `sup-${now}`;
    const issueLabel = SUPPORT_SUBJECT_BY_TYPE[body.issueType] ?? 'Ho tro khac';

    const ticket: SupportTicket = {
      id: ticketId,
      code: `SPT-${String(now).slice(-6)}`,
      issueType: body.issueType,
      subject: issueLabel,
      content,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      status: 'open',
      unreadCount: 1,
      lastMessagePreview: 'Support da tiep nhan yeu cau va dang xu ly.'
    };

    const driverMessage: SupportMessage = {
      id: `msg-${ticketId}-1`,
      ticketId,
      sender: 'driver',
      senderName: driverProfile.fullName,
      content,
      attachments: [],
      createdAt: new Date(now).toISOString()
    };

    const agentMessage: SupportMessage = {
      id: `msg-${ticketId}-2`,
      ticketId,
      sender: 'agent',
      senderName: 'Support',
      content: 'Support da tiep nhan yeu cau va dang xu ly.',
      attachments: [],
      createdAt: new Date(now + 15 * 1000).toISOString()
    };

    supportTicketsData = [ticket, ...supportTicketsData];
    supportMessagesByTicketData[ticketId] = [driverMessage, agentMessage];
    sortSupportTickets();

    const payload: CreateSupportTicketResponse = {
      ticket,
      messages: supportMessagesByTicketData[ticketId]
    };
    return ok(payload, config, 'Tao ticket ho tro thanh cong');
  }

  if (method === 'POST' && url === '/driver/support/messages/send') {
    const body = parseBody<SendSupportMessagePayload>(config);
    const ticket = supportTicketsData.find((item) => item.id === body.ticketId);

    if (!ticket) {
      return failed(404, 'Khong tim thay ticket', 'NOT_FOUND', config);
    }

    const content = body.content.trim();
    const attachments = (body.attachments ?? []).map(toSupportAttachment);

    if (!content && attachments.length === 0) {
      return failed(400, 'Tin nhan can co noi dung hoac anh dinh kem', 'INVALID_MESSAGE', config);
    }

    const now = Date.now();
    const ticketMessages = supportMessagesByTicketData[body.ticketId] ?? [];

    const driverMessage: SupportMessage = {
      id: `msg-${body.ticketId}-${now}`,
      ticketId: body.ticketId,
      sender: 'driver',
      senderName: driverProfile.fullName,
      content,
      attachments,
      createdAt: new Date(now).toISOString()
    };
    ticketMessages.push(driverMessage);

    let lastPreview = content || `${attachments.length} anh dinh kem`;
    let unreadCount = 0;
    let updatedAt = driverMessage.createdAt;
    let nextStatus = ticket.status;

    if (ticket.status !== 'closed') {
      const replyAt = new Date(now + 20 * 1000).toISOString();
      const agentReply: SupportMessage = {
        id: `msg-${body.ticketId}-${now + 1}`,
        ticketId: body.ticketId,
        sender: 'agent',
        senderName: 'Support',
        content: 'Support da nhan tin nhan moi. Chung toi se phan hoi som nhat.',
        attachments: [],
        createdAt: replyAt
      };
      ticketMessages.push(agentReply);
      lastPreview = agentReply.content;
      unreadCount = ticket.unreadCount + 1;
      updatedAt = replyAt;
      nextStatus = ticket.status === 'open' ? 'pending' : ticket.status;
    }

    supportMessagesByTicketData[body.ticketId] = ticketMessages;
    supportTicketsData = supportTicketsData.map((item) =>
      item.id === body.ticketId
        ? {
            ...item,
            status: nextStatus,
            updatedAt,
            unreadCount,
            lastMessagePreview: lastPreview
          }
        : item
    );
    sortSupportTickets();

    return ok<SupportMessage[]>(ticketMessages, config, 'Gui tin nhan thanh cong');
  }

  if (method === 'GET' && url === '/driver/notifications') {
    const group = String(config.params?.group ?? '').trim();
    const isReadQuery = String(config.params?.isRead ?? '').trim();

    let filtered = sortNotifications(notificationsData);
    if (group) {
      filtered = filtered.filter((item) => item.group === group);
    }
    if (isReadQuery === 'true' || isReadQuery === 'false') {
      filtered = filtered.filter((item) => item.isRead === (isReadQuery === 'true'));
    }

    return ok<DriverNotification[]>(filtered, config);
  }

  if (method === 'GET' && url === '/driver/notifications/detail') {
    const notificationId = String(config.params?.notificationId ?? '').trim();
    const notification = notificationsData.find((item) => item.id === notificationId);
    if (!notification) {
      return failed(404, 'Khong tim thay thong bao', 'NOT_FOUND', config);
    }
    return ok<DriverNotification>(notification, config);
  }

  if (method === 'GET' && url === '/driver/notifications/unread-count') {
    return ok<{ unreadCount: number }>(
      {
        unreadCount: notificationsData.filter((item) => !item.isRead).length
      },
      config
    );
  }

  if (method === 'PATCH' && url === '/driver/notifications/mark-read') {
    const body = parseBody<{ notificationId: string; isRead: boolean }>(config);
    const target = notificationsData.find((item) => item.id === body.notificationId);
    if (!target) {
      return failed(404, 'Khong tim thay thong bao', 'NOT_FOUND', config);
    }
    notificationsData = notificationsData.map((item) =>
      item.id === body.notificationId
        ? {
            ...item,
            isRead: body.isRead
          }
        : item
    );
    return ok<DriverNotification[]>(sortNotifications(notificationsData), config, 'Da cap nhat trang thai thong bao');
  }

  if (method === 'PATCH' && url === '/driver/notifications/read-all') {
    notificationsData = notificationsData.map((item) => ({ ...item, isRead: true }));
    return ok<DriverNotification[]>(sortNotifications(notificationsData), config, 'Da danh dau da doc');
  }

  return failed(404, 'Not found', 'NOT_FOUND', config);
};
