import type { DriverNotification, CurrentTrip, DashboardSummary, TripHistoryItem, WalletOverview } from '../../types/driver';
import type {
  SupportIssueTopic,
  SupportMessage,
  SupportMockImage,
  SupportTicket
} from '../../types/support';
import type { DriverScheduleSlot, RentalBookingDetail } from '../../types/schedule';
import type { DriverProfile } from '../../types/auth';

export const mockDriver: DriverProfile = {
  id: 'd-001',
  fullName: 'Nguyen Van Tai',
  phone: '0901234567',
  email: 'driver@thuexe.vn',
  rating: 4.9,
  online: true,
  accountStatus: 'dang_cho_xac_thuc',
  verificationStatus: 'pending',
  workingStatus: 'online',
  vehicle: {
    model: 'Toyota Vios 2023',
    plate: '51H-123.45',
    color: 'Trang',
    year: 2023
  },
  bank: {
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountHolder: 'NGUYEN VAN TAI'
  },
  vehicleName: 'Toyota Vios 2023',
  vehiclePlate: '51H-123.45'
};

export const mockDashboard: DashboardSummary = {
  todayTrips: 9,
  todayIncome: 1320000,
  onlineHours: 6.5,
  acceptanceRate: 92
};

export const mockCurrentTrip: CurrentTrip = {
  id: 'trip-live-001',
  customerName: 'Tran Minh Anh',
  pickup: 'Ben Thanh, Quan 1',
  dropoff: 'San bay Tan Son Nhat',
  distanceKm: 7.8,
  fare: 165000,
  status: 'dang_don'
};

export const mockTripHistory: TripHistoryItem[] = [
  {
    id: 'trip-h-01',
    date: '2026-04-09T08:30:00.000Z',
    route: 'Quan 1 -> Quan 7',
    fare: 210000,
    status: 'hoan_thanh'
  },
  {
    id: 'trip-h-02',
    date: '2026-04-09T12:45:00.000Z',
    route: 'Thu Duc -> Binh Thanh',
    fare: 174000,
    status: 'hoan_thanh'
  },
  {
    id: 'trip-h-03',
    date: '2026-04-08T16:20:00.000Z',
    route: 'Phu Nhuan -> Quan 3',
    fare: 92000,
    status: 'huy'
  }
];

export const mockWallet: WalletOverview = {
  availableBalance: 5420000,
  pendingPayout: 830000,
  weeklyIncome: 7330000
};

export const mockSupportTopics: SupportIssueTopic[] = [
  {
    id: 'topic-account',
    type: 'tai_khoan',
    title: 'Tai khoan',
    description: 'Dang nhap, khoa tai khoan, thong tin dang ky'
  },
  {
    id: 'topic-trip',
    type: 'chuyen_di',
    title: 'Chuyen di',
    description: 'Khach huy, sai cuoc phi, loi chuyen'
  },
  {
    id: 'topic-wallet',
    type: 'vi',
    title: 'Vi',
    description: 'Nap rut tien, so du, giao dich bi loi'
  },
  {
    id: 'topic-vehicle',
    type: 'phuong_tien',
    title: 'Phuong tien',
    description: 'Cap nhat bien so, doi xe, giay to xe'
  },
  {
    id: 'topic-profile',
    type: 'ho_so',
    title: 'Ho so',
    description: 'Cap nhat CCCD, anh dai dien, thong tin tai xe'
  }
];

export const mockSupportTickets: SupportTicket[] = [
  {
    id: 'sup-1001',
    code: 'SPT-1001',
    issueType: 'chuyen_di',
    subject: 'Khach hang de quen do tren xe',
    content: 'Toi can lien he khach hang de tra lai do.',
    createdAt: '2026-04-08T09:00:00.000Z',
    updatedAt: '2026-04-08T09:22:00.000Z',
    status: 'open',
    unreadCount: 1,
    lastMessagePreview: 'Support dang xac minh thong tin khach hang.'
  },
  {
    id: 'sup-1002',
    code: 'SPT-1002',
    issueType: 'vi',
    subject: 'Yeu cau doi hinh thuc thanh toan',
    content: 'Giao dich topup thanh cong nhung vi chua cap nhat.',
    createdAt: '2026-04-06T04:20:00.000Z',
    updatedAt: '2026-04-06T05:10:00.000Z',
    status: 'closed',
    unreadCount: 0,
    lastMessagePreview: 'Ticket da dong. Cam on ban da phan hoi.'
  }
];

