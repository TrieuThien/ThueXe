# ThueXe — Admin Panel

Giao diện quản trị nền tảng ThueXe, xây dựng bằng **React 19 + Vite + Tailwind CSS**.
Hỗ trợ hai vai trò: **Admin** (toàn quyền) và **Dispatcher** (điều phối chuyến đi).

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| HTTP | Axios |
| Maps | Google Maps JS API (`@googlemaps/js-api-loader`) |
| i18n | i18next + react-i18next (EN / VI) |
| Notifications | React Hot Toast |
| Icons | Lucide React |

## Cấu trúc thư mục

```
admin/
├── src/
│   ├── App.jsx                   # Root app
│   ├── main.jsx                  # Entry point
│   ├── routes/
│   │   └── AppRoutes.jsx         # Toàn bộ routing, phân quyền theo role
│   ├── config/
│   │   └── roleRoutes.js         # Cấu hình menu & route theo role
│   ├── pages/                    # Page components theo module
│   │   ├── bookings/             # Tạo, dispatch, danh sách booking
│   │   ├── rental-bookings/      # Đặt thuê xe tự lái
│   │   ├── customers/            # CRUD khách hàng
│   │   ├── drivers/              # CRUD tài xế
│   │   ├── vehicle-owners/       # CRUD chủ xe
│   │   ├── staff/                # CRUD nhân viên
│   │   ├── cars/                 # CRUD phương tiện
│   │   ├── tariffs/              # Quản lý bảng giá
│   │   ├── zones/                # Vùng phủ sóng (polygon map)
│   │   ├── coupons/              # Mã giảm giá
│   │   ├── banners/              # Banner quảng cáo
│   │   ├── documents/            # Duyệt giấy tờ người dùng & xe
│   │   ├── finance/              # Giao dịch, ví, payout
│   │   ├── reports/              # Báo cáo tài xế, khách hàng, thanh toán
│   │   ├── settings/             # Cài đặt hệ thống
│   │   ├── chat/                 # Hỗ trợ chat
│   │   └── rentals/              # Gói thuê xe
│   ├── components/
│   │   ├── layout/               # Layout, Sidebar, Topbar
│   │   ├── maps/                 # Google Maps: vẽ zone, route, tracking
│   │   ├── bookings/             # BookingTable, BookingFilters
│   │   ├── common/               # StatCard, PageHeader, SkeletonBlock
│   │   └── ...                   # Coupons, banners, auth components
│   ├── hooks/                    # useBookingFilters, useGoogleRoute...
│   ├── i18n/
│   │   └── locales/              # en/common.json, vi/common.json
│   └── data/                     # Static data (countries, homeData)
└── public/
```

## Phân quyền theo Role

### Admin
Toàn quyền trên tất cả module:
- Dashboard thống kê tổng quan
- Quản lý: khách hàng, tài xế, chủ xe, nhân viên, phương tiện
- Đặt xe & điều phối chuyến đi
- Thuê xe tự lái (rental bookings)
- Bảng giá & vùng phủ sóng
- Mã giảm giá & điểm thưởng
- Banner quảng cáo
- Duyệt giấy tờ (người dùng, tài xế, chủ xe, phương tiện)
- Tài chính: giao dịch, ví, payout
- Báo cáo & thống kê
- Cài đặt hệ thống

### Dispatcher
Quyền hạn giới hạn:
- Dashboard điều phối
- Quản lý khách hàng
- Tạo & dispatch booking
- Theo dõi bản đồ real-time
- Rental bookings
- Chat hỗ trợ

## Cài đặt & Chạy

### 1. Yêu cầu

- Node.js >= 18
- Google Maps API Key (để dùng tính năng bản đồ)

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` tại thư mục gốc (tham khảo `.env.example`):

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. Khởi chạy Development

```bash
npm run dev
```

Ứng dụng chạy tại `http://localhost:5173`.

### 5. Build Production

```bash
npm run build
```

Output tại thư mục `dist/`.

## Routes

```
/                         → Trang giới thiệu (HomePage)
/login                    → Đăng nhập

/admin/dashboard          → Dashboard admin
/admin/customers          → Danh sách khách hàng
/admin/drivers            → Danh sách tài xế
/admin/vehicle-owners     → Danh sách chủ xe
/admin/staff              → Danh sách nhân viên
/admin/vehicles           → Phương tiện
/admin/bookings           → Danh sách booking
/admin/booking/create     → Tạo booking mới
/admin/booking/dispatch   → Điều phối chuyến
/admin/rental-bookings    → Thuê xe tự lái
/admin/tariffs            → Bảng giá
/admin/areas              → Vùng phủ sóng
/admin/coupons            → Mã giảm giá
/admin/banners            → Banner
/admin/documents/...      → Duyệt giấy tờ
/admin/transactions       → Giao dịch tài chính
/admin/wallets            → Ví người dùng
/admin/payouts            → Payout tài xế
/admin/reports/...        → Báo cáo
/admin/settings           → Cài đặt hệ thống
/admin/chat-support       → Chat hỗ trợ
/admin/map-tracking       → Theo dõi bản đồ

/dispatcher/dashboard     → Dashboard dispatcher
/dispatcher/bookings      → Booking list
/dispatcher/customers     → Khách hàng
```

## Đa ngôn ngữ

Hỗ trợ **Tiếng Anh** và **Tiếng Việt** thông qua `i18next`.
File dịch tại `src/i18n/locales/en/common.json` và `src/i18n/locales/vi/common.json`.
