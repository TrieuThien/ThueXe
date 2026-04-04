# OWNER MODULE FINAL SPEC (Frontend + Backend)

Tai lieu nay la ban chot de team backend Node.js/Express co the implement API ngay, bam sat code frontend `vehicle_owners`.

## 1. Frontend Audit (hien trang va de xuat chot)

### 1.1 Route flow hien tai (src/app/router.jsx)
- Public:
  - `/owner`
  - `/owner/login`
  - `/owner/register`
  - `/owner/register/verify`
- Dashboard owner:
  - `/owner/dashboard`
  - `/owner/account`
  - `/owner/verification`
  - `/owner/vehicle-activity`
  - `/owner/revenue`
  - `/owner/vehicles`
  - `/owner/documents`
  - `/owner/bookings`
  - `/owner/bookings/:bookingId`
  - `/owner/maintenance`
  - `/owner/payments`
  - `/owner/wallet`
  - `/owner/withdrawals`

### 1.2 Danh gia nhanh
- Route: hop ly, du module business.
- Component reuse: tot o nhom `PageHeader`, `SummaryCard`, `DataTable`, modal/forms.
- Logic trung lap: co o filter/pagination/table status badge (can tron tiep theo `shared hooks`).
- Loading/error/empty state: da co o nhieu man, nen chuan hoa 1 pattern chung.
- UX/responsive: da support tablet/desktop tot, table da co horizontal scroll.
- Backend readiness: service layer da tach theo domain, de map endpoint that.

### 1.3 Viec can chot truoc production
- Them route guard auth + refresh token flow tai `router`.
- Chuan hoa response parser trong `apiClient` theo 1 contract chung.
- Chuan hoa enum status (da tao file `src/constants/domainEnums.js`).
- Thong nhat message loi backend -> frontend theo `error.code`.
- Them global skeleton component de UX dong bo.

### 1.4 Cau truc thu muc production de xuat
```txt
src/
  app/
  constants/
    routes.js
    domainEnums.js
    apiErrorCodes.js
  components/
    ui/
    layout/
  features/
    owner-auth/
    owner-verification/
    owner-account/
    vehicle-management/
    vehicle-activity/
    vehicle-maintenance/
    rental-bookings/
    owner-revenue/
  pages/
  services/
    apiClient.js
    modules/
      ownerAuthService.js
      ownerVerificationService.js
      ownerProfileService.js
      vehicleService.js
      vehicleDocumentService.js
      vehicleActivityService.js
      scheduleService.js
      maintenanceService.js
      rentalOrderService.js
      contractService.js
      walletService.js
      paymentService.js
      withdrawalService.js
      dashboardService.js
```

---

## 2. Response contract chung (bat buoc)

### 2.1 Success response
```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01JABC123",
    "timestamp": "2026-04-04T12:30:00.000Z"
  }
}
```

### 2.2 Pagination response
```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 200,
    "totalPages": 10,
    "requestId": "req_01JABC123",
    "timestamp": "2026-04-04T12:30:00.000Z"
  }
}
```