export const mockSupportMessagesByTicket: Record<string, SupportMessage[]> = {
  'sup-1001': [
    {
      id: 'msg-1001-1',
      ticketId: 'sup-1001',
      sender: 'driver',
      senderName: 'Nguyen Van Tai',
      content: 'Toi vua ket thuc chuyen va khach bo quen balo tren xe.',
      attachments: [],
      createdAt: '2026-04-08T09:01:00.000Z'
    },
    {
      id: 'msg-1001-2',
      ticketId: 'sup-1001',
      sender: 'agent',
      senderName: 'Support',
      content: 'Ban gui them anh vat dung de chung toi lien he khach nhe.',
      attachments: [],
      createdAt: '2026-04-08T09:05:00.000Z'
    },
    {
      id: 'msg-1001-3',
      ticketId: 'sup-1001',
      sender: 'driver',
      senderName: 'Nguyen Van Tai',
      content: 'Minh gui anh balo o day.',
      attachments: [
        {
          id: 'att-1001-1',
          type: 'image',
          fileName: 'balo.jpg',
          uri: 'https://picsum.photos/id/28/640/480',
          width: 640,
          height: 480
        }
      ],
      createdAt: '2026-04-08T09:06:00.000Z'
    },
    {
      id: 'msg-1001-4',
      ticketId: 'sup-1001',
      sender: 'agent',
      senderName: 'Support',
      content: 'Support dang xac minh thong tin khach hang.',
      attachments: [],
      createdAt: '2026-04-08T09:22:00.000Z'
    }
  ],
  'sup-1002': [
    {
      id: 'msg-1002-1',
      ticketId: 'sup-1002',
      sender: 'driver',
      senderName: 'Nguyen Van Tai',
      content: 'Topup da tru tien ngan hang nhung vi chua cong.',
      attachments: [],
      createdAt: '2026-04-06T04:21:00.000Z'
    },
    {
      id: 'msg-1002-2',
      ticketId: 'sup-1002',
      sender: 'agent',
      senderName: 'Support',
      content: 'He thong da doi soat va cong tien thanh cong. Ticket dong.',
      attachments: [],
      createdAt: '2026-04-06T05:10:00.000Z'
    }
  ]
};

export const mockSupportImageLibrary: SupportMockImage[] = [
  {
    id: 'mock-img-01',
    fileName: 'anh-mat-truoc-xe.jpg',
    uri: 'https://picsum.photos/id/111/640/420',
    width: 640,
    height: 420
  },
  {
    id: 'mock-img-02',
    fileName: 'anh-bien-so.jpg',
    uri: 'https://picsum.photos/id/1074/640/420',
    width: 640,
    height: 420
  },
  {
    id: 'mock-img-03',
    fileName: 'anh-giao-dich.jpg',
    uri: 'https://picsum.photos/id/180/640/420',
    width: 640,
    height: 420
  },
  {
    id: 'mock-img-04',
    fileName: 'anh-vat-dung-bo-quen.jpg',
    uri: 'https://picsum.photos/id/1062/640/420',
    width: 640,
    height: 420
  }
];

