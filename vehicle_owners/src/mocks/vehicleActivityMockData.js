export const VEHICLE_ACTIVITY_STATUSES = ['available', 'rented', 'maintenance', 'unavailable'];
export const VEHICLE_VERIFICATION_STATUSES = ['verified', 'pending', 'rejected'];
export const SCHEDULE_BLOCK_TYPES = ['available', 'unavailable', 'booked', 'maintenance'];

export const ownerVehiclesActivity = [
  {
    id: 'vh-act-001',
    plateNumber: '51H-123.45',
    vehicleType: 'Sedan',
    brand: 'Toyota',
    model: 'Vios',
    year: 2023,
    status: 'available',
    verificationStatus: 'verified',
    location: {
      lat: 10.7769,
      lng: 106.7009,
      label: 'Quan 1, TP.HCM',
      updatedAt: '2026-04-04T08:30:00.000Z',
    },
  },
  {
    id: 'vh-act-002',
    plateNumber: '59A-567.89',
    vehicleType: 'MPV',
    brand: 'Kia',
    model: 'Carnival',
    year: 2024,
    status: 'rented',
    verificationStatus: 'verified',
    location: {
      lat: 10.8433,
      lng: 106.772,
      label: 'Thu Duc, TP.HCM',
      updatedAt: '2026-04-04T08:42:00.000Z',
    },
  },
  {
    id: 'vh-act-003',
    plateNumber: '30G-222.10',
    vehicleType: 'Pickup',
    brand: 'Ford',
    model: 'Ranger Wildtrak',
    year: 2022,
    status: 'maintenance',
    verificationStatus: 'pending',
    location: {
      lat: 16.0616,
      lng: 108.2234,
      label: 'Hai Chau, Da Nang',
      updatedAt: '2026-04-04T07:58:00.000Z',
    },
  },
  {
    id: 'vh-act-004',
    plateNumber: '47A-315.20',
    vehicleType: 'SUV',
    brand: 'Mazda',
    model: 'CX-5',
    year: 2023,
    status: 'unavailable',
    verificationStatus: 'rejected',
    location: null,
  },
];

export const vehicleScheduleBlocks = {
  'vh-act-001': [
    {
      id: 'sch-101',
      type: 'booked',
      startAt: '2026-04-05T08:00:00.000Z',
      endAt: '2026-04-07T18:00:00.000Z',
      note: 'Don thue TX-20260405-101',
    },
    {
      id: 'sch-102',
      type: 'available',
      startAt: '2026-04-08T00:00:00.000Z',
      endAt: '2026-04-15T23:59:00.000Z',
      note: '',
    },
  ],
  'vh-act-002': [
    {
      id: 'sch-201',
      type: 'booked',
      startAt: '2026-04-04T02:00:00.000Z',
      endAt: '2026-04-06T13:00:00.000Z',
      note: 'Don thue TX-20260404-201',
    },
    {
      id: 'sch-202',
      type: 'maintenance',
      startAt: '2026-04-08T01:00:00.000Z',
      endAt: '2026-04-09T10:00:00.000Z',
      note: 'Bao duong dinh ky',
    },
  ],
  'vh-act-003': [
    {
      id: 'sch-301',
      type: 'maintenance',
      startAt: '2026-04-03T01:00:00.000Z',
      endAt: '2026-04-10T10:00:00.000Z',
      note: 'Sửa phanh + can bang',
    },
  ],
  'vh-act-004': [
    {
      id: 'sch-401',
      type: 'unavailable',
      startAt: '2026-04-04T00:00:00.000Z',
      endAt: '2026-04-20T23:00:00.000Z',
      note: 'Tam ngung khai thac',
    },
  ],
};

