/**
 * services/driver/packagesService.js
 *
 * Business logic cho tài xế chọn / hủy gói thuê tài xế.
 */

import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import {
    deactivateEnrollment,
    findEnrollmentByPackage,
    findEnrollmentById,
    listDriverActivePackages,
    listSystemDriverPackagesForDriver,
    upsertDriverPackageEnrollment,
} from "../../repositories/driver/packagesRepository.js";
import { findRentalPackageById } from "../../repositories/customer/rentalRepository.js";

function assertDriver(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

/**
 * GET /api/driver/packages
 * Trả về danh sách gói hệ thống cùng trạng thái đăng ký của tài xế.
 */
export async function getDriverPackages(auth) {
    const driverId = assertDriver(auth);
    const packages = await listSystemDriverPackagesForDriver(driverId);
    return { packages };
}

/**
 * POST /api/driver/packages/select
 * Tài xế đăng ký tham gia bán một gói thuê.
 * Body: { package_id, price_override? }
 */
export async function selectDriverPackage(auth, body) {
    const driverId  = assertDriver(auth);
    const packageId = Number(body.package_id);

    if (!Number.isInteger(packageId) || packageId < 1) {
        throw new AppError("package_id không hợp lệ.", 422, "INVALID_PACKAGE_ID");
    }

    // Kiểm tra gói tồn tại và đang active
    const pkg = await findRentalPackageById(packageId);
    if (!pkg || !pkg.active) {
        throw new AppError("Gói thuê không tồn tại hoặc đã bị vô hiệu hóa.", 404, "PACKAGE_NOT_FOUND");
    }
    if (![2, 3].includes(Number(pkg.service_type))) {
        throw new AppError("Chỉ có thể đăng ký gói thuê tài xế (service_type 2 hoặc 3).", 422, "INVALID_SERVICE_TYPE");
    }

    let priceOverride = null;
    if (body.price_override !== undefined && body.price_override !== null && body.price_override !== "") {
        const override = Number(body.price_override);
        if (Number.isNaN(override) || override < 0) {
            throw new AppError("price_override phải là số dương.", 422, "INVALID_PRICE_OVERRIDE");
        }
        priceOverride = override;
    }

    await upsertDriverPackageEnrollment(driverId, packageId, priceOverride);

    const enrolled = await findEnrollmentByPackage(driverId, packageId);
    return {
        enrollment_id:  Number(enrolled.id),
        driver_id:      driverId,
        package_id:     packageId,
        price_override: priceOverride,
        status:         "active",
    };
}

/**
 * DELETE /api/driver/packages/:enrollmentId
 * Tài xế ngừng bán gói.
 */
export async function removeDriverPackage(auth, enrollmentId) {
    const driverId = assertDriver(auth);
    const id = Number(enrollmentId);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("enrollmentId không hợp lệ.", 422, "INVALID_ID");
    }

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const enrollment = await findEnrollmentById(id, driverId, conn, true);
        if (!enrollment) {
            throw new AppError("Không tìm thấy đăng ký gói.", 404, "NOT_FOUND");
        }
        if (enrollment.status === "inactive") {
            throw new AppError("Gói này đã ngừng bán rồi.", 409, "ALREADY_INACTIVE");
        }

        await deactivateEnrollment(id, driverId, conn);
        await conn.commit();

        return { enrollment_id: id, status: "inactive" };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Danh sách gói tài xế đang bán (cho màn hình dashboard).
 */
export async function getDriverActivePackages(auth) {
    const driverId = assertDriver(auth);
    const packages = await listDriverActivePackages(driverId);
    return { packages };
}
