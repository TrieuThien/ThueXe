export const maintenanceStatuses = ['scheduled', 'in_progress', 'completed'];

export const maintenanceStatusLabels = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
};

export const maintenanceRecordsSeed = [
  {
    id: 'mnt-001',
    vehicleId: 'vm-001',
    description: 'Bao duong tong quat 20.000km',
    startDate: '2026-04-08',
    endDate: '2026-04-09',
    cost: 2800000,
    status: 'scheduled',
    note: 'Thay dau + kiem tra phanh',
    createdAt: '2026-04-03T03:00:00.000Z',
  },
  {
    id: 'mnt-002',
    vehicleId: 'vm-003',
    description: 'Sửa he thong phanh',
    startDate: '2026-04-03',
    endDate: '2026-04-06',
    cost: 5400000,
    status: 'in_progress',
    note: 'Xe tam thoi Không kha dung cho thue',
    createdAt: '2026-04-02T02:10:00.000Z',
  },
  {
    id: 'mnt-003',
    vehicleId: 'vm-002',
    description: 'Thay lop truoc',
    startDate: '2026-03-26',
    endDate: '2026-03-27',
    cost: 3200000,
    status: 'completed',
    note: '',
    createdAt: '2026-03-25T09:30:00.000Z',
  },
];

