/**
 * repositories/driver/packagesRepository.js
 *
 * Data access layer cho driver_rental_packages.
 * Tài xế chọn gói thuê tài xế (service_type=2) để bán.
 */

import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

/**
 * Danh sách tất cả gói thuê tài xế (service_type=2) mà hệ thống cung cấp,
 * kèm theo trạng thái tài xế đã đăng ký chưa.
 */
export async function listSystemDriverPackagesForDriver(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
             rp.package_id,
             rp.package_name,
             rp.service_type,
             rp.duration_hours,
             rp.distance_limit_km,
             rp.price        AS base_price,
             rp.deposit_amount,
             rp.extra_hour_fee,
             rp.extra_km_fee,
             rp.description,
             rp.active       AS system_active,
             drp.id          AS enrollment_id,
             drp.price_override,
             drp.status      AS enrollment_status
         FROM rental_packages rp
         LEFT JOIN driver_rental_packages drp
             ON drp.package_id = rp.package_id
            AND drp.driver_id  = ?
         WHERE rp.active = 1
           AND rp.service_type IN (2, 3)
         ORDER BY rp.service_type ASC, rp.package_id ASC`,
        [driverId]
    );
    return rows.map(mapPackageRow);
}

/**
 * Danh sách gói tài xế đang bán (enrollment_status='active').
 */
export async function listDriverActivePackages(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
             rp.package_id,
             rp.package_name,
             rp.service_type,
             rp.duration_hours,
             rp.distance_limit_km,
             rp.price        AS base_price,
             rp.deposit_amount,
             rp.extra_hour_fee,
             rp.extra_km_fee,
             rp.description,
             drp.id          AS enrollment_id,
             drp.price_override,
             drp.status      AS enrollment_status,
             drp.created_at  AS enrolled_at
         FROM driver_rental_packages drp
         INNER JOIN rental_packages rp ON rp.package_id = drp.package_id
         WHERE drp.driver_id = ?
           AND drp.status    = 'active'
           AND rp.active     = 1
         ORDER BY rp.service_type ASC, rp.package_id ASC`,
        [driverId]
    );
    return rows.map(mapPackageRow);
}

/**
 * Lấy một enrollment bằng enrollmentId, kiểm tra thuộc driverId.
 */
export async function findEnrollmentById(enrollmentId, driverId, conn = null, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, driver_id, package_id, price_override, status, created_at
         FROM driver_rental_packages
         WHERE id = ? AND driver_id = ?
         LIMIT 1${lock}`,
        [enrollmentId, driverId]
    );
    return rows[0] || null;
}

/**
 * Lấy enrollment theo (driverId, packageId).
 */
export async function findEnrollmentByPackage(driverId, packageId, conn = null, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, driver_id, package_id, price_override, status, created_at
         FROM driver_rental_packages
         WHERE driver_id = ? AND package_id = ?
         LIMIT 1${lock}`,
        [driverId, packageId]
    );
    return rows[0] || null;
}

/**
 * Tạo enrollment mới hoặc kích hoạt lại nếu đã tồn tại (upsert).
 */
export async function upsertDriverPackageEnrollment(driverId, packageId, priceOverride = null, conn = null) {
    await db(conn).query(
        `INSERT INTO driver_rental_packages (driver_id, package_id, price_override, status)
         VALUES (?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
             price_override = VALUES(price_override),
             status         = 'active',
             updated_at     = NOW()`,
        [driverId, packageId, priceOverride ?? null]
    );
}

/**
 * Deactivate một enrollment (tài xế ngừng bán gói).
 */
export async function deactivateEnrollment(enrollmentId, driverId, conn = null) {
    const [result] = await db(conn).query(
        `UPDATE driver_rental_packages
         SET status = 'inactive', updated_at = NOW()
         WHERE id = ? AND driver_id = ?
         LIMIT 1`,
        [enrollmentId, driverId]
    );
    return result.affectedRows;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapPackageRow(row) {
    return {
        package_id:        Number(row.package_id),
        package_name:      row.package_name,
        service_type:      Number(row.service_type),
        duration_hours:    row.duration_hours === null ? null : Number(row.duration_hours),
        distance_limit_km: Number(row.distance_limit_km || 0),
        base_price:        Number(row.base_price || 0),
        deposit_amount:    Number(row.deposit_amount || 0),
        extra_hour_fee:    Number(row.extra_hour_fee || 0),
        extra_km_fee:      Number(row.extra_km_fee || 0),
        description:       row.description || null,
        system_active:     row.system_active !== undefined ? Number(row.system_active) : undefined,
        enrollment_id:     row.enrollment_id === null || row.enrollment_id === undefined ? null : Number(row.enrollment_id),
        price_override:    row.price_override === null ? null : Number(row.price_override),
        enrollment_status: row.enrollment_status || null,
        enrolled_at:       row.enrolled_at || null,
    };
}
