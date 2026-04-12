export const QUERY_KEYS = {
  me: ["auth", "me"] as const,
  homeOverview: ["home", "overview"] as const,
  rideRouteEstimate: ["ride", "route-estimate"] as const,
  rideVehicleOptions: ["ride", "vehicle-options"] as const,
  ridePricing: ["ride", "pricing"] as const,
  driverAllocation: ["ride", "driver-allocation"] as const,
  rentalPackages: ["rental", "packages"] as const,
  rentalPricing: ["rental", "pricing"] as const,
  activeTrip: ["trip", "active"] as const,
  tripHistory: ["trip", "history"] as const,
  tripDetail: ["trip", "detail"] as const,
  driverTracking: ["trip", "driver-tracking"] as const,
  tripChatThread: ["trip", "chat-thread"] as const,
  tripCancelPolicy: ["trip", "cancel-policy"] as const,
  walletPaymentMethods: ["wallet", "payment-methods"] as const,
  walletBookingPaymentSummary: ["wallet", "booking-payment-summary"] as const,
  walletWithdrawalRequests: ["wallet", "withdrawal-requests"] as const,
  wallet: ["wallet", "account"] as const,
  walletTransactions: ["wallet", "transactions"] as const,
  rideBookings: ["booking", "ride"] as const,
  rentalBookings: ["booking", "rental"] as const,
};

export const QUERY_KEY_FACTORY = {
  auth: {
    me: () => ["auth", "me"] as const,
    session: () => ["auth", "session"] as const,
  },
  home: {
    root: () => ["home"] as const,
    overview: () => ["home", "overview"] as const,
    notifications: (page = 1, limit = 20) => ["home", "notifications", page, limit] as const,
    unreadCount: () => ["home", "notifications", "unread-count"] as const,
  },
  bookings: {
    currentRide: () => ["bookings", "ride", "current"] as const,
    currentRental: () => ["bookings", "rental", "current"] as const,
    detail: (bookingId: string | number) => ["bookings", bookingId] as const,
    tracking: (bookingId: string | number) => ["bookings", bookingId, "tracking"] as const,
    rideHistory: (page = 1, limit = 20, status?: number) => ["bookings", "ride", "history", page, limit, status ?? "all"] as const,
    rentalHistory: (page = 1, limit = 20) => ["bookings", "rental", "history", page, limit] as const,
  },
  rentalPackages: {
    list: (serviceType: string | number) => ["rentalPackages", serviceType] as const,
  },
  coupons: {
    available: () => ["coupons", "available"] as const,
    mine: () => ["coupons", "my-available"] as const,
  },
  chats: {
    booking: (bookingId: string | number) => ["chats", "booking", bookingId] as const,
    rental: (rentalId: string | number) => ["chats", "rental", rentalId] as const,
  },
  wallet: {
    overview: () => ["wallet"] as const,
    transactions: (page = 1, limit = 20, entryType = "all") => ["wallet", "transactions", page, limit, entryType] as const,
    payment: (paymentId: string | number) => ["payments", paymentId] as const,
    withdrawals: (page = 1, limit = 20) => ["wallet", "withdrawals", page, limit] as const,
  },
  realtime: {
    health: () => ["realtime", "health"] as const,
    bookingStatus: (bookingId: string | number) => ["realtime", "booking", bookingId, "status"] as const,
    driverLocation: (bookingId: string | number) => ["realtime", "booking", bookingId, "driver-location"] as const,
  },
};
