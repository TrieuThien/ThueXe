import { RentalBooking, RideBooking, User, WalletAccount, WalletTransaction } from "../../types";

const now = new Date().toISOString();

export const mockUser: User = {
  id: "user_1",
  fullName: "Nguyen Van A",
  firstName: "Nguyen",
  lastName: "Van A",
  phoneNumber: "0912345678",
  email: "nguyenvana@gmail.com",
  address: "613 Au Co, phuong Tan Phu, TP.HCM",
  gender: "male",
  country: "Vietnam",
  isPhoneVerified: true,
  avatarUrl: "https://res.cloudinary.com/dsja40n6v/image/upload/v1773641739/thuexe/customers/mvzjqr2pj9gzg84fscsv.png",
  rewardPoints: 260,
  rewardPointsRedeemed: 20,
  createdAt: now,
  updatedAt: now,
};

export const mockRideBookings: RideBooking[] = [
  {
    id: "ride_1",
    customerId: "user_1",
    rideType: "CALL_RIDE",
    estimatedFare: 120000,
    finalFare: 118000,
    status: "COMPLETED",
    routeInfo: {
      pickupAddress: "Ben Thanh, Quan 1",
      destinationAddress: "San bay Tan Son Nhat",
      pickupLocation: { lat: 10.772, lng: 106.698 },
      destinationLocation: { lat: 10.818, lng: 106.651 },
      distanceKm: 9.8,
      durationMinutes: 28,
    },
    driver: {
      id: "driver_1",
      fullName: "Tran Van B",
      phoneNumber: "0988111222",
      rating: 4.9,
      vehicleName: "Toyota Vios",
      licensePlate: "51H-123.45",
    },
    createdAt: now,
    updatedAt: now,
  },
];

export const mockRentalBookings: RentalBooking[] = [
  {
    id: "rental_1",
    customerId: "user_1",
    rideType: "RENTAL_DRIVER",
    pickupAddress: "Phu Nhuan, TP.HCM",
    startAt: now,
    endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    estimatedTotalPrice: 450000,
    finalTotalPrice: 450000,
    status: "DRIVER_ASSIGNED",
    notes: "Can tai xe thong thao duong noi thanh",
    createdAt: now,
    updatedAt: now,
  },
];

export const mockWalletAccount: WalletAccount = {
  id: "wallet_1",
  customerId: "user_1",
  balance: 1520000,
  currency: "VND",
  updatedAt: now,
};

export const mockWalletTransactions: WalletTransaction[] = [
  {
    id: "txn_1",
    walletAccountId: "wallet_1",
    type: "TOP_UP",
    amount: 500000,
    balanceAfter: 1520000,
    description: "Nạp ví qua MOMO",
    createdAt: now,
  },
  {
    id: "txn_2",
    walletAccountId: "wallet_1",
    type: "BOOKING_PAYMENT",
    amount: -118000,
    balanceAfter: 1020000,
    description: "Thanh toan chuyen xe #ride_1",
    referenceId: "ride_1",
    createdAt: now,
  },
];
