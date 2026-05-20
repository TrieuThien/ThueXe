# ThueXe — Server

Backend API cho hệ thống cho thuê xe ThueXe, xây dựng bằng **Node.js + Express 5** và **MySQL**.

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MySQL 2 |
| Realtime | Socket.io |
| Auth | JWT (access + refresh token, HttpOnly cookie) |
| Upload | Multer + Cloudinary |
| Email | Nodemailer (SMTP Gmail) |
| Payment | SePay Payment Gateway |
| Security | Helmet, express-rate-limit, bcryptjs |
| Validation | express-validator, Joi |

## Cấu trúc thư mục

```
server/
├── index.mjs                  # Entry point
├── config/                    # Cloudinary, MySQL connection
├── controllers/               # Xử lý request theo từng role
│   ├── customer/              # API dành cho khách hàng
│   ├── driver/                # API dành cho tài xế
│   └── ...                    # Admin, owner, booking, payment...
├── repositories/              # Truy vấn database (tách biệt khỏi controller)
│   ├── customer/
│   ├── driver/
│   └── matching/
├── routes/                    # Định nghĩa endpoint API
│   ├── customer/
│   ├── driver/
│   └── ...
├── middlewares/               # Auth, role, rate limit, upload, validation
├── socket/                    # Socket.io — real-time matching tài xế
├── scripts/                   # Migrate DB, seed admin
└── tests/                     # Integration tests
```

## API Groups

| Prefix | Mô tả |
|---|---|
| `/api/auth` | Đăng nhập / đăng xuất admin & staff |
| `/api/customer/...` | Auth, đặt xe, ví, coupon, chat (khách hàng) |
| `/api/driver/...` | Auth, chuyến đi, thu nhập, ví, thông báo (tài xế) |
| `/api/owner/...` | Auth, xe, tài liệu, đặt thuê (chủ xe) |
| `/api/bookings` | Quản lý booking (admin) |
| `/api/rentals` | Thuê xe tự lái |
| `/api/payment` | Cổng thanh toán SePay |
| `/api/wallet` | Giao dịch ví |
| `/api/dashboard` | Thống kê dashboard admin |
| `/api/settings` | Cài đặt hệ thống |

## Cài đặt & Chạy

### 1. Yêu cầu

- Node.js >= 18
- MySQL >= 8

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Sao chép file `.env.example` thành `.env` và điền các giá trị:

```bash
cp .env.example .env
```

Các biến quan trọng:

```env
PORT=8000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=thuexe

JWT_SECRET=...
JWT_REFRESH_SECRET=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

EMAIL_APP_ADMIN=...
EMAIL_APP_PASSWORD=...
```

### 4. Migrate database

```bash
npm run migrate
```

### 5. Seed tài khoản admin

```bash
npm run seed:admin
```

### 6. Khởi chạy

```bash
# Development (hot-reload)
npm run dev

# Production
npm start
```

Server mặc định chạy tại `http://localhost:8000`.

## Chạy Tests

```bash
npm test                        # Booking flow
npm run test:documents          # Module tài liệu
npm run test:customer-home      # Home API khách hàng
npm run test:owner              # Module chủ xe
npm run test:admin-refactor     # Admin refactor
npm run test:vehicle-owners-admin
```

## Kiến trúc

Server theo mô hình **Route → Controller → Repository**:

- **Route**: định nghĩa endpoint, gắn middleware xác thực/phân quyền.
- **Controller**: validate request, gọi repository, trả response.
- **Repository**: toàn bộ logic truy vấn SQL, không chứa business logic HTTP.

Real-time matching tài xế được xử lý qua **Socket.io** tại `socket/`.
