import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function rethrowOwnerSchemaError(error) {
    const message = String(error?.sqlMessage || error?.message || "");
    const isBadField = error?.code === "ER_BAD_FIELD_ERROR";
    const isMissingTable = error?.code === "ER_NO_SUCH_TABLE";

    if (
        (isBadField && /(password_hash|is_activated|account_active|verification_status|expires_at_epoch)/i.test(message)) ||
        (isMissingTable && /owner_register_requests/i.test(message))
    ) {
        throw new AppError(
            "Database schema is outdated for owner module. Please run migrations: 2026-04-04_owner_module_extensions.sql, 2026-04-04_owner_register_email_verification.sql, and 2026-04-04_owner_register_epoch_fix.sql.",
            500,
            "OWNER_SCHEMA_MIGRATION_REQUIRED"
        );
    }

    throw error;
}

export async function findOwnerByIdentifier(identifier) {
    try {
        const [rows] = await sqldb.query(
            `SELECT owner_id, fullname, phone, email, password_hash, status, is_activated, account_active, account_deleted,
                    verification_status, verification_submitted_at, verification_reviewed_at, verification_admin_note,
                    address, bank_name, bank_account, bank_code, swift_code, date_created
             FROM vehicle_owners
             WHERE email = ? OR phone = ?
             LIMIT 1`,
            [identifier, identifier]
        );
        return rows[0] || null;
    } catch (error) {
        rethrowOwnerSchemaError(error);
    }
}

export async function findOwnerByEmail(email, conn = null) {
    if (!email) return null;
    const db = dbConnection(conn);
    const [rows] = await db.query(`SELECT owner_id FROM vehicle_owners WHERE email = ? LIMIT 1`, [email]);
    return rows[0] || null;
}

export async function findOwnerEmailById(ownerId, conn = null) {
    if (!ownerId) return null;
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT email, fullname FROM vehicle_owners WHERE owner_id = ? LIMIT 1`,
        [ownerId]
    );
    return rows[0] || null;
}

export async function findOwnerByPhone(phone, conn = null) {
    if (!phone) return null;
    const db = dbConnection(conn);
    const [rows] = await db.query(`SELECT owner_id FROM vehicle_owners WHERE phone = ? LIMIT 1`, [phone]);
    return rows[0] || null;
}

export async function expirePendingOwnerRegisterRequests(nowEpochMs, conn = null) {
    const db = dbConnection(conn);
    try {
        await db.query(
            `UPDATE owner_register_requests
             SET status = 'expired', updated_at = NOW()
             WHERE status = 'pending' AND expires_at_epoch < ?`,
            [Number(nowEpochMs) || Date.now()]
        );
    } catch (error) {
        rethrowOwnerSchemaError(error);
    }
}

export async function cancelPendingOwnerRegisterRequestsByIdentifier(email, phone, conn = null) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE owner_register_requests
         SET status = 'cancelled', updated_at = NOW()
         WHERE status = 'pending' AND (email = ? OR phone = ?)`,
        [email, phone]
    );
}

export async function createOwnerRegisterRequest(payload, conn = null) {
    const db = dbConnection(conn);
    try {
        const [result] = await db.query(
            `INSERT INTO owner_register_requests
             (full_name, phone, email, address, bank_name, bank_account, bank_code, swift_code, password_hash, verify_token_hash, expires_at_epoch)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.full_name,
                payload.phone,
                payload.email,
                payload.address || null,
                payload.bank_name || null,
                payload.bank_account || null,
                payload.bank_code || null,
                payload.swift_code || null,
                payload.password_hash,
                payload.verify_token_hash,
                Number(payload.expires_at_epoch),
            ]
        );
        return Number(result.insertId);
    } catch (error) {
        rethrowOwnerSchemaError(error);
    }
}

export async function findOwnerRegisterRequestByTokenHash(tokenHash, conn = null, { forUpdate = false } = {}) {
    const db = dbConnection(conn);
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db.query(
        `SELECT id, full_name, phone, email, address, bank_name, bank_account, bank_code, swift_code,
                password_hash, status, expires_at_epoch, created_at, owner_id
         FROM owner_register_requests
         WHERE verify_token_hash = ?
         LIMIT 1${lockSql}`,
        [tokenHash]
    );
    return rows[0] || null;
}

export async function markOwnerRegisterRequestVerified(requestId, ownerId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE owner_register_requests
         SET status = 'verified', verified_at = NOW(), owner_id = ?, updated_at = NOW()
         WHERE id = ? AND status = 'pending'`,
        [ownerId, requestId]
    );
    return result.affectedRows === 1;
}

export async function markOwnerRegisterRequestExpired(requestId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE owner_register_requests
         SET status = 'expired', updated_at = NOW()
         WHERE id = ? AND status = 'pending'`,
        [requestId]
    );
    return result.affectedRows === 1;
}

export async function markOwnerRegisterRequestCancelled(requestId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE owner_register_requests
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = ? AND status = 'pending'`,
        [requestId]
    );
    return result.affectedRows === 1;
}

