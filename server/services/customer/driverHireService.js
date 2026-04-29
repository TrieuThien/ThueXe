/**
 * services/customer/driverHireService.js
 *
 * Business logic cho khách đặt thuê tài xế (service_type=2):
 *  - Đặt ngay (immediate): auto-match tài xế gần nhất
 *  - Đặt lịch hẹn (scheduled): lưu booking, thông báo tài xế khu vực
 */

import crypto from "crypto";
import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    createDriverHireBooking,
    findDriverPackageById,
    getDriverHireBookingDetail,
    hasActiveDriverHireBooking,
} from "../../repositories/customer/driverHireRepository.js";
import { startDriverMatching } from "../matching/driverMatchingService.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertCustomer(auth) {
    const userId = Number(auth?.userId || 0);
    const isPassenger = auth?.role === "passenger" || Number(auth?.userType) === 0;
    if (!userId || !isPassenger) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return userId;
}

function toMySqlDatetime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function generateRentalCode() {
    return crypto.randomBytes(16).toString("hex").toUpperCase();
}

// ─── Create driver hire booking ───────────────────────────────────────────────

/**
 * POST /api/customer/driver-hire
 *
 * Body:
 * {
 *   package_id,
 *   booking_type: 'immediate' | 'scheduled',
 *   schedule_time?,      // ISO string, bắt buộc nếu scheduled
 *   duration_hours?,     // ghi đè duration của gói
 *   pickup_address,
 *   pickup_lat,
 *   pickup_lng,
 *   dropoff_address?,
 *   payment_type?,       // 1=cash, 2=wallet, 3=card
 *   note?
 * }
 */
export async function createDriverHireBookingService(auth, body) {
    const userId = assertCustomer(auth);

    // Kiểm tra không đang có booking active
    const hasActive = await hasActiveDriverHireBooking(userId);
    if (hasActive) {
        throw new AppError(
            "Bạn đang có đơn thuê tài xế chưa hoàn thành. Vui lòng hoàn thành hoặc hủy đơn cũ trước.",
            409,
            "ACTIVE_BOOKING_EXISTS"
        );
    }

    const packageId = Number(body.package_id);
    const pkg = await findDriverPackageById(packageId);
    if (!pkg) {
        throw new AppError("Gói thuê không tồn tại hoặc không khả dụng.", 404, "PACKAGE_NOT_FOUND");
    }

    const bookingType = body.booking_type === "immediate" ? "immediate" : "scheduled";

    // Tính thời gian bắt đầu/kết thúc
    let startDt, endDt;
    const now = new Date();

    if (bookingType === "immediate") {
        startDt = now;
    } else {
        if (!body.schedule_time) {
            throw new AppError("schedule_time bắt buộc khi đặt lịch hẹn.", 422, "SCHEDULE_TIME_REQUIRED");
        }
        startDt = new Date(body.schedule_time);
        if (Number.isNaN(startDt.getTime())) {
            throw new AppError("schedule_time không hợp lệ.", 422, "INVALID_DATETIME");
        }
        if (startDt <= now) {
            throw new AppError("schedule_time phải ở tương lai.", 422, "SCHEDULE_IN_PAST");
        }
    }

    const durationHours = body.duration_hours
        ? Math.max(Number(body.duration_hours), 1)
        : (pkg.duration_hours || 1);

    endDt = new Date(startDt.getTime() + durationHours * 60 * 60 * 1000);

    const startSql = toMySqlDatetime(startDt);
    const endSql   = toMySqlDatetime(endDt);

    // Validate tọa độ
    const pickupLat = Number(body.pickup_lat);
    const pickupLng = Number(body.pickup_lng);
    if (Number.isNaN(pickupLat) || Number.isNaN(pickupLng)) {
        throw new AppError("Tọa độ đón không hợp lệ.", 422, "INVALID_COORDINATES");
    }

    const basePrice    = Number(pkg.base_price    || 0);
    const depositAmount = Number(pkg.deposit_amount || 0);
    const totalPrice   = Number((basePrice + depositAmount).toFixed(2));

    const rentalCode = generateRentalCode();

    const rentalId = await createDriverHireBooking({
        rentalCode,
        userId,
        packageId,
        bookingType,
        startDatetime:  startSql,
        endDatetime:    endSql,
        pickupAddress:  body.pickup_address,
        pickupLat,
        pickupLng,
        dropoffAddress: body.dropoff_address || null,
        basePrice,
        depositAmount,
        totalPrice,
        paymentType:    body.payment_type ? Number(body.payment_type) : null,
        note:           body.note || null,
        searchRadiusKm: 2,
    });

    // Kích hoạt auto-matching bất đồng bộ (chỉ immediate)
    if (bookingType === "immediate") {
        startDriverMatching(rentalId, pickupLat, pickupLng, packageId, userId);
    }

    return {
        rental_id:    rentalId,
        rental_code:  rentalCode,
        booking_type: bookingType,
        status:       "scheduled",
        package_name: pkg.package_name,
        start_datetime: startSql,
        end_datetime:   endSql,
        base_price:     basePrice,
        deposit_amount: depositAmount,
        total_price:    totalPrice,
        message:
            bookingType === "immediate"
                ? "Đang tìm tài xế gần bạn..."
                : "Đặt lịch thành công. Chúng tôi sẽ thông báo tài xế trong khu vực.",
    };
}

/**
 * GET /api/customer/driver-hire/:bookingId
 * Polling trạng thái tìm tài xế.
 */
export async function getDriverHireStatus(auth, bookingId) {
    const userId = assertCustomer(auth);
    const id = Number(bookingId);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("bookingId không hợp lệ.", 422, "INVALID_ID");
    }

    const booking = await getDriverHireBookingDetail(id, userId);
    if (!booking) throw new AppError("Không tìm thấy booking.", 404, "NOT_FOUND");

    return { booking };
}
