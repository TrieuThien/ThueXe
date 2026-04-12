export const APP_CONFIG = {
  appName: "ThueXe Customer",
  defaultCountryCode: "+84",
  defaultCurrency: "VND",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  customerApiPrefix: "/api/customer",
  realtimeEvents: [
    "booking.status.updated",
    "driver.location.updated",
    "chat.message.created",
    "payment.updated",
    "wallet.updated",
  ] as const,
};
