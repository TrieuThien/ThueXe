export const ownerRevenueSummarySeed = {
  totalRevenue: 152400000,
  monthRevenue: 28300000,
  walletBalance: 12450000,
  pendingWithdrawal: 2250000,
  processingWithdrawal: 1800000,
};

export const revenueByVehicleSeed = [
  {
    vehicleId: 'vm-001',
    vehicleName: 'Toyota Vios 2023',
    plateNumber: '51H-123.45',
    totalBookings: 22,
    grossRevenue: 45800000,
    netRevenue: 40150000,
  },
  {
    vehicleId: 'vm-002',
    vehicleName: 'Kia Carnival 2024',
    plateNumber: '59A-567.89',
    totalBookings: 17,
    grossRevenue: 61200000,
    netRevenue: 53600000,
  },
  {
    vehicleId: 'vm-003',
    vehicleName: 'Ford Ranger Wildtrak 2022',
    plateNumber: '30G-222.10',
    totalBookings: 13,
    grossRevenue: 45400000,
    netRevenue: 38200000,
  },
];

export const ledgerSeed = [
  {
    id: 'ldg-001',
    transactionCode: 'TXN-20260403-001',
    transactionType: 'rental_income',
    amount: 1950000,
    direction: 'credit',
    status: 'success',
    createdAt: '2026-04-03T09:00:00.000Z',
    description: 'Thu tien don thue TX-BOOK-20260401-001',
  },
  {
    id: 'ldg-002',
    transactionCode: 'TXN-20260402-011',
    transactionType: 'maintenance_fee',
    amount: 3200000,
    direction: 'debit',
    status: 'success',
    createdAt: '2026-04-02T17:20:00.000Z',
    description: 'Thanh toan bao tri xe 59A-567.89',
  },
  {
    id: 'ldg-003',
    transactionCode: 'TXN-20260401-017',
    transactionType: 'withdrawal',
    amount: 2800000,
    direction: 'debit',
    status: 'processing',
    createdAt: '2026-04-01T10:25:00.000Z',
    description: 'yêu cầu rút tiền WD-20260401-003',
  },
];

export const paymentHistorySeed = [
  {
    id: 'payh-001',
    paymentCode: 'PAY-20260403-333',
    method: 'VNPay',
    amount: 1950000,
    status: 'success',
    createdAt: '2026-04-03T09:00:00.000Z',
    description: 'Thanh toan tu khách hàng cho don TX-BOOK-20260401-001',
  },
  {
    id: 'payh-002',
    paymentCode: 'PAY-20260401-020',
    method: 'BankTransfer',
    amount: 2800000,
    status: 'pending',
    createdAt: '2026-04-01T10:24:00.000Z',
    description: 'yêu cầu rút tiền Đang cho xu ly',
  },
];

export const withdrawalRequestsSeed = [
  {
    id: 'wd-001',
    requestCode: 'WD-20260401-003',
    amount: 2800000,
    status: 'processing',
    bankName: 'Vietcombank',
    bankAccountNumber: '001100889977',
    createdAt: '2026-04-01T10:23:00.000Z',
  },
  {
    id: 'wd-002',
    requestCode: 'WD-20260329-002',
    amount: 1800000,
    status: 'pending',
    bankName: 'Vietcombank',
    bankAccountNumber: '001100889977',
    createdAt: '2026-03-29T09:30:00.000Z',
  },
];

export const walletSeed = {
  currentBalance: 12450000,
  availableBalance: 8400000,
  pendingWithdrawal: 2250000,
  processingWithdrawal: 1800000,
  minimumWithdrawal: 100000,
  defaultBankAccount: {
    bankName: 'Vietcombank',
    bankAccountNumber: '001100889977',
    accountHolderName: 'Nguyen Van Minh',
  },
};

