import sqldb from "../config/sqldatabase.js";

const OWNER_WALLET_ACTOR_TYPE = 2;

const SORT_COLUMN_MAP = {
    owner_id: "vo.owner_id",
    fullname: "vo.fullname",
    date_created: "vo.date_created",
    commission_rate: "vo.commission_rate",
};

function dbConnection(conn) {
    return conn || sqldb;
}

function mapOwnerRow(row) {
    if (!row) return null;

    return {
        owner_id: Number(row.owner_id),
        user_id: row.user_id === null ? null : Number(row.user_id),
        fullname: row.fullname,
        phone: row.phone,
        email: row.email,
        address: row.address,
        bank_name: row.bank_name,
        bank_account: row.bank_account,
        bank_code: row.bank_code,
        swift_code: row.swift_code,
        is_activated: Number(row.is_activated || 0),
        account_active: Number(row.account_active || 0),
        account_deleted: Number(row.account_deleted || 0),
        verification_status: row.verification_status,
        commission_rate: Number(row.commission_rate || 0),
        status: Number(row.status || 0),
        date_created: row.date_created,
        verification_submitted_at: row.verification_submitted_at,
        verification_reviewed_at: row.verification_reviewed_at,
        verification_admin_note: row.verification_admin_note,
        wallet_balance: Number(row.wallet_balance || 0),
    };
}

function buildOwnerFilterQueryParts(filters = {}) {
    const whereClauses = [];
    const params = [];

    if (filters.account_deleted !== undefined) {
        whereClauses.push("vo.account_deleted = ?");
        params.push(filters.account_deleted);
    } else {
        whereClauses.push("vo.account_deleted = 0");
    }

    if (filters.account_active !== undefined) {
        whereClauses.push("vo.account_active = ?");
        params.push(filters.account_active);
    }

    if (filters.is_activated !== undefined) {
        whereClauses.push("vo.is_activated = ?");
        params.push(filters.is_activated);
    }

    if (filters.status !== undefined) {
        whereClauses.push("vo.status = ?");
        params.push(filters.status);
    }

    if (filters.verification_status) {
        whereClauses.push("vo.verification_status = ?");
        params.push(filters.verification_status);
    }

    if (filters.date_from) {
        whereClauses.push("vo.date_created >= ?");
        params.push(`${filters.date_from} 00:00:00`);
    }

    if (filters.date_to) {
        whereClauses.push("vo.date_created <= ?");
        params.push(`${filters.date_to} 23:59:59`);
    }

    if (filters.search) {
        const keyword = `%${filters.search}%`;
        whereClauses.push(
            "(vo.fullname LIKE ? OR vo.phone LIKE ? OR vo.email LIKE ? OR CAST(vo.owner_id AS CHAR) LIKE ?)"
        );
        params.push(keyword, keyword, keyword, keyword);
    }

    return {
        whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
        params,
    };
}

export async function findExistingOwnerByEmail(email, excludeOwnerId = null) {
    if (!email) return null;

    const whereExclude = excludeOwnerId ? "AND owner_id <> ?" : "";
    const params = excludeOwnerId ? [email, excludeOwnerId] : [email];

    const [rows] = await sqldb.query(
        `
            SELECT owner_id
            FROM vehicle_owners
            WHERE email = ? ${whereExclude}
            LIMIT 1
        `,
        params
    );

    return rows[0] ? Number(rows[0].owner_id) : null;
}

export async function findExistingOwnerByPhone(phone, excludeOwnerId = null) {
    if (!phone) return null;

    const whereExclude = excludeOwnerId ? "AND owner_id <> ?" : "";
    const params = excludeOwnerId ? [phone, excludeOwnerId] : [phone];

    const [rows] = await sqldb.query(
        `
            SELECT owner_id
            FROM vehicle_owners
            WHERE phone = ? ${whereExclude}
            LIMIT 1
        `,
        params
    );

    return rows[0] ? Number(rows[0].owner_id) : null;
}

