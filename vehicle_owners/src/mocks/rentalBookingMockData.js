export const RENTAL_ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

export const RENTAL_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial_paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const RENTAL_SERVICE_TYPES = {
  SELF_DRIVE: 'self_drive',
  CHAUFFEUR: 'chauffeur',
  AIRPORT: 'airport_transfer',
};

export const rentalOrders = [
  {
    id: 'ro-001',
    orderCode: 'TX-BOOK-20260401-001',
    customer: {
      fullName: 'Tran Thi Anh',
      phoneNumber: '0903111222',
      email: 'anh.tran@example.com',
      citizenId: '079203001999',
    },
    vehicle: {
      id: 'vh-act-001',
      plateNumber: '51H-123.45',
      displayName: 'Toyota Vios 2023',
      type: 'Sedan',
    },
    servicePackage: {
      serviceType: RENTAL_SERVICE_TYPES.SELF_DRIVE,
      name: 'Tu lai 2 ngay cuoi tuan',
      includedDistanceKm: 300,
    },
    pickup: {
      location: 'Vincom Dong Khoi, Quan 1',
      at: '2026-04-06T08:00:00.000Z',
    },
    dropoff: {
      location: 'Vincom Dong Khoi, Quan 1',
      at: '2026-04-08T18:00:00.000Z',
    },
    costBreakdown: {
      baseFare: 1900000,
      insuranceFee: 150000,
      deliveryFee: 0,
      discount: 100000,
      deposit: 5000000,
      totalAmount: 1950000,
      currency: 'VND',
    },
    paymentStatus: RENTAL_PAYMENT_STATUS.PAID,
    orderStatus: RENTAL_ORDER_STATUS.CONFIRMED,
    cancelNote: '',
    statusHistory: [
      { status: RENTAL_ORDER_STATUS.PENDING, at: '2026-04-01T03:10:00.000Z', note: 'Don duoc tao' },
      { status: RENTAL_ORDER_STATUS.CONFIRMED, at: '2026-04-01T06:20:00.000Z', note: 'Chủ xe da xac nhan' },
    ],
  },
  {
    id: 'ro-002',
    orderCode: 'TX-BOOK-20260402-010',
    customer: {
      fullName: 'Le Minh Tuan',
      phoneNumber: '0911223344',
      email: 'tuan.le@example.com',
      citizenId: '023102003311',
    },
    vehicle: {
      id: 'vh-act-002',
      plateNumber: '59A-567.89',
      displayName: 'Kia Carnival 2024',
      type: 'MPV',
    },
    servicePackage: {
      serviceType: RENTAL_SERVICE_TYPES.CHAUFFEUR,
      name: 'có tài xế 8 gio/ngay',
      includedDistanceKm: 250,
    },
    pickup: {
      location: 'San bay Tan Son Nhat',
      at: '2026-04-04T02:00:00.000Z',
    },
    dropoff: {
      location: 'Quan 7, TP.HCM',
      at: '2026-04-06T13:00:00.000Z',
    },
    costBreakdown: {
      baseFare: 3500000,
      insuranceFee: 250000,
      deliveryFee: 200000,
      discount: 0,
      deposit: 0,
      totalAmount: 3950000,
      currency: 'VND',
    },
    paymentStatus: RENTAL_PAYMENT_STATUS.PARTIAL,
    orderStatus: RENTAL_ORDER_STATUS.IN_PROGRESS,
    cancelNote: '',
    statusHistory: [
      { status: RENTAL_ORDER_STATUS.PENDING, at: '2026-04-02T01:00:00.000Z', note: 'Don duoc tao' },
      { status: RENTAL_ORDER_STATUS.CONFIRMED, at: '2026-04-02T03:40:00.000Z', note: 'Chủ xe da xac nhan' },
      { status: RENTAL_ORDER_STATUS.IN_PROGRESS, at: '2026-04-04T02:10:00.000Z', note: 'Khach da nhan xe' },
    ],
  },
  {
    id: 'ro-003',
    orderCode: 'TX-BOOK-20260403-022',
    customer: {
      fullName: 'Pham Quoc Hủy',
      phoneNumber: '0933444555',
      email: 'Hủy.pham@example.com',
      citizenId: '079198006666',
    },
    vehicle: {
      id: 'vh-act-003',
      plateNumber: '30G-222.10',
      displayName: 'Ford Ranger Wildtrak 2022',
      type: 'Pickup',
    },
    servicePackage: {
      serviceType: RENTAL_SERVICE_TYPES.SELF_DRIVE,
      name: 'Tu lai 3 ngay',
      includedDistanceKm: 400,
    },
    pickup: {
      location: 'Da Nang Center',
      at: '2026-04-10T01:00:00.000Z',
    },
    dropoff: {
      location: 'Da Nang Center',
      at: '2026-04-13T10:00:00.000Z',
    },
    costBreakdown: {
      baseFare: 4200000,
      insuranceFee: 200000,
      deliveryFee: 100000,
      discount: 200000,
      deposit: 6000000,
      totalAmount: 4300000,
      currency: 'VND',
    },
    paymentStatus: RENTAL_PAYMENT_STATUS.PENDING,
    orderStatus: RENTAL_ORDER_STATUS.PENDING,
    cancelNote: '',
    statusHistory: [{ status: RENTAL_ORDER_STATUS.PENDING, at: '2026-04-03T05:22:00.000Z', note: 'Don duoc tao' }],
  },
  {
    id: 'ro-004',
    orderCode: 'TX-BOOK-20260328-006',
    customer: {
      fullName: 'Nguyen Hoang Linh',
      phoneNumber: '0977555666',
      email: 'linh.nguyen@example.com',
      citizenId: '079200077777',
    },
    vehicle: {
      id: 'vh-act-004',
      plateNumber: '47A-315.20',
      displayName: 'Mazda CX-5 2023',
      type: 'SUV',
    },
    servicePackage: {
      serviceType: RENTAL_SERVICE_TYPES.AIRPORT,
      name: 'Don tien san bay',
      includedDistanceKm: 60,
    },
    pickup: {
      location: 'Nha ga quoc te Tan Son Nhat',
      at: '2026-03-29T01:30:00.000Z',
    },
    dropoff: {
      location: 'Quan 3, TP.HCM',
      at: '2026-03-29T03:00:00.000Z',
    },
    costBreakdown: {
      baseFare: 950000,
      insuranceFee: 0,
      deliveryFee: 0,
      discount: 0,
      deposit: 0,
      totalAmount: 950000,
      currency: 'VND',
    },
    paymentStatus: RENTAL_PAYMENT_STATUS.REFUNDED,
    orderStatus: RENTAL_ORDER_STATUS.CANCELED,
    cancelNote: 'khách hàng thay doi lich bay.',
    statusHistory: [
      { status: RENTAL_ORDER_STATUS.PENDING, at: '2026-03-28T08:12:00.000Z', note: 'Don duoc tao' },
      { status: RENTAL_ORDER_STATUS.CANCELED, at: '2026-03-28T10:35:00.000Z', note: 'Chủ xe dong y Hủy don' },
    ],
  },
];