export async function createOwner(payload, conn) {
    const db = dbConnection(conn);
    try {
        const [result] = await db.query(
            `INSERT INTO vehicle_owners
             (fullname, phone, email, address, bank_name, bank_account, bank_code, swift_code,
              password_hash, is_activated, account_active, account_deleted, verification_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 'not_submitted')`,
            [
                payload.fullname,
                payload.phone,
                payload.email || null,
                payload.address || null,
                payload.bank_name || null,
                payload.bank_account || null,
                payload.bank_code || null,
                payload.swift_code || null,
                payload.password_hash,
            ]
        );
        return Number(result.insertId);
    } catch (error) {
        rethrowOwnerSchemaError(error);
    }
}

export async function findOwnerById(ownerId, conn = null) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT owner_id, fullname, phone, email, address, bank_name, bank_account, bank_code, swift_code,
                status, is_activated, account_active, account_deleted, password_hash, last_login_date,
                verification_status, verification_submitted_at, verification_reviewed_at, verification_admin_note,
                date_created
         FROM vehicle_owners
         WHERE owner_id = ?
         LIMIT 1`,
        [ownerId]
    );
    return rows[0] || null;
}

export async function updateOwnerLastLogin(ownerId, conn) {
    const db = dbConnection(conn);
    await db.query(`UPDATE vehicle_owners SET last_login_date = NOW() WHERE owner_id = ?`, [ownerId]);
}

export async function createOwnerSession({ ownerId, token }, conn) {
    const db = dbConnection(conn);
    await db.query(`INSERT INTO owner_sessions (token, owner_id) VALUES (?, ?)`, [token, ownerId]);
}

export async function deleteOwnerSession({ ownerId, token }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(`DELETE FROM owner_sessions WHERE token = ? AND owner_id = ?`, [token, ownerId]);
    return result.affectedRows > 0;
}

export async function findOwnerSession({ ownerId, token }, conn = null) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, token, owner_id FROM owner_sessions WHERE token = ? AND owner_id = ? LIMIT 1`,
        [token, ownerId]
    );
    return rows[0] || null;
}

export async function deleteAllOwnerSessions(ownerId, conn) {
    const db = dbConnection(conn);
    await db.query(`DELETE FROM owner_sessions WHERE owner_id = ?`, [ownerId]);
}

export async function updateOwnerProfile(ownerId, payload) {
    await sqldb.query(
        `UPDATE vehicle_owners
         SET fullname = ?, phone = ?, address = ?, bank_name = ?, bank_account = ?, bank_code = ?, swift_code = ?
         WHERE owner_id = ?`,
        [
            payload.fullname,
            payload.phone,
            payload.address || null,
            payload.bank_name || null,
            payload.bank_account || null,
            payload.bank_code || null,
            payload.swift_code || null,
            ownerId,
        ]
    );
}

export async function updateOwnerPassword(ownerId, passwordHash) {
    await sqldb.query(`UPDATE vehicle_owners SET password_hash = ? WHERE owner_id = ?`, [passwordHash, ownerId]);
}

export async function listOwnerRequiredDocuments() {
    const [rows] = await sqldb.query(
        `SELECT id, title, doc_desc, doc_expiry, doc_id_num, doc_id_num_title
         FROM documents
         WHERE status = 1 AND doc_user = 2 AND doc_type = 0
         ORDER BY id ASC`
    );
    return rows;
}

export async function listOwnerDocuments(ownerId) {
    const [rows] = await sqldb.query(
        `SELECT vod.id, vod.owner_id, vod.document_id, vod.doc_number, vod.doc_expiry_date,
                vod.file_url, vod.mime_type, vod.file_size, vod.verified, vod.status, vod.review_note,
                vod.date_submitted, vod.updated_at,
                d.title AS document_title
         FROM vehicle_owner_documents vod
         INNER JOIN documents d ON d.id = vod.document_id
         WHERE vod.owner_id = ?
         ORDER BY vod.id DESC`,
        [ownerId]
    );
    return rows;
}