export async function findVehicleOwnerById(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                vo.owner_id, vo.user_id, vo.fullname, vo.phone, vo.email, vo.address,
                vo.bank_name, vo.bank_account, vo.bank_code, vo.swift_code,
                vo.is_activated, vo.account_active, vo.account_deleted,
                vo.verification_status, vo.verification_submitted_at,
                vo.verification_reviewed_at, vo.verification_admin_note,
                vo.commission_rate, vo.status, vo.date_created,
                COALESCE(wa.wallet_balance, 0) AS wallet_balance
            FROM vehicle_owners vo
            LEFT JOIN (
                SELECT actor_id, SUM(balance) AS wallet_balance
                FROM wallet_accounts
                WHERE actor_type = ?
                GROUP BY actor_id
            ) wa ON wa.actor_id = vo.owner_id
            WHERE vo.owner_id = ?
            LIMIT 1
        `,
        [OWNER_WALLET_ACTOR_TYPE, ownerId]
    );

    return mapOwnerRow(rows[0]);
}

export async function findVehicleOwners(filters) {
    const { whereSql, params } = buildOwnerFilterQueryParts(filters);
    const sortColumn = SORT_COLUMN_MAP[filters.sort_by] || SORT_COLUMN_MAP.date_created;
    const sortOrder = filters.sort_order === "ASC" ? "ASC" : "DESC";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `
            SELECT
                vo.owner_id, vo.user_id, vo.fullname, vo.phone, vo.email, vo.address,
                vo.bank_name, vo.bank_account, vo.bank_code, vo.swift_code,
                vo.is_activated, vo.account_active, vo.account_deleted,
                vo.verification_status, vo.verification_submitted_at,
                vo.verification_reviewed_at, vo.verification_admin_note,
                vo.commission_rate, vo.status, vo.date_created,
                COALESCE(wa.wallet_balance, 0) AS wallet_balance
            FROM vehicle_owners vo
            LEFT JOIN (
                SELECT actor_id, SUM(balance) AS wallet_balance
                FROM wallet_accounts
                WHERE actor_type = ?
                GROUP BY actor_id
            ) wa ON wa.actor_id = vo.owner_id
            ${whereSql}
            ORDER BY ${sortColumn} ${sortOrder}, vo.owner_id DESC
            LIMIT ? OFFSET ?
        `,
        [OWNER_WALLET_ACTOR_TYPE, ...params, filters.limit, offset]
    );

    return rows.map(mapOwnerRow);
}

export async function countVehicleOwners(filters) {
    const { whereSql, params } = buildOwnerFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items FROM vehicle_owners vo ${whereSql}`,
        params
    );
    return Number(rows[0]?.total_items || 0);
}

export async function summarizeVehicleOwners(filters) {
    const { whereSql, params } = buildOwnerFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `
            SELECT
                COUNT(*) AS total_owners,
                SUM(CASE WHEN base.account_active = 1 AND base.account_deleted = 0 THEN 1 ELSE 0 END) AS active_owners,
                SUM(CASE WHEN base.verification_status = 'pending_review' THEN 1 ELSE 0 END) AS pending_verification_owners,
                SUM(CASE WHEN base.verification_status = 'verified' THEN 1 ELSE 0 END) AS verified_owners
            FROM (
                SELECT
                    vo.owner_id,
                    vo.account_active,
                    vo.account_deleted,
                    vo.verification_status
                FROM vehicle_owners vo
                ${whereSql}
            ) base
        `,
        params
    );

    const row = rows[0] || {};
    return {
        totalOwners: Number(row.total_owners || 0),
        activeOwners: Number(row.active_owners || 0),
        pendingVerificationOwners: Number(row.pending_verification_owners || 0),
        verifiedOwners: Number(row.verified_owners || 0),
    };
}

export async function insertVehicleOwner(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            INSERT INTO vehicle_owners (
                fullname, phone, email, address,
                bank_name, bank_account, bank_code, swift_code,
                password_hash, is_activated, account_active, account_deleted,
                verification_status, commission_rate, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            payload.fullname,
            payload.phone,
            payload.email,
            payload.address,
            payload.bankName,
            payload.bankAccount,
            payload.bankCode,
            payload.swiftCode,
            payload.passwordHash,
            payload.isActivated,
            payload.accountActive,
            payload.accountDeleted,
            payload.verificationStatus,
            payload.commissionRate,
            payload.status,
        ]
    );

    return Number(result.insertId);
}

