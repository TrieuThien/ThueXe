# ThueXe
Hệ thống cho thuê xe

Đây là tổng quan kiến trúc của dự án ThueXe (Hệ thống cho thuê xe):                                        
                                
  ---                                                                                                        
  Kiến trúc tổng thể                                                                                         
                                                                                                             
  Dự án là một nền tảng đặt xe đa người dùng với 5 module riêng biệt:                                        
                                                                                                             
  ThueXe/                                                                                                    
  ├── server/          # Backend API                                                                         
  ├── admin/           # Web admin panel
  ├── vehicle_owners/  # Web portal cho chủ xe
  ├── customer_mobile/ # App mobile khách hàng
  └── driver_mobile/   # App mobile tài xế

  ---
  Các thành phần

  Backend — server/ (Node.js + Express)

  - Framework: Express.js (ESM — .mjs)
  - Database: MySQL 2
  - Auth: JWT + bcryptjs, cookie-based sessions
  - Upload: Multer + Cloudinary
  - Email: Nodemailer
  - Validation: express-validator + Joi
  - Security: Helmet, CORS, rate limiting
  - Kiến trúc: Route → Controller → Service → Repository/Model (layered architecture)
  - Migrations: SQL-based migration files
  - Domains chính: auth, booking, car, chat, coupon, driver, owner, rental, ride, tariff, tracking, wallet,
  reward points, dashboard

  Admin Panel — admin/ (React + Vite)

  - Framework: React 18 + React Router v6
  - State: TanStack Query (server state)
  - UI: Lucide React icons
  - i18n: react-i18next (đa ngôn ngữ)
  - Maps: @googlemaps/js-api-loader
  - Trang chính: Dashboard, Bookings, Cars, Drivers, Customers, Staff, Finance, Reports, Settings, Map
  Tracking, Coupons, Zones, Tariffs, Reward Points, Vehicle Owners

  Vehicle Owners Portal — vehicle_owners/ (React + Vite)

  - Framework: React 18 + React Router
  - State: Zustand + TanStack Query
  - Forms: react-hook-form + Zod validation
  - Notifications: react-hot-toast

  Customer Mobile App — customer_mobile/ (React Native + Expo)

  - Framework: Expo (SDK) + expo-router
  - Navigation: React Navigation (stack + bottom tabs)
  - State: Zustand (auth/global) + TanStack Query (server)
  - Forms: react-hook-form + Zod
  - Maps: react-native-maps + expo-location
  - Realtime: socket.io-client
  - HTTP: Axios
  - Screens: Home, Booking (ride/rental), Trip management, Account, Wallet

  Driver Mobile App — driver_mobile/ (React Native + Expo)

  - Cấu trúc tương tự customer_mobile
  - Thêm: expo-secure-store (lưu token an toàn)

  ---
  Luồng dữ liệu

  Customer/Driver App  ─┐
  Vehicle Owner Portal  ─┤──► Express REST API ──► MySQL DB
  Admin Panel           ─┘         │
                                    ├──► Cloudinary (ảnh)
                                    ├──► Socket.io (realtime chat/tracking)
                                    └──► Email (Nodemailer)

  ---
  Điểm nổi bật

  - Dual service type: Hỗ trợ cả ride (đặt xe theo chuyến) và rental (thuê xe dài ngày)
  - Multi-role: Customer, Driver, Vehicle Owner, Admin/Staff
  - Realtime: Tracking vị trí + chat trong chuyến đi
  - Wallet system: Ví điện tử tích hợp + reward points
  - Document management: Quản lý giấy tờ xe/tài xế