export async function upsertOwnerDocument(ownerId, payload, conn = null) {
    const db = dbConnection(conn);
    const [existingRows] = await db.query(
        `SELECT id FROM vehicle_owner_documents WHERE owner_id = ? AND document_id = ? LIMIT 1`,
        [ownerId, payload.document_id]
    );

    if (existingRows[0]) {
        await db.query(
            `UPDATE vehicle_owner_documents
             SET doc_number = ?, doc_expiry_date = ?, file_url = ?, mime_type = ?, file_size = ?, verified = 0,
                 status = 'pending', review_note = NULL, updated_at = NOW()
             WHERE id = ?`,
            [
                payload.doc_number || null,
                payload.doc_expiry_date || null,
                payload.file_url || null,
                payload.mime_type || null,
                payload.file_size || null,
                existingRows[0].id,
            ]
        );
        return Number(existingRows[0].id);
    }

    const [result] = await db.query(
        `INSERT INTO vehicle_owner_documents
         (owner_id, document_id, doc_number, doc_expiry_date, file_url, mime_type, file_size, verified, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
        [
            ownerId,
            payload.document_id,
            payload.doc_number || null,
            payload.doc_expiry_date || null,
            payload.file_url || null,
            payload.mime_type || null,
            payload.file_size || null,
        ]
    );
    return Number(result.insertId);
}

export async function updateOwnerVerificationState(ownerId, payload, conn = null) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE vehicle_owners
         SET verification_status = ?, verification_submitted_at = ?, verification_admin_note = ?
         WHERE owner_id = ?`,
        [payload.verification_status, payload.verification_submitted_at || null, payload.verification_admin_note || null, ownerId]
    );
}

export async function listVehicleTypes() {
    const [rows] = await sqldb.query(
        `SELECT type_id, type_name, description, seat_count
         FROM vehicle_types
         WHERE active = 1
         ORDER BY type_name ASC`
    );
    return rows;
}

export async function findVehicleTypeById(typeId) {
    const [rows] = await sqldb.query(
        `SELECT type_id, type_name, seat_count FROM vehicle_types WHERE type_id = ? LIMIT 1`,
        [typeId]
    );
    return rows[0] || null;
}

export async function findVehicleByPlate(licensePlate, excludeVehicleId = null) {
    const params = [licensePlate];
    let sql = `SELECT vehicle_id FROM vehicles WHERE license_plate = ?`;
    if (excludeVehicleId) {
        sql += ` AND vehicle_id <> ?`;
        params.push(excludeVehicleId);
    }
    sql += ` LIMIT 1`;
    const [rows] = await sqldb.query(sql, params);
    return rows[0] || null;
}

export async function findVehicleByVin(vin, excludeVehicleId = null) {
    if (!vin) return null;
    const params = [vin];
    let sql = `SELECT vehicle_id FROM vehicles WHERE vin = ?`;
    if (excludeVehicleId) {
        sql += ` AND vehicle_id <> ?`;
        params.push(excludeVehicleId);
    }
    sql += ` LIMIT 1`;
    const [rows] = await sqldb.query(sql, params);
    return rows[0] || null;
}

export async function createOwnerVehicle(ownerId, payload, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO vehicles
         (owner_id, type_id, brand, model, year, color, license_plate, vin, seat_count, transmission,
          fuel_type, odometer_km, status, is_verified, verification_status, notes, photo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
            ownerId,
            payload.type_id,
            payload.brand,
            payload.model,
            payload.year || null,
            payload.color || null,
            payload.license_plate,
            payload.vin || null,
            payload.seat_count,
            payload.transmission,
            payload.fuel_type,
            payload.odometer_km || 0,
            payload.status || "unavailable",
            payload.verification_status || "missing_documents",
            payload.notes || null,
            payload.photo_url || null,
        ]
    );
    return Number(result.insertId);
}

export async function updateVehiclePhotoUrl(vehicleId, photoUrl, conn = null) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE vehicles SET photo_url = ? WHERE vehicle_id = ?`,
        [photoUrl || null, vehicleId]
    );
}

export async function listOwnerVehicles(ownerId, { search, status, page = 1, pageSize = 10 } = {}) {
    const where = ["v.owner_id = ?"];
    const params = [ownerId];

    if (search) {
        where.push(`(v.license_plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR v.year LIKE ?)`);
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    if (status && status !== "all") {
        where.push(`(v.status = ? OR v.verification_status = ?)`);
        params.push(status, status);
    }

    const whereSql = where.join(" AND ");
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const [countRows] = await sqldb.query(`SELECT COUNT(*) AS total FROM vehicles v WHERE ${whereSql}`, params);
    const [rows] = await sqldb.query(
        `SELECT v.vehicle_id, v.owner_id, v.type_id, v.brand, v.model, v.year, v.color, v.license_plate, v.vin,
                v.seat_count, v.transmission, v.fuel_type, v.odometer_km, v.status, v.is_verified, v.verification_status,
                v.date_added, v.notes, v.photo_url, vt.type_name
         FROM vehicles v
         LEFT JOIN vehicle_types vt ON vt.type_id = v.type_id
         WHERE ${whereSql}
         ORDER BY v.vehicle_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return {
        items: rows,
        total: Number(countRows[0]?.total || 0),
    };
}