export async function updateVehicleOwnerPersonalInfo(payload, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE vehicle_owners
            SET
                fullname = ?,
                phone = ?,
                email = ?,
                address = ?,
                bank_name = ?,
                bank_account = ?,
                bank_code = ?,
                swift_code = ?,
                verification_status = ?,
                commission_rate = ?
            WHERE owner_id = ?
            LIMIT 1
        `,
        [
            payload.fullname,
            payload.phone,
            payload.email,
            payload.address,
            payload.bankName,
            payload.bankAccount,
            payload.bankCode,
            payload.swiftCode,
            payload.verificationStatus,
            payload.commissionRate,
            payload.ownerId,
        ]
    );
    return result.affectedRows === 1;
}

export async function updateVehicleOwnerAccountStatus({ ownerId, accountActive, status }, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE vehicle_owners
            SET account_active = ?, status = ?
            WHERE owner_id = ?
            LIMIT 1
        `,
        [accountActive, status, ownerId]
    );
    return result.affectedRows === 1;
}

export async function softDeleteVehicleOwnerAccount(ownerId, conn = null) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE vehicle_owners
            SET account_deleted = 1, account_active = 0, status = 0
            WHERE owner_id = ? AND account_deleted = 0
            LIMIT 1
        `,
        [ownerId]
    );
    return result.affectedRows === 1;
}

export async function findVehicleOwnerStats(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                (SELECT COUNT(*) FROM vehicles v WHERE v.owner_id = ?) AS total_vehicles,
                (SELECT COUNT(*) FROM vehicles v WHERE v.owner_id = ? AND v.status = 'available') AS available_vehicles,
                (SELECT COUNT(*) FROM vehicles v WHERE v.owner_id = ? AND v.status = 'rented') AS rented_vehicles,
                (SELECT COUNT(*) FROM vehicles v WHERE v.owner_id = ? AND v.status = 'maintenance') AS maintenance_vehicles,
                (SELECT COUNT(*) FROM rental_bookings rb WHERE rb.owner_id = ?) AS total_rentals,
                (SELECT COUNT(*) FROM rental_bookings rb WHERE rb.owner_id = ? AND rb.status = 'completed') AS completed_rentals,
                (SELECT COUNT(*) FROM rental_bookings rb WHERE rb.owner_id = ? AND rb.status = 'cancelled') AS cancelled_rentals,
                (SELECT COALESCE(SUM(rb.total_price), 0) FROM rental_bookings rb WHERE rb.owner_id = ? AND rb.status = 'completed') AS total_revenue,
                (
                    SELECT COALESCE(SUM(wr.amount), 0)
                    FROM withdrawal_requests wr
                    INNER JOIN wallet_accounts wa ON wa.wallet_id = wr.wallet_id
                    WHERE wa.actor_type = ? AND wa.actor_id = ? AND wr.status IN ('approved', 'paid')
                ) AS total_withdrawn
        `,
        [
            ownerId,
            ownerId,
            ownerId,
            ownerId,
            ownerId,
            ownerId,
            ownerId,
            ownerId,
            OWNER_WALLET_ACTOR_TYPE,
            ownerId,
        ]
    );

    const row = rows[0] || {};
    return {
        total_vehicles: Number(row.total_vehicles || 0),
        available_vehicles: Number(row.available_vehicles || 0),
        rented_vehicles: Number(row.rented_vehicles || 0),
        maintenance_vehicles: Number(row.maintenance_vehicles || 0),
        total_rentals: Number(row.total_rentals || 0),
        completed_rentals: Number(row.completed_rentals || 0),
        cancelled_rentals: Number(row.cancelled_rentals || 0),
        total_revenue: Number(row.total_revenue || 0),
        total_withdrawn: Number(row.total_withdrawn || 0),
    };
}

