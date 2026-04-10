import { ManagedTrip } from "../../types";

const now = Date.now();

export const mockManagedTrips: ManagedTrip[] = [
  {
    id: "trip_active_1",
    bookingId: "booking_active_1",
    kind: "RIDE",
    serviceLabel: "Xe 4 chỗ",
    status: "PENDING",
    etaMinutes: 6,
    createdAt: new Date(now - 7 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 1 * 60 * 1000).toISOString(),
    route: {
      pickupAddress: "79 Nguyễn Huệ, Quận 1",
      destinationAddress: "ông Viên Phần Mềm Quang Trung, Quận 12",
      stopAddresses: ["Satra Phạm Văn Đồng"],
    },
    driver: {
      id: "driver_active_1",
      fullName: "Lê Minh Hiếu",
      phoneNumber: "0909444555",
      rating: 4.85,
      vehicleName: "Hyundai Accent",
      licensePlate: "51K-889.99",
    },
    durationMinutes: 45,
    priceInfo: {
      estimatedPrice: 186000,
      currency: "VND",
      paymentMethod: "WALLET",
    },
  },
  {
    id: "trip_hist_1",
    bookingId: "booking_hist_1",
    kind: "RIDE",
    serviceLabel: "Xe máy",
    status: "COMPLETED",
    createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000).toISOString(),
    startedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    completedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 36 * 60 * 1000).toISOString(),
    route: {
      pickupAddress: "Chợ Bến Thành",
      destinationAddress: "Sân bay Tân Sơn Nhất",
    },
    durationMinutes: 31,
    driver: {
      id: "driver_hist_1",
      fullName: "Phạm Quốc Tuấn",
      phoneNumber: "0911888777",
      rating: 4.91,
      vehicleName: "Xe máy",
      licensePlate: "59N2-356.88",
    },
    priceInfo: {
      estimatedPrice: 93000,
      finalPrice: 91000,
      currency: "VND",
      paymentMethod: "CASH",
    },
  },
  {
    id: "trip_hist_2",
    bookingId: "booking_hist_2",
    kind: "RENTAL",
    serviceLabel: "Thuê xe 4 giờ",
    status: "CANCELLED",
    createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
    route: {
      pickupAddress: "Vinhomes Central Park",
      destinationAddress: "District 7, TP.HCM",
    },
    priceInfo: {
      estimatedPrice: 420000,
      currency: "VND",
      paymentMethod: "MOMO",
    },
  },
];