export async function findOwnerVehicleById(ownerId, vehicleId, conn = null) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT v.vehicle_id, v.owner_id, v.type_id, v.brand, v.model, v.year, v.color, v.license_plate, v.vin,
                v.seat_count, v.transmission, v.fuel_type, v.odometer_km, v.status, v.is_verified, v.verification_status,
                v.current_long, v.current_lat, v.date_added, v.notes, v.photo_url,
                vt.type_name
         FROM vehicles v
         INNER JOIN vehicle_types vt ON vt.type_id = v.type_id
         WHERE v.owner_id = ? AND v.vehicle_id = ?
         LIMIT 1`,
        [ownerId, vehicleId]
    );
    return rows[0] || null;
}

export async function updateOwnerVehicle(ownerId, vehicleId, payload, conn = null) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE vehicles
         SET type_id = ?, brand = ?, model = ?, year = ?, color = ?, license_plate = ?, vin = ?,
             seat_count = ?, transmission = ?, fuel_type = ?, odometer_km = ?, status = ?, notes = ?
         WHERE owner_id = ? AND vehicle_id = ?`,
        [
            payload.type_id,
            payload.brand,
            payload.model,
            payload.year || null,
            payload.color || null,
            payload.license_plate,
            payload.vin || null,
            payload.seat_count,
            payload.transmission,
            payload.fuel_type,
            payload.odometer_km || 0,
            payload.status,
            payload.notes || null,
            ownerId,
            vehicleId,
        ]
    );
}

export async function listVehicleDocumentTypes() {
    const [rows] = await sqldb.query(
        `SELECT id, title, doc_desc, doc_expiry, doc_id_num, doc_id_num_title, doc_two_sides
         FROM documents
         WHERE status = 1 AND doc_user = 2 AND doc_type = 1
         ORDER BY id ASC`
    );
    return rows;
}

export async function listVehicleDocuments(vehicleId) {
    const [rows] = await sqldb.query(
        `SELECT vd.id, vd.vehicle_id, vd.document_id, vd.side, vd.doc_number, vd.doc_expiry_date,
                vd.file_url, vd.mime_type, vd.file_size, vd.verified, vd.status, vd.review_note,
                vd.date_submitted, vd.updated_at,
                d.title AS document_title, d.doc_two_sides
         FROM vehicle_documents vd
         INNER JOIN documents d ON d.id = vd.document_id
         WHERE vd.vehicle_id = ?
         ORDER BY vd.document_id ASC, FIELD(vd.side, 'single', 'front', 'back')`,
        [vehicleId]
    );
    return rows;
}

export async function upsertVehicleDocument(vehicleId, payload, conn = null) {
    const db = dbConnection(conn);
    const side = payload.side || 'single';
    const [existingRows] = await db.query(
        `SELECT id FROM vehicle_documents WHERE vehicle_id = ? AND document_id = ? AND side = ? LIMIT 1`,
        [vehicleId, payload.document_id, side]
    );

    if (existingRows[0]) {
        await db.query(
            `UPDATE vehicle_documents
             SET doc_number = ?, doc_expiry_date = ?, file_url = ?, mime_type = ?, file_size = ?, verified = 0,
                 status = 'pending', review_note = NULL, updated_at = NOW()
             WHERE id = ?`,
            [
                payload.doc_number || null,
                payload.doc_expiry_date || null,
                payload.file_url || null,
                payload.mime_type || null,
                payload.file_size || null,
                existingRows[0].id,
            ]
        );
        return Number(existingRows[0].id);
    }

    const [result] = await db.query(
        `INSERT INTO vehicle_documents
         (vehicle_id, document_id, side, doc_number, doc_expiry_date, file_url, mime_type, file_size, verified, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
        [
            vehicleId,
            payload.document_id,
            side,
            payload.doc_number || null,
            payload.doc_expiry_date || null,
            payload.file_url || null,
            payload.mime_type || null,
            payload.file_size || null,
        ]
    );
    return Number(result.insertId);
}

export async function updateVehicleVerificationStatus(vehicleId, status, conn = null) {
    const db = dbConnection(conn);
    const isVerified = status === "verified" ? 1 : 0;
    const vehicleStatus = status === "verified" ? "available" : "unavailable";
    await db.query(
        `UPDATE vehicles
         SET verification_status = ?, is_verified = ?, status = ?
         WHERE vehicle_id = ?`,
        [status, isVerified, vehicleStatus, vehicleId]
    );
}

export async function updateVehicleOperationStatus(ownerId, vehicleId, newStatus, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE vehicles SET status = ? WHERE owner_id = ? AND vehicle_id = ? AND is_verified = 1`,
        [newStatus, ownerId, vehicleId]
    );
    return result.affectedRows > 0;
}

