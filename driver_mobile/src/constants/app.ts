export const APP_NAME = 'ThueXe Tai Xe';
export const API_TIMEOUT = 10000;
// Đặt EXPO_PUBLIC_API_URL=http://<LAN_IP>:5000 trong file .env khi chạy trên thiết bị thật
// Android emulator dùng 10.0.2.2; iOS simulator dùng localhost
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5000';