### 2.3 Validation error response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Du lieu khong hop le.",
    "fields": [
      { "field": "phoneNumber", "message": "So dien thoai khong hop le." },
      { "field": "password", "message": "Mat khau qua yeu." }
    ]
  },
  "meta": {
    "requestId": "req_01JABC123"
  }
}
```

### 2.4 Business error response
```json
{
  "success": false,
  "error": {
    "code": "PLATE_ALREADY_EXISTS",
    "message": "Bien so da ton tai trong he thong."
  },
  "meta": {
    "requestId": "req_01JABC123"
  }
}
```

---

## 3. Enum can thong nhat FE/BE

Chi tiet da co tai file: `src/constants/domainEnums.js`

- owner verification status:
  - `not_submitted`
  - `pending_review`
  - `verified`
  - `rejected`
- vehicle status (usage):
  - `available`
  - `rented`
  - `maintenance`
  - `unavailable`
- vehicle verification status:
  - `pending_review`
  - `verified`
  - `missing_documents`
  - `rejected`
- rental booking status:
  - `pending`
  - `confirmed`
  - `in_progress`
  - `completed`
  - `canceled`
- payment status:
  - `pending`
  - `processing`
  - `success`
  - `failed`
  - `refunded`
- withdrawal status:
  - `pending`
  - `processing`
  - `approved`
  - `rejected`
  - `paid`
- document verification status:
  - `missing`
  - `pending`
  - `verified`
  - `rejected`
  - `expired`

---

## 4. API Backend theo module

> Base path khuyen nghi: `/api/owner`
> Auth: JWT bearer token (tru auth register/login/refresh).

## 4.1 Auth owner

### POST `/api/owner/auth/register`
- Auth required: No
- Body:
```json
{
  "fullName": "Nguyen Van A",
  "phoneNumber": "0912345678",
  "email": "owner@example.com",
  "address": "Q1, TP.HCM",
  "password": "Strong@123",
  "bankInfo": {
    "bankName": "Vietcombank",
    "accountNumber": "001100889977",
    "bankCode": "VCB",
    "swiftCode": "BFTVVNVX"
  }
}
```
- Response:
```json
{
  "success": true,
  "data": {
    "ownerId": "own_001",
    "status": "pending_review",
    "verificationTicket": "KYC-123456"
  }
}
```
- Validation:
  - email unique
  - phone unique
  - strong password
  - bank info format
- Errors:
  - `EMAIL_ALREADY_EXISTS`
  - `PHONE_ALREADY_EXISTS`
  - `WEAK_PASSWORD`
- Quyen truy cap: Public

### POST `/api/owner/auth/login`
- Auth required: No
- Body:
```json
{ "identifier": "owner@example.com", "password": "Owner@123" }
```
- Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "owner": {
      "id": "own_001",
      "fullName": "Nguyen Van A"
    }
  }
}
```
- Errors: `ACCOUNT_NOT_FOUND`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`

### POST `/api/owner/auth/refresh-token`
- Auth required: Refresh token
- Body: `{ "refreshToken": "..." }`

### POST `/api/owner/auth/logout`
- Auth required: Owner
- Body: `{ "refreshToken": "..." }`

---

## 4.2 Owner verification

### GET `/api/owner/verification/status`
- Auth required: Owner
- Response:
```json
{
  "success": true,
  "data": {
    "ownerId": "own_001",
    "status": "rejected",
    "progressPercent": 75,
    "submittedAt": "2026-04-02T08:15:00.000Z",
    "reviewedAt": "2026-04-03T04:20:00.000Z",
    "adminNote": "Can bo sung CCCD mat truoc."
  }
}
```

### GET `/api/owner/verification/required-documents`
- Auth required: Owner
- Response: danh muc giay to + rule:
  - `required`
  - `requiresNumber`
  - `requiresExpiryDate`
  - `acceptedMimeTypes`
  - `maxSizeMB`

### GET `/api/owner/verification/submission`
- Auth required: Owner
- Response: chi tiet document da nop + status tung doc.

### POST `/api/owner/verification/documents`
- Auth required: Owner
- Content-Type: multipart/form-data
- Fields: `documentTypeId`, `file`, `documentNumber?`, `expiryDate?`
- Validation:
  - mime + size + required fields
  - expiryDate >= today (neu required)
- Errors:
  - `FILE_TOO_LARGE`
  - `UNSUPPORTED_MEDIA_TYPE`
  - `INVALID_EXPIRY_DATE`

### PUT `/api/owner/verification/documents/:documentTypeId`
- Auth required: Owner
- Use cho cap nhat ho so bi reject.

### POST `/api/owner/verification/submit`
- Auth required: Owner
- Validation: khong thieu required docs.
- Error: `INCOMPLETE_REQUIRED_DOCUMENTS`

---

## 4.3 Owner profile

### GET `/api/owner/account/profile`
- Auth required: Owner
- Response: full profile + bank info + account status + verification status.

### PATCH `/api/owner/account/profile`
- Auth required: Owner
- Body:
  - `fullName`
  - `phoneNumber`
  - `address`
  - `bankName`
  - `bankAccountNumber`
  - `bankCode`
  - `swiftCode`
- Validation:
  - phone format
  - bank account format

### POST `/api/owner/account/change-password`
- Auth required: Owner
- Body:
```json
{
  "currentPassword": "Old@123",
  "newPassword": "New@123456",
  "confirmPassword": "New@123456"
}
```
- Errors:
  - `CURRENT_PASSWORD_INVALID`
  - `WEAK_PASSWORD`

---

## 4.4 Vehicles

### GET `/api/owner/vehicle-management/vehicle-types`
- Auth required: Owner

### POST `/api/owner/vehicle-management/vehicles`
- Auth required: Owner
- Body: thong tin xe day du (type/brand/model/year/color/plate/vin/seats/transmission/fuel/odometer/notes)
- Validation:
  - plate unique
  - vin unique
  - productionYear valid
- Errors:
  - `PLATE_ALREADY_EXISTS`
  - `VIN_ALREADY_EXISTS`

### GET `/api/owner/vehicle-management/vehicles`
- Auth required: Owner
- Query: `search,status,page,pageSize`
- Response item:
  - `id`
  - `plateNumber`
  - `vehicleType`
  - `usageStatus`
  - `verificationStatus`
  - `addedAt`
  - `missingDocumentCount`

### GET `/api/owner/vehicle-management/vehicles/:vehicleId`
- Auth required: Owner
- Ownership check bat buoc.

### PUT `/api/owner/vehicle-management/vehicles/:vehicleId`
- Auth required: Owner
- Update field duoc phep sua.

---

## 4.5 Vehicle documents

### GET `/api/owner/vehicle-management/document-types`
- Auth required: Owner
- Response: danh muc giay to can nop theo backend policy.

### POST `/api/owner/vehicle-management/vehicles/:vehicleId/documents`
- Auth required: Owner
- Multipart multi-file.
- Validate:
  - required docs
  - mime/size
  - expiry date (neu co)

### GET `/api/owner/vehicle-management/vehicles/:vehicleId/verification-status`
- Auth required: Owner
- Response:
```json
{
  "success": true,
  "data": {
    "vehicleId": "vm-001",
    "verificationStatus": "missing_documents",
    "missingRequiredDocuments": ["inspection"]
  }
}
```

---

## 4.6 Vehicle activity

### GET `/api/owner/vehicle-activity/vehicles`
- Auth required: Owner
- Query: `search,status,page,pageSize`

### GET `/api/owner/vehicle-activity/vehicles/:vehicleId`
- Auth required: Owner

### GET `/api/owner/vehicle-activity/vehicle-locations`
- Auth required: Owner
- Query: `status`
- Response map optimized:
  - `id,plateNumber,brand,model,year,status,verificationStatus,location{lat,lng,label,updatedAt}`

### GET `/api/owner/vehicle-activity/timeline`
- Auth required: Owner
- Query: `from,to,status,search`
- Response gantt optimized:
```json
{
  "success": true,
  "data": {
    "from": "2026-04-01T00:00:00.000Z",
    "to": "2026-04-30T23:59:00.000Z",
    "items": [
      {
        "vehicleId": "vm-001",
        "plateNumber": "51H-123.45",
        "displayName": "Toyota Vios 2023",
        "status": "available",
        "blocks": [
          {
            "id": "blk-001",
            "type": "booked",
            "startAt": "2026-04-05T08:00:00.000Z",
            "endAt": "2026-04-07T18:00:00.000Z",
            "note": "Don TX..."
          }
        ]
      }
    ]
  }
}
```

---

## 4.7 Schedules

### GET `/api/owner/vehicle-activity/vehicles/:vehicleId/availability`
- Auth required: Owner
- Query: `view=day|week|month,from,to`

### POST `/api/owner/vehicle-activity/vehicles/:vehicleId/availability`
- Auth required: Owner
- Body:
```json
{
  "type": "available",
  "startAt": "2026-04-10T00:00:00.000Z",
  "endAt": "2026-04-11T23:59:00.000Z",
  "note": "Mo lich cuoi tuan"
}
```

### PUT `/api/owner/vehicle-activity/vehicles/:vehicleId/availability/:blockId`
- Auth required: Owner

### DELETE `/api/owner/vehicle-activity/vehicles/:vehicleId/availability/:blockId`
- Auth required: Owner

- Business validation:
  - `startAt < endAt`
  - khong cho overlap bat hop le voi block booked
  - khong update block da lock boi don thue active

---

## 4.8 Maintenance

### GET `/api/owner/vehicle-maintenance/vehicles`
- Auth required: Owner
- Dung cho dropdown form.

### GET `/api/owner/vehicle-maintenance/records`
- Auth required: Owner
- Query: `search,vehicleId,status,dateFrom,dateTo,page,pageSize`

### GET `/api/owner/vehicle-maintenance/records/:recordId`
- Auth required: Owner

### POST `/api/owner/vehicle-maintenance/records`
- Auth required: Owner
- Body:
```json
{
  "vehicleId": "vm-001",
  "description": "Bao duong tong quat",
  "startDate": "2026-04-08",
  "endDate": "2026-04-09",
  "cost": 2800000,
  "status": "scheduled",
  "note": "Thay dau"
}
```
- Validation:
  - cost >= 0
  - startDate <= endDate

### PUT `/api/owner/vehicle-maintenance/records/:recordId`
- Auth required: Owner
- Update full hoac update status.

### DELETE `/api/owner/vehicle-maintenance/records/:recordId`
- Auth required: Owner

### GET `/api/owner/vehicle-maintenance/stats`
- Auth required: Owner
- Query: cung bo loc list.
- Response:
  - `activeVehiclesUnderMaintenance`
  - `upcomingSchedules`
  - `totalMaintenanceCost`

---

## 4.9 Rental orders

### GET `/api/owner/rental-bookings`
- Auth required: Owner
- Query:
  - `search`
  - `status`
  - `serviceType`
  - `vehicleId`
  - `dateFrom`
  - `dateTo`
  - `page`
  - `pageSize`

### GET `/api/owner/rental-bookings/:bookingId`
- Auth required: Owner

### PATCH `/api/owner/rental-bookings/:bookingId/status`
- Auth required: Owner
- Body:
```json
{
  "nextStatus": "confirmed",
  "note": "Da xac nhan",
  "cancelNote": ""
}
```
- Validation transition:
  - `pending -> confirmed|canceled`
  - `confirmed -> in_progress|canceled`
  - `in_progress -> completed`
  - `completed/canceled` khong doi nua
- Error:
  - `INVALID_STATUS_TRANSITION`

---

## 4.10 Contracts

### GET `/api/owner/rental-bookings/contracts`
- Auth required: Owner
- Query: `bookingId,page,pageSize,status`

### GET `/api/owner/rental-bookings/contracts/:contractId`
- Auth required: Owner

---

## 4.11 Wallet

### GET `/api/owner/owner-revenue/wallet`
- Auth required: Owner
- Response:
  - `currentBalance`
  - `availableBalance`
  - `pendingWithdrawal`
  - `processingWithdrawal`
  - `minimumWithdrawal`
  - `defaultBankAccount`

### GET `/api/owner/owner-revenue/ledger`
- Auth required: Owner
- Query: `direction,status,dateFrom,dateTo,page,pageSize`

---

## 4.12 Payments

### GET `/api/owner/owner-revenue/payments`
- Auth required: Owner
- Query: `status,method,dateFrom,dateTo,page,pageSize`

### POST `/api/owner/owner-revenue/topup`
- Auth required: Owner
- Body:
```json
{
  "amount": 1000000,
  "method": "VNPay"
}
```
- Response:
```json
{
  "success": true,
  "data": {
    "paymentCode": "TOPUP-20260404-101",
    "status": "pending",
    "paymentUrl": "https://gateway..."
  }
}
```

### POST `/api/owner/owner-revenue/topup/callback`
- Auth required: Gateway signature
- Validate:
  - signature
  - payment code
  - amount khop
  - idempotency callback

### GET `/api/owner/owner-revenue/topup/verify`
- Auth required: Owner
- Query: `paymentCode`

---

## 4.13 Withdrawals

### POST `/api/owner/owner-revenue/withdrawals`
- Auth required: Owner
- Body:
```json
{
  "amount": 5000000
}
```
- Validation:
  - amount >= minimumWithdrawal
  - amount <= availableBalance
  - khong duplicate request theo idempotency key
  - optional: cooldown 30-60s
- Errors:
  - `INSUFFICIENT_BALANCE`
  - `MIN_WITHDRAWAL_NOT_MET`
  - `DUPLICATE_WITHDRAWAL_REQUEST`

### GET `/api/owner/owner-revenue/withdrawals`
- Auth required: Owner
- Query: `status,page,pageSize`

---

## 4.14 Dashboard summary

### GET `/api/owner/dashboard`
- Auth required: Owner
- Response:
  - profile basic
  - summary metrics
  - latest bookings
  - latest withdrawals

---

## 5. Backend implementation checklist de frontend chay on dinh

### 5.1 Upload file
- Ho tro multipart va/hoac presigned upload.
- Validate bang magic-bytes (khong chi tin mime browser).
- Co antivirus scan truoc khi active file.
- Tra `fileId` + `fileUrl` + metadata.

### 5.2 Pagination
- Query chuan: `page`, `pageSize`.
- Meta chuan: `total`, `totalPages`.
- Chot max pageSize (vd 100) de tranh query qua lon.

### 5.3 Filter/sort/search
- Cho whitelist sort fields.
- Search fulltext theo cac field chinh (plate, orderCode, customer name...).
- Index DB cho cac filter hay dung (ownerId,status,createdAt,vehicleId).

### 5.4 Map location response
- Endpoint map tra goi gon (chi field can marker/popup).
- Co `updatedAt` de hien thi do moi du lieu.
- Null location thi bo qua marker.

### 5.5 Gantt/timeline response
- Truyen range `from,to` UTC.
- Moi vehicle mot dong, blocks co `type/startAt/endAt`.
- Return da pre-filter overlap range.

### 5.6 Transaction safety cho vi/rut tien
- Dung DB transaction cho:
  - tao withdrawal request
  - ghi wallet ledger
  - tru/cong balance
- Khoa row wallet (`FOR UPDATE`) de chong race condition.
- Idempotency key bat buoc cho:
  - create withdrawal
  - payment callback

### 5.7 Audit log cho cap nhat trang thai
- Ghi log moi lan status doi:
  - entityType/entityId
  - fromStatus/toStatus
  - actorId/actorRole
  - reason/note
  - createdAt
- Dung log nay de hien thi timeline va dieu tra su co.

---

## 6. Goi y quyen truy cap (RBAC)
- `owner`: chi thao tac du lieu thuoc ownerId cua minh.
- `admin`: duyet ho so owner/vehicle, xu ly withdrawal/payment disputes.
- `system/gateway`: callback payment, cap nhat ket qua doi soat.

---

## 7. Error code khuyen nghi (toan he thong)
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `EMAIL_ALREADY_EXISTS`
- `PHONE_ALREADY_EXISTS`
- `PLATE_ALREADY_EXISTS`
- `VIN_ALREADY_EXISTS`
- `INVALID_STATUS_TRANSITION`
- `INSUFFICIENT_BALANCE`
- `MIN_WITHDRAWAL_NOT_MET`
- `DUPLICATE_WITHDRAWAL_REQUEST`
- `FILE_TOO_LARGE`
- `UNSUPPORTED_MEDIA_TYPE`
- `INTERNAL_SERVER_ERROR`

Tai lieu nay la baseline de implement backend that. Team backend co the tach router/controller/service/repository theo tung module tu muc 4 ngay lap tuc.