export async function listOwnerVehicleMaintenanceForCalendar(ownerId, vehicleId, { from, to } = {}) {
    const params = [vehicleId, ownerId];
    let sql = `SELECT vm.maintenance_id AS block_id, vm.start_date AS start_at,
                      COALESCE(vm.end_date, vm.start_date) AS end_at,
                      vm.description AS note
               FROM vehicle_maintenance vm
               INNER JOIN vehicles v ON v.vehicle_id = vm.vehicle_id
               WHERE vm.vehicle_id = ?
                 AND v.owner_id = ?
                 AND vm.status IN ('scheduled', 'in_progress')`;
    if (from) { sql += ` AND COALESCE(vm.end_date, vm.start_date) >= ?`; params.push(from); }
    if (to)   { sql += ` AND vm.start_date <= ?`; params.push(to); }
    sql += ` ORDER BY vm.start_date ASC`;
    const [rows] = await sqldb.query(sql, params);
    return rows;
}

export async function deleteOwnerVehicleMaintenance(ownerId, vehicleId, maintenanceId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `DELETE vm FROM vehicle_maintenance vm
         INNER JOIN vehicles v ON v.vehicle_id = vm.vehicle_id
         WHERE vm.maintenance_id = ? AND vm.vehicle_id = ? AND v.owner_id = ?`,
        [maintenanceId, vehicleId, ownerId]
    );
    return result.affectedRows > 0;
}

export async function listVehicleRentalBookingBlocks(vehicleId, { from, to } = {}) {
    const params = [vehicleId];
    let sql = `SELECT rb.rental_id AS block_id, rb.start_datetime AS start_at, rb.end_datetime AS end_at,
                      rb.rental_code AS note, rb.status
               FROM rental_bookings rb
               WHERE rb.vehicle_id = ?
                 AND rb.status IN ('scheduled', 'pending', 'in_progress')`;
    if (from) {
        sql += ` AND rb.end_datetime >= ?`;
        params.push(from);
    }
    if (to) {
        sql += ` AND rb.start_datetime <= ?`;
        params.push(to);
    }
    sql += ` ORDER BY rb.start_datetime ASC`;
    const [rows] = await sqldb.query(sql, params);
    return rows;
}

export async function listOwnerVehiclesSimple(ownerId) {
    const [rows] = await sqldb.query(
        `SELECT vehicle_id, brand, model, year, license_plate, status, verification_status, current_long, current_lat
         FROM vehicles
         WHERE owner_id = ?
         ORDER BY vehicle_id DESC`,
        [ownerId]
    );
    return rows;
}

export async function listOwnerMaintenanceRecords(ownerId, { search, vehicleId, status, dateFrom, dateTo, page = 1, pageSize = 10 } = {}) {
    const where = ["v.owner_id = ?"];
    const params = [ownerId];

    if (search) {
        const q = `%${search}%`;
        where.push(`(vm.description LIKE ? OR v.license_plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ?)`);
        params.push(q, q, q, q);
    }
    if (vehicleId && vehicleId !== "all") {
        where.push("vm.vehicle_id = ?");
        params.push(vehicleId);
    }
    if (status && status !== "all") {
        where.push("vm.status = ?");
        params.push(status);
    }
    if (dateFrom) {
        where.push("vm.start_date >= ?");
        params.push(dateFrom);
    }
    if (dateTo) {
        where.push("COALESCE(vm.end_date, vm.start_date) <= ?");
        params.push(dateTo);
    }

    const whereSql = where.join(" AND ");
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total
         FROM vehicle_maintenance vm
         INNER JOIN vehicles v ON v.vehicle_id = vm.vehicle_id
         WHERE ${whereSql}`,
        params
    );

    const [rows] = await sqldb.query(
        `SELECT vm.maintenance_id, vm.vehicle_id, vm.description, vm.start_date, vm.end_date, vm.cost, vm.status, vm.created_at,
                v.license_plate, v.brand, v.model, v.year
         FROM vehicle_maintenance vm
         INNER JOIN vehicles v ON v.vehicle_id = vm.vehicle_id
         WHERE ${whereSql}
         ORDER BY vm.maintenance_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return { items: rows, total: Number(countRows[0]?.total || 0) };
}