export const rentalContracts = [
  {
    id: 'ct-001',
    bookingId: 'ro-001',
    contractCode: 'HD-20260401-001',
    title: 'Hop dong thue xe Toyota Vios',
    status: 'signed',
    signedAt: '2026-04-01T06:30:00.000Z',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    contentPreview:
      'Hop dong giua Chủ xe va khách hàng, dieu khoan boi thuong, gioi han quang duong va lich giao nhan xe.',
  },
  {
    id: 'ct-002',
    bookingId: 'ro-002',
    contractCode: 'HD-20260402-004',
    title: 'Hop dong thue xe có tài xế',
    status: 'signed',
    signedAt: '2026-04-02T04:00:00.000Z',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    contentPreview:
      'Hop dong dich vu có tài xế, quy dinh phu phi vuot gio va trach nhiem cua cac ben trong hanh trinh.',
  },
  {
    id: 'ct-003',
    bookingId: 'ro-003',
    contractCode: 'HD-20260403-009',
    title: 'Hop dong tam giu cho xac nhan',
    status: 'draft',
    signedAt: '',
    fileUrl: '',
    contentPreview: 'Hop dong Nhập cơ bản, Chưa ky so.',
  },
];

export const bookingStatusTransitions = {
  [RENTAL_ORDER_STATUS.PENDING]: [RENTAL_ORDER_STATUS.CONFIRMED, RENTAL_ORDER_STATUS.CANCELED],
  [RENTAL_ORDER_STATUS.CONFIRMED]: [RENTAL_ORDER_STATUS.IN_PROGRESS, RENTAL_ORDER_STATUS.CANCELED],
  [RENTAL_ORDER_STATUS.IN_PROGRESS]: [RENTAL_ORDER_STATUS.COMPLETED],
  [RENTAL_ORDER_STATUS.COMPLETED]: [],
  [RENTAL_ORDER_STATUS.CANCELED]: [],
};