export async function findVehicleOwnerVehicles(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                v.vehicle_id, v.type_id, v.brand, v.model, v.year, v.color, v.license_plate,
                v.status, v.is_verified, v.verification_status, v.date_added
            FROM vehicles v
            WHERE v.owner_id = ?
            ORDER BY v.vehicle_id DESC
        `,
        [ownerId]
    );

    return rows.map((row) => ({
        vehicle_id: Number(row.vehicle_id),
        type_id: Number(row.type_id),
        brand: row.brand,
        model: row.model,
        year: row.year,
        color: row.color,
        license_plate: row.license_plate,
        status: row.status,
        is_verified: Number(row.is_verified || 0),
        verification_status: row.verification_status,
        date_added: row.date_added,
    }));
}

export async function findVehicleOwnerRentals(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                rb.rental_id, rb.rental_code, rb.vehicle_id, rb.driver_id, rb.user_id,
                rb.service_type, rb.start_datetime, rb.end_datetime, rb.total_price,
                rb.payment_status, rb.status, rb.created_at,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))), '') AS customer_name
            FROM rental_bookings rb
            LEFT JOIN users u ON u.user_id = rb.user_id
            WHERE rb.owner_id = ?
            ORDER BY rb.rental_id DESC
        `,
        [ownerId]
    );

    return rows.map((row) => ({
        rental_id: Number(row.rental_id),
        rental_code: row.rental_code,
        vehicle_id: row.vehicle_id === null ? null : Number(row.vehicle_id),
        driver_id: row.driver_id === null ? null : Number(row.driver_id),
        user_id: Number(row.user_id),
        customer_name: row.customer_name,
        service_type: Number(row.service_type),
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
        total_price: Number(row.total_price || 0),
        payment_status: row.payment_status,
        status: row.status,
        created_at: row.created_at,
    }));
}

export async function findVehicleOwnerDocuments(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                vod.id, vod.owner_id, vod.document_id, vod.doc_number, vod.doc_expiry_date,
                vod.file_url, vod.mime_type, vod.file_size, vod.verified, vod.status, vod.review_note,
                vod.date_submitted, vod.updated_at,
                d.title AS document_title
            FROM vehicle_owner_documents vod
            LEFT JOIN documents d ON d.id = vod.document_id
            WHERE vod.owner_id = ?
            ORDER BY vod.id DESC
        `,
        [ownerId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        owner_id: Number(row.owner_id),
        document_id: Number(row.document_id),
        document_title: row.document_title,
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        file_url: row.file_url,
        mime_type: row.mime_type,
        file_size: row.file_size === null ? null : Number(row.file_size),
        verified: Number(row.verified || 0),
        status: row.status,
        review_note: row.review_note,
        date_submitted: row.date_submitted,
        updated_at: row.updated_at,
    }));
}

export async function findVehicleOwnerWithdrawals(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                wr.withdrawal_id, wr.wallet_id, wr.amount, wr.status, wr.note,
                wr.requested_at, wr.processed_at
            FROM withdrawal_requests wr
            INNER JOIN wallet_accounts wa ON wa.wallet_id = wr.wallet_id
            WHERE wa.actor_type = ? AND wa.actor_id = ?
            ORDER BY wr.withdrawal_id DESC
        `,
        [OWNER_WALLET_ACTOR_TYPE, ownerId]
    );

    return rows.map((row) => ({
        withdrawal_id: Number(row.withdrawal_id),
        wallet_id: Number(row.wallet_id),
        amount: Number(row.amount || 0),
        status: row.status,
        note: row.note,
        requested_at: row.requested_at,
        processed_at: row.processed_at,
    }));
}

export async function findVehicleOwnerWalletLedger(ownerId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                wl.ledger_id, wl.wallet_id, wl.payment_id, wl.amount, wl.balance_after, wl.direction,
                wl.entry_type, wl.source_type, wl.source_id, wl.description, wl.created_at,
                p.payment_code, p.rental_id, p.booking_id, p.status AS payment_status
            FROM wallet_ledger wl
            INNER JOIN wallet_accounts wa ON wa.wallet_id = wl.wallet_id
            LEFT JOIN payments p ON p.payment_id = wl.payment_id
            WHERE wa.actor_type = ? AND wa.actor_id = ?
            ORDER BY wl.ledger_id DESC
        `,
        [OWNER_WALLET_ACTOR_TYPE, ownerId]
    );

    return rows.map((row) => ({
        ledger_id: Number(row.ledger_id),
        wallet_id: Number(row.wallet_id),
        payment_id: row.payment_id === null ? null : Number(row.payment_id),
        payment_code: row.payment_code,
        rental_id: row.rental_id === null ? null : Number(row.rental_id),
        booking_id: row.booking_id === null ? null : Number(row.booking_id),
        payment_status: row.payment_status,
        amount: Number(row.amount || 0),
        balance_after: row.balance_after === null ? null : Number(row.balance_after),
        direction: row.direction,
        entry_type: row.entry_type,
        source_type: row.source_type,
        source_id: row.source_id === null ? null : Number(row.source_id),
        description: row.description,
        created_at: row.created_at,
    }));
}