export async function findOwnerMaintenanceById(ownerId, maintenanceId) {
    const [rows] = await sqldb.query(
        `SELECT vm.maintenance_id, vm.vehicle_id, vm.description, vm.start_date, vm.end_date, vm.cost, vm.status, vm.created_at,
                v.owner_id, v.license_plate, v.brand, v.model, v.year
         FROM vehicle_maintenance vm
         INNER JOIN vehicles v ON v.vehicle_id = vm.vehicle_id
         WHERE vm.maintenance_id = ? AND v.owner_id = ?
         LIMIT 1`,
        [maintenanceId, ownerId]
    );
    return rows[0] || null;
}

export async function createMaintenance(payload, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO vehicle_maintenance (vehicle_id, description, start_date, end_date, cost, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [payload.vehicle_id, payload.description, payload.start_date, payload.end_date || null, payload.cost || 0, payload.status]
    );
    return Number(result.insertId);
}

export async function updateMaintenance(maintenanceId, payload, conn = null) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE vehicle_maintenance
         SET description = ?, start_date = ?, end_date = ?, cost = ?, status = ?
         WHERE maintenance_id = ?`,
        [payload.description, payload.start_date, payload.end_date || null, payload.cost || 0, payload.status, maintenanceId]
    );
}

export async function deleteMaintenance(maintenanceId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(`DELETE FROM vehicle_maintenance WHERE maintenance_id = ?`, [maintenanceId]);
    return result.affectedRows > 0;
}

export async function listOwnerRentals(ownerId, { search, status, serviceType, vehicleId, dateFrom, dateTo, page = 1, pageSize = 10 } = {}) {
    const where = ["rb.owner_id = ?"];
    const params = [ownerId];

    if (search) {
        const q = `%${search}%`;
        where.push(`(rb.rental_code LIKE ? OR u.firstname LIKE ? OR u.lastname LIKE ? OR v.license_plate LIKE ?)`);
        params.push(q, q, q, q);
    }
    if (status && status !== "all") {
        where.push("rb.status = ?");
        params.push(status);
    }
    if (serviceType && serviceType !== "all") {
        where.push("rb.service_type = ?");
        params.push(Number(serviceType));
    }
    if (vehicleId && vehicleId !== "all") {
        where.push("rb.vehicle_id = ?");
        params.push(vehicleId);
    }
    if (dateFrom) {
        where.push("rb.start_datetime >= ?");
        params.push(dateFrom);
    }
    if (dateTo) {
        where.push("rb.end_datetime <= ?");
        params.push(dateTo);
    }

    const whereSql = where.join(" AND ");
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const [countRows] = await sqldb.query(`SELECT COUNT(*) AS total FROM rental_bookings rb WHERE ${whereSql}`, params);

    const [rows] = await sqldb.query(
        `SELECT rb.rental_id, rb.rental_code, rb.service_type, rb.start_datetime, rb.end_datetime,
                rb.total_price, rb.deposit_amount,
                rb.payment_status, rb.status, rb.cancel_reason,
                u.user_id, u.firstname, u.lastname,
                v.vehicle_id, v.brand, v.model, v.year, v.license_plate,
                rp.package_name
         FROM rental_bookings rb
         LEFT JOIN users u ON u.user_id = rb.user_id
         LEFT JOIN vehicles v ON v.vehicle_id = rb.vehicle_id
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         WHERE ${whereSql}
         ORDER BY rb.rental_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return { items: rows, total: Number(countRows[0]?.total || 0) };
}

export async function findOwnerRentalById(ownerId, rentalId, conn = null) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT rb.rental_id, rb.rental_code, rb.user_id, rb.vehicle_id, rb.driver_id, rb.package_id, rb.owner_id,
                rb.service_type, rb.start_datetime, rb.end_datetime, rb.actual_end_datetime,
                rb.pickup_address, rb.dropoff_address, rb.distance_limit_km, rb.distance_travelled_km,
                rb.base_price, rb.extra_time_fee, rb.extra_distance_fee, rb.deposit_amount, rb.total_price,
                rb.payment_status, rb.payment_type, rb.transaction_id, rb.status, rb.cancel_reason,
                rb.created_at, rb.updated_at,
                u.firstname, u.lastname, u.phone AS customer_phone,
                v.brand, v.model, v.year, v.license_plate,
                rp.package_name
         FROM rental_bookings rb
         LEFT JOIN users u ON u.user_id = rb.user_id
         LEFT JOIN vehicles v ON v.vehicle_id = rb.vehicle_id
         LEFT JOIN rental_packages rp ON rp.package_id = rb.package_id
         WHERE rb.owner_id = ? AND rb.rental_id = ?
         LIMIT 1`,
        [ownerId, rentalId]
    );
    return rows[0] || null;
}

export async function updateOwnerRentalStatus(rentalId, status, cancelReason = null, conn = null) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE rental_bookings
         SET status = ?, cancel_reason = ?, updated_at = NOW()
         WHERE rental_id = ?`,
        [status, cancelReason, rentalId]
    );
}