const toSlotDate = (offsetDays: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const mockRentalBookingDetails: RentalBookingDetail[] = [
  {
    id: 'rb-1001',
    bookingCode: 'RBK-1001',
    customerName: 'Le Hoang Minh',
    customerPhone: '0908881001',
    pickupAddress: 'Saigon Centre, Quan 1',
    dropoffAddress: 'Vung Tau, Ba Ria - Vung Tau',
    startAt: toSlotDate(0, 9),
    endAt: toSlotDate(0, 12),
    totalHours: 3,
    totalPrice: 750000,
    status: 'assigned',
    note: 'Khach can tai xe co kinh nghiem di lien tinh'
  },
  {
    id: 'rb-1002',
    bookingCode: 'RBK-1002',
    customerName: 'Nguyen Thanh Ha',
    customerPhone: '0908881002',
    pickupAddress: 'Landmark 81, Binh Thanh',
    dropoffAddress: 'Ho Tram, Ba Ria - Vung Tau',
    startAt: toSlotDate(1, 14),
    endAt: toSlotDate(1, 18),
    totalHours: 4,
    totalPrice: 1020000,
    status: 'assigned'
  },
  {
    id: 'rb-1003',
    bookingCode: 'RBK-1003',
    customerName: 'Pham Duc Long',
    customerPhone: '0908881003',
    pickupAddress: 'District 7, TP HCM',
    dropoffAddress: 'Da Lat, Lam Dong',
    startAt: toSlotDate(3, 7),
    endAt: toSlotDate(3, 13),
    totalHours: 6,
    totalPrice: 1620000,
    status: 'in_progress',
    note: 'Yeu cau nghi giua chang 30 phut'
  },
  {
    id: 'rb-1004',
    bookingCode: 'RBK-1004',
    customerName: 'Tran Bao Ngoc',
    customerPhone: '0908881004',
    pickupAddress: 'Thu Duc City',
    dropoffAddress: 'Can Gio',
    startAt: toSlotDate(5, 8),
    endAt: toSlotDate(5, 11),
    totalHours: 3,
    totalPrice: 780000,
    status: 'assigned'
  }
];

const generatedAvailableSlots: DriverScheduleSlot[] = Array.from({ length: 7 }).flatMap((_, dayOffset) => [
  {
    id: `sch-av-m-${dayOffset}`,
    startAt: toSlotDate(dayOffset, 6),
    endAt: toSlotDate(dayOffset, 12),
    status: 'available',
    source: 'driver_schedule'
  },
  {
    id: `sch-av-a-${dayOffset}`,
    startAt: toSlotDate(dayOffset, 13),
    endAt: toSlotDate(dayOffset, 22),
    status: 'available',
    source: 'driver_schedule'
  }
]);

const generatedUnavailableSlots: DriverScheduleSlot[] = [
  {
    id: 'sch-un-01',
    startAt: toSlotDate(0, 12),
    endAt: toSlotDate(0, 13),
    status: 'unavailable',
    source: 'driver_schedule',
    note: 'Nghi trua'
  },
  {
    id: 'sch-un-02',
    startAt: toSlotDate(2, 16),
    endAt: toSlotDate(2, 18),
    status: 'unavailable',
    source: 'driver_schedule',
    note: 'Ban viec gia dinh'
  }
];

const generatedBookedSlots: DriverScheduleSlot[] = mockRentalBookingDetails.map((booking, index) => ({
  id: `sch-bk-${index + 1}`,
  startAt: booking.startAt,
  endAt: booking.endAt,
  status: 'booked',
  source: 'rental_bookings',
  bookingId: booking.id
}));

export const mockDriverScheduleSlots: DriverScheduleSlot[] = [
  ...generatedAvailableSlots,
  ...generatedUnavailableSlots,
  ...generatedBookedSlots
];

const notificationSeeds: Array<{
  group: DriverNotification['group'];
  title: string;
  body: string;
  detail: string;
  refCode: string;
}> = [
  {
    group: 'chuyen_di',
    title: 'Khach huy chuyen gan diem don',
    body: 'Chuyen TX-2201 vua bi huy boi khach.',
    detail: 'Khach da huy chuyen gan diem don. He thong se tinh diem huy theo quy dinh hien hanh.',
    refCode: 'TX-2201'
  },
  {
    group: 'vi',
    title: 'Nap tien thanh cong',
    body: 'Vi tai xe da duoc cong 200,000 VND.',
    detail: 'Giao dich nap tien thanh cong qua momo luc 09:20. So du hien tai da cap nhat.',
    refCode: 'WD-9021'
  },
  {
    group: 'ho_so',
    title: 'Can bo sung CCCD mat sau',
    body: 'Ho so cua ban dang cho bo sung giay to.',
    detail: 'Anh CCCD mat sau chua ro net. Vui long cap nhat lai de kich hoat day du quyen nhan chuyen.',
    refCode: 'PF-1102'
  },
  {
    group: 'ho_tro',
    title: 'Support da phan hoi ticket',
    body: 'Ticket SPT-1001 co cap nhat moi.',
    detail: 'Bo phan support da gui phan hoi moi cho ticket cua ban. Vao trung tam ho tro de xem chi tiet.',
    refCode: 'SPT-1001'
  },
  {
    group: 'van_hanh',
    title: 'Thuong hieu suat tuan',
    body: 'Ban dat top 10 tai xe khu vuc Quan 1.',
    detail: 'Ban dang dat hieu suat tot trong tuan nay. Tiep tuc duy tri ty le nhan chuyen cao de nhan thuong.',
    refCode: 'OP-7741'
  }
];

export const mockNotifications: DriverNotification[] = Array.from({ length: 180 }).map((_, index) => {
  const seed = notificationSeeds[index % notificationSeeds.length];
  const createdAt = new Date(Date.now() - index * 1000 * 60 * 43).toISOString();

  return {
    id: `noti-${index + 1}`,
    group: seed.group,
    title: seed.title,
    body: seed.body,
    detail: `${seed.detail} Ban ghi thu ${index + 1}.`,
    refCode: `${seed.refCode}-${100 + index}`,
    createdAt,
    isRead: index % 4 === 0
  };
});
