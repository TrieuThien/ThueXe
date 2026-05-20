# ThueXe — Cổng Chủ Xe (Vehicle Owners)

Ứng dụng web dành cho **chủ xe** đăng ký và quản lý phương tiện trên nền tảng ThueXe.
Xây dựng bằng **React 19 + Vite + Tailwind CSS**.

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| State (server) | TanStack React Query 5 |
| State (client) | Zustand 5 |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| Notifications | React Hot Toast |
| Icons | Lucide React |

## Cấu trúc thư mục

```
vehicle_owners/
├── src/
│   ├── app/
│   │   ├── App.jsx              # Root app
│   │   ├── AppProviders.jsx     # Query client, global providers
│   │   ├── router.jsx           # Định nghĩa toàn bộ routes
│   │   └── guards/              # RequireOwnerAuth (bảo vệ route)
│   ├── features/                # Tính năng theo domain
│   │   ├── owner-auth/          # Đăng ký, đăng nhập
│   │   ├── owner-account/       # Hồ sơ, đổi mật khẩu
│   │   ├── owner-landing/       # Trang giới thiệu (đa ngôn ngữ)
│   │   ├── owner-revenue/       # Doanh thu, ví, rút tiền
│   │   ├── owner-verification/  # Upload giấy tờ xác minh
│   │   ├── rental-bookings/     # Danh sách đơn thuê xe
│   │   ├── vehicle-activity/    # Lịch & biểu đồ Gantt hoạt động xe
│   │   ├── vehicle-maintenance/ # Quản lý bảo dưỡng
│   │   └── vehicle-management/  # Đăng ký, quản lý phương tiện
│   ├── pages/                   # Page components (map tới routes)
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar, Breadcrumbs
│   │   └── ui/                  # DataTable, StatusBadge, PageHeader...
│   ├── hooks/                   # useOwnerRealtime
│   ├── constants/               # Routes, enums, status
│   ├── layouts/                 # OwnerLayout
│   └── mocks/                   # Mock data cho development
└── public/
```

## Tính năng chính

| Trang | Mô tả |
|---|---|
| Landing | Giới thiệu nền tảng, đa ngôn ngữ (i18n) |
| Đăng ký / Đăng nhập | Auth với xác minh email |
| Dashboard | Tổng quan hoạt động |
| Quản lý xe | Thêm/sửa phương tiện, gói cho thuê |
| Đơn thuê | Danh sách, chi tiết, hợp đồng |
| Hoạt động xe | Lịch khả dụng, biểu đồ Gantt |
| Bảo dưỡng | Ghi nhận & theo dõi bảo dưỡng |
| Doanh thu | Thống kê thu nhập theo xe |
| Ví | Nạp tiền, rút tiền, lịch sử giao dịch |
| Xác minh | Upload giấy tờ pháp lý |
| Tài khoản | Cập nhật hồ sơ, đổi mật khẩu |

## Cài đặt & Chạy

### 1. Yêu cầu

- Node.js >= 18

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` tại thư mục gốc:

```env
VITE_API_URL=http://localhost:8000
```

### 4. Khởi chạy Development

```bash
npm run dev
```

Ứng dụng chạy tại `http://localhost:5174` (hoặc port được Vite gán tự động).

### 5. Build Production

```bash
npm run build
```

Output tại thư mục `dist/`.

## Routes

Tất cả routes nằm dưới prefix `/owner`:

```
/owner                    → Landing page
/owner/login              → Đăng nhập
/owner/register           → Đăng ký
/owner/register/verify    → Xác minh email
/owner/dashboard          → Dashboard (yêu cầu đăng nhập)
/owner/vehicles           → Quản lý xe
/owner/bookings           → Đơn thuê xe
/owner/bookings/:id       → Chi tiết đơn thuê
/owner/maintenance        → Bảo dưỡng
/owner/revenue            → Doanh thu
/owner/wallet             → Ví tiền
/owner/withdrawals        → Yêu cầu rút tiền
/owner/documents          → Giấy tờ pháp lý
/owner/verification       → Trạng thái xác minh
/owner/vehicle-activity   → Lịch hoạt động xe
/owner/rental-packages    → Gói cho thuê
/owner/account            → Tài khoản
```