export async function listContractsByOwner(ownerId, bookingId = null) {
    const params = [ownerId];
    let where = `owner_id = ?`;
    if (bookingId) {
        where += ` AND rental_id = ?`;
        params.push(bookingId);
    }

    const [rows] = await sqldb.query(
        `SELECT contract_id, rental_id, owner_id, contract_no, contract_url, signed_at, status, created_at, updated_at
         FROM rental_contracts
         WHERE ${where}
         ORDER BY contract_id DESC`,
        params
    );
    return rows;
}

export async function findContractByOwner(ownerId, contractId) {
    const [rows] = await sqldb.query(
        `SELECT contract_id, rental_id, owner_id, contract_no, contract_url, signed_at, status, created_at, updated_at
         FROM rental_contracts
         WHERE owner_id = ? AND contract_id = ?
         LIMIT 1`,
        [ownerId, contractId]
    );
    return rows[0] || null;
}

export async function getDefaultCurrencyId() {
    const [rows] = await sqldb.query(
        `SELECT id
         FROM currencies
         ORDER BY \`default\` DESC, id ASC
         LIMIT 1`
    );

    return Number(rows[0]?.id || 1);
}

export async function findOwnerWallet(ownerId, conn = null) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status, created_at
         FROM wallet_accounts
         WHERE actor_type = 2 AND actor_id = ?
         ORDER BY wallet_id ASC
         LIMIT 1`,
        [ownerId]
    );
    return rows[0] || null;
}

export async function createOwnerWallet(ownerId, currencyId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO wallet_accounts (actor_type, actor_id, currency_id, balance, status)
         VALUES (2, ?, ?, 0, 1)`,
        [ownerId, currencyId]
    );
    return Number(result.insertId);
}

export async function findWalletByIdForUpdate(walletId, conn) {
    const [rows] = await conn.query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status
         FROM wallet_accounts
         WHERE wallet_id = ?
         FOR UPDATE`,
        [walletId]
    );
    return rows[0] || null;
}

export async function updateWalletBalance(walletId, balance, conn) {
    await conn.query(`UPDATE wallet_accounts SET balance = ? WHERE wallet_id = ?`, [balance, walletId]);
}

export async function createPayment(payload, conn) {
    const [result] = await conn.query(
        `INSERT INTO payments
         (payment_code, payer_wallet_id, actor_type, actor_id, service_domain, rental_id, gateway_name, gateway_transaction_ref, amount, currency_id, status, description)
         VALUES (?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.payment_code,
            payload.payer_wallet_id || null,
            payload.owner_id,
            payload.service_domain,
            payload.rental_id || null,
            payload.gateway_name || null,
            payload.gateway_transaction_ref || null,
            payload.amount,
            payload.currency_id,
            payload.status,
            payload.description || null,
        ]
    );
    return Number(result.insertId);
}

export async function createWalletLedger(payload, conn) {
    const [result] = await conn.query(
        `INSERT INTO wallet_ledger
         (wallet_id, payment_id, amount, balance_after, direction, entry_type, source_type, source_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.wallet_id,
            payload.payment_id || null,
            payload.amount,
            payload.balance_after,
            payload.direction,
            payload.entry_type,
            payload.source_type,
            payload.source_id || null,
            payload.description || null,
        ]
    );
    return Number(result.insertId);
}

export async function findPaymentByCodeForUpdate(paymentCode, conn) {
    const [rows] = await conn.query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id,
                service_domain, rental_id, gateway_name, gateway_transaction_ref,
                amount, currency_id, status, description
         FROM payments WHERE payment_code = ? LIMIT 1 FOR UPDATE`,
        [paymentCode]
    );
    return rows[0] || null;
}

export async function updatePaymentStatus(paymentId, status, conn) {
    await conn.query(
        `UPDATE payments SET status = ? WHERE payment_id = ? LIMIT 1`,
        [status, paymentId]
    );
}

