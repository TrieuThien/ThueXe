export const VERIFICATION_STATUSES = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const verificationStatusLabels = {
  [VERIFICATION_STATUSES.NOT_SUBMITTED]: 'Chưa gửi',
  [VERIFICATION_STATUSES.PENDING]: 'Đang chờ duyệt',
  [VERIFICATION_STATUSES.VERIFIED]: 'Đã xác thực',
  [VERIFICATION_STATUSES.REJECTED]: 'Bị từ chối',
};

export const requiredOwnerDocuments = [
  {
    id: 'citizen_id_front',
    title: 'CCCD/CMND mat truoc',
    description: 'Anh chup ro net mat truoc CCCD/CMND.',
    required: true,
    requiresNumber: true,
    requiresExpiryDate: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 8,
  },
  {
    id: 'citizen_id_back',
    title: 'CCCD/CMND mat sau',
    description: 'Anh chup ro net mat sau CCCD/CMND.',
    required: true,
    requiresNumber: true,
    requiresExpiryDate: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 8,
  },
  {
    id: 'driving_license',
    title: 'Giay phep lai xe',
    description: 'GPLX con hieu luc theo hãng xe Đăng ký cho thue.',
    required: true,
    requiresNumber: true,
    requiresExpiryDate: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 8,
  },
  {
    id: 'bank_statement',
    title: 'Sao ke/thông tin tài khoản Ngân hàng',
    description: 'Tai lieu xac minh chu tài khoản nhan doanh thu.',
    required: true,
    requiresNumber: false,
    requiresExpiryDate: false,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 10,
  },
];

export const ownerVerificationProfile = {
  ownerId: 'owner_demo',
  status: VERIFICATION_STATUSES.REJECTED,
  progressPercent: 75,
  submittedAt: '2026-04-02T08:15:00.000Z',
  reviewedAt: '2026-04-03T04:20:00.000Z',
  adminNote:
    'Hồ sơ Chưa du dieu kien: Vui lòng Cập nhật anh CCCD mat truoc ro hon va bổ sung thông tin het han GPLX.',
  documents: [
    {
      documentTypeId: 'citizen_id_front',
      documentNumber: '079203001234',
      expiryDate: '2030-10-01',
      fileName: 'cccd-front-old.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1320080,
      fileUrl: 'https://placehold.co/600x400.png?text=CCCD+Front+Sample',
      status: 'rejected',
      adminNote: 'Anh bi mo, Vui lòng chup lai ro net.',
      updatedAt: '2026-04-02T08:00:00.000Z',
    },
    {
      documentTypeId: 'citizen_id_back',
      documentNumber: '079203001234',
      expiryDate: '2030-10-01',
      fileName: 'cccd-back.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1210250,
      fileUrl: 'https://placehold.co/600x400.png?text=CCCD+Back+Sample',
      status: 'approved',
      adminNote: '',
      updatedAt: '2026-04-02T08:03:00.000Z',
    },
    {
      documentTypeId: 'driving_license',
      documentNumber: 'FC-762881',
      expiryDate: '',
      fileName: 'gplx-scan.pdf',
      mimeType: 'application/pdf',
      fileSize: 3521190,
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      status: 'rejected',
      adminNote: 'Chưa có ngay het han GPLX.',
      updatedAt: '2026-04-02T08:07:00.000Z',
    },
    {
      documentTypeId: 'bank_statement',
      documentNumber: '',
      expiryDate: '',
      fileName: 'bank-proof.png',
      mimeType: 'image/png',
      fileSize: 882210,
      fileUrl: 'https://placehold.co/600x400.png?text=Bank+Proof+Sample',
      status: 'approved',
      adminNote: '',
      updatedAt: '2026-04-02T08:10:00.000Z',
    },
  ],
};