export async function createWithdrawalRequest(walletId, amount, note, conn) {
    const [result] = await conn.query(
        `INSERT INTO withdrawal_requests (wallet_id, amount, status, note)
         VALUES (?, ?, 'pending', ?)`,
        [walletId, amount, note || null]
    );
    return Number(result.insertId);
}

export async function listOwnerWithdrawals(ownerId, { page = 1, pageSize = 10 } = {}) {
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total
         FROM withdrawal_requests wr
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wr.wallet_id
         WHERE wa.actor_type = 2 AND wa.actor_id = ?`,
        [ownerId]
    );

    const [rows] = await sqldb.query(
        `SELECT wr.withdrawal_id, wr.wallet_id, wr.amount, wr.status, wr.note, wr.requested_at, wr.processed_at
         FROM withdrawal_requests wr
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wr.wallet_id
         WHERE wa.actor_type = 2 AND wa.actor_id = ?
         ORDER BY wr.withdrawal_id DESC
         LIMIT ? OFFSET ?`,
        [ownerId, limit, offset]
    );

    return { items: rows, total: Number(countRows[0]?.total || 0) };
}

export async function listOwnerWalletLedger(ownerId, { page = 1, pageSize = 10 } = {}) {
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total
         FROM wallet_ledger wl
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wl.wallet_id
         WHERE wa.actor_type = 2 AND wa.actor_id = ?`,
        [ownerId]
    );

    const [rows] = await sqldb.query(
        `SELECT wl.ledger_id, wl.wallet_id, wl.payment_id, wl.amount, wl.balance_after, wl.direction,
                wl.entry_type, wl.source_type, wl.source_id, wl.description, wl.created_at
         FROM wallet_ledger wl
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wl.wallet_id
         WHERE wa.actor_type = 2 AND wa.actor_id = ?
         ORDER BY wl.ledger_id DESC
         LIMIT ? OFFSET ?`,
        [ownerId, limit, offset]
    );

    return { items: rows, total: Number(countRows[0]?.total || 0) };
}

export async function listOwnerPayments(ownerId, { page = 1, pageSize = 10 } = {}) {
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total
         FROM payments
         WHERE actor_type = 2 AND actor_id = ?`,
        [ownerId]
    );

    const [rows] = await sqldb.query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id, service_domain, booking_id, rental_id,
                gateway_name, gateway_transaction_ref, amount, currency_id, status, description, created_at, updated_at
         FROM payments
         WHERE actor_type = 2 AND actor_id = ?
         ORDER BY payment_id DESC
         LIMIT ? OFFSET ?`,
        [ownerId, limit, offset]
    );

    return { items: rows, total: Number(countRows[0]?.total || 0) };
}

export async function getOwnerRevenueTotals(ownerId, { dateFrom, dateTo } = {}) {
    const params = [ownerId];
    let dateFilter = "";
    if (dateFrom) {
        dateFilter += " AND rb.start_datetime >= ?";
        params.push(dateFrom);
    }
    if (dateTo) {
        dateFilter += " AND rb.end_datetime <= ?";
        params.push(dateTo);
    }

    const [rows] = await sqldb.query(
        `SELECT COALESCE(SUM(CASE WHEN rb.status = 'completed' THEN rb.total_price ELSE 0 END),0) AS total_completed_revenue,
                COALESCE(SUM(CASE WHEN rb.status IN ('scheduled','pending','in_progress') THEN rb.total_price ELSE 0 END),0) AS pending_revenue,
                COUNT(*) AS total_bookings
         FROM rental_bookings rb
         WHERE rb.owner_id = ? ${dateFilter}`,
        params
    );

    return rows[0] || { total_completed_revenue: 0, pending_revenue: 0, total_bookings: 0 };
}

export async function getOwnerRevenueByVehicle(ownerId, { page = 1, pageSize = 10, search = "" } = {}) {
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const params = [ownerId];
    let searchSql = "";
    if (search) {
        searchSql = ` AND (v.license_plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q, q);
    }

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total
         FROM vehicles v
         WHERE v.owner_id = ? ${searchSql}`,
        params
    );

    const [rows] = await sqldb.query(
        `SELECT v.vehicle_id, v.brand, v.model, v.year, v.license_plate,
                COALESCE(SUM(CASE WHEN rb.status = 'completed' THEN rb.total_price ELSE 0 END),0) AS revenue,
                COUNT(rb.rental_id) AS total_bookings
         FROM vehicles v
         LEFT JOIN rental_bookings rb ON rb.vehicle_id = v.vehicle_id
         WHERE v.owner_id = ? ${searchSql}
         GROUP BY v.vehicle_id
         ORDER BY revenue DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return { items: rows, total: Number(countRows[0]?.total || 0) };
}
