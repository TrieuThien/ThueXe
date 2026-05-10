import sqldb from "../config/sqldatabase.js";

const DRIVER_WALLET_ACTOR_TYPE = 1;

const DRIVER_DOCUMENT_AGGREGATE_JOIN = `
    LEFT JOIN (
        SELECT
            dd.driver_id,
            COUNT(*) AS document_count,
            SUM(CASE WHEN dd.verified = 0 AND (dd.doc_expiry_date IS NULL OR dd.doc_expiry_date >= CURDATE()) THEN 1 ELSE 0 END) AS pending_count,
            0 AS failed_count,
            SUM(CASE WHEN dd.doc_expiry_date IS NOT NULL AND dd.doc_expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_count,
            SUM(CASE WHEN dd.verified = 1 AND (dd.doc_expiry_date IS NULL OR dd.doc_expiry_date >= CURDATE()) THEN 1 ELSE 0 END) AS approved_count,
            CASE
                WHEN SUM(CASE WHEN dd.doc_expiry_date IS NOT NULL AND dd.doc_expiry_date < CURDATE() THEN 1 ELSE 0 END) > 0 THEN 'expired'
                WHEN SUM(CASE WHEN dd.verified = 0 AND (dd.doc_expiry_date IS NULL OR dd.doc_expiry_date >= CURDATE()) THEN 1 ELSE 0 END) > 0 THEN 'pending'
                WHEN COUNT(*) > 0 THEN 'approved'
                ELSE NULL
            END AS document_status
        FROM driver_documents dd
        GROUP BY dd.driver_id
    ) doc ON doc.driver_id = d.driver_id
`;

const DRIVER_WALLET_AGGREGATE_JOIN = `
    LEFT JOIN (
        SELECT actor_id, SUM(balance) AS wallet_amount
        FROM wallet_accounts
        WHERE actor_type = ${DRIVER_WALLET_ACTOR_TYPE}
        GROUP BY actor_id
    ) wa ON wa.actor_id = d.driver_id
`;

const SORT_COLUMN_MAP = {
    account_create_date: "d.account_create_date",
    firstname: "d.firstname",
    driver_rating: "d.driver_rating",
    wallet_amount: "COALESCE(wa.wallet_amount, 0)",
    driver_id: "d.driver_id",
};

function dbConnection(conn) {
    return conn || sqldb;
}

function mapDriverRow(row) {
    if (!row) return null;

    return {
        driver_id: Number(row.driver_id),
        firstname: row.firstname,
        lastname: row.lastname,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        drv_address: row.drv_address,
        state: row.state,
        drv_country: row.drv_country,
        car_plate_num: row.car_plate_num,
        car_reg_num: row.car_reg_num,
        car_model: row.car_model,
        car_color: row.car_color,
        car_year: row.car_year,
        route_id: row.route_id === null ? null : Number(row.route_id),
        route_name: row.route_name,
        reg_route_id: row.reg_route_id === null ? null : Number(row.reg_route_id),
        reg_route_name: row.reg_route_name,
        ride_id: row.ride_id === null ? null : Number(row.ride_id),
        ride_type: row.ride_type,
        is_activated: Number(row.is_activated || 0),
        account_deleted: Number(row.account_deleted || 0),
        available: Number(row.available || 0),
        operation_status: Number(row.operation_status || 0),
        driver_rating: Number(row.driver_rating || 0),
        account_active: Number(row.account_active || 0),
        photo_file: row.photo_file,
        driving_license_file: row.driving_license_file,
        road_worthiness_file: row.road_worthiness_file,
        wallet_amount: Number(row.wallet_amount || 0),
        bank_name: row.bank_name,
        bank_acc_holder_name: row.bank_acc_holder_name,
        bank_acc_num: row.bank_acc_num,
        bank_code: row.bank_code,
        bank_swift_code: row.bank_swift_code,
        completed_rides: Number(row.completed_rides || 0),
        cancelled_rides: Number(row.cancelled_rides || 0),
        rejected_rides: Number(row.rejected_rides || 0),
        country_code: row.country_code,
        country_dial_code: row.country_dial_code,
        driver_commision: Number(row.driver_commision || 0),
        account_create_date: row.account_create_date,
        document_status: row.document_status || "no_documents",
        document_counts: {
            total: Number(row.document_count || 0),
            pending: Number(row.pending_count || 0),
            failed: Number(row.failed_count || 0),
            expired: Number(row.expired_count || 0),
            approved: Number(row.approved_count || 0),
        },
    };
}

function mapDriverAccountRow(row) {
    if (!row) return null;

    return {
        driver_id: Number(row.driver_id),
        email: row.email,
        phone: row.phone,
        account_active: Number(row.account_active || 0),
        is_activated: Number(row.is_activated || 0),
        available: Number(row.available || 0),
        account_deleted: Number(row.account_deleted || 0),
        photo_file: row.photo_file || null,
    };
}

function buildDriverFilterQueryParts(filters = {}) {
    const whereClauses = [];
    const params = [];

    if (filters.account_deleted !== undefined) {
        whereClauses.push("d.account_deleted = ?");
        params.push(filters.account_deleted);
    } else {
        whereClauses.push("d.account_deleted = 0");
    }

    if (filters.reg_route_id !== undefined) {
        whereClauses.push("d.reg_route_id = ?");
        params.push(filters.reg_route_id);
    }

    if (filters.ride_id !== undefined) {
        whereClauses.push("d.ride_id = ?");
        params.push(filters.ride_id);
    }

    if (filters.is_activated !== undefined) {
        whereClauses.push("d.is_activated = ?");
        params.push(filters.is_activated);
    }

    if (filters.available !== undefined) {
        whereClauses.push("d.available = ?");
        params.push(filters.available);
    }

    if (filters.document_status) {
        whereClauses.push("COALESCE(doc.document_status, 'no_documents') = ?");
        params.push(filters.document_status);
    }

    if (filters.rating_min !== undefined) {
        whereClauses.push("d.driver_rating >= ?");
        params.push(filters.rating_min);
    }

    if (filters.rating_max !== undefined) {
        whereClauses.push("d.driver_rating <= ?");
        params.push(filters.rating_max);
    }

    if (filters.date_from) {
        whereClauses.push("d.account_create_date >= ?");
        params.push(`${filters.date_from} 00:00:00`);
    }

    if (filters.date_to) {
        whereClauses.push("d.account_create_date <= ?");
        params.push(`${filters.date_to} 23:59:59`);
    }

    if (filters.search) {
        const keyword = `%${filters.search}%`;
        whereClauses.push(
            "(d.firstname LIKE ? OR d.lastname LIKE ? OR d.phone LIKE ? OR CAST(d.driver_id AS CHAR) LIKE ?)"
        );
        params.push(keyword, keyword, keyword, keyword);
    }

    return {
        joins: `
            LEFT JOIN routes route_current ON route_current.id = d.route_id
            LEFT JOIN routes route_registered ON route_registered.id = d.reg_route_id
            LEFT JOIN rides rd ON rd.id = d.ride_id
            ${DRIVER_WALLET_AGGREGATE_JOIN}
            ${DRIVER_DOCUMENT_AGGREGATE_JOIN}
        `,
        whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
        params,
    };
}

export async function findExistingAccountByEmail(email, excludeDriverId = null) {
    if (!email) return null;

    const driverWhereClause = excludeDriverId
        ? "WHERE email = ? AND driver_id <> ?"
        : "WHERE email = ?";
    const driverParams = excludeDriverId ? [email, excludeDriverId] : [email];

    const [rows] = await sqldb.query(
        `
            SELECT source, account_id
            FROM (
                SELECT 'user' AS source, user_id AS account_id
                FROM users
                WHERE email = ?
                UNION ALL
                SELECT 'driver' AS source, driver_id AS account_id
                FROM drivers
                ${driverWhereClause}
            ) existing_accounts
            LIMIT 1
        `,
        [email, ...driverParams]
    );

    return rows[0] || null;
}

export async function findExistingAccountByPhone(phone, excludeDriverId = null) {
    if (!phone) return null;

    const driverWhereClause = excludeDriverId
        ? "WHERE phone = ? AND driver_id <> ?"
        : "WHERE phone = ?";
    const driverParams = excludeDriverId ? [phone, excludeDriverId] : [phone];

    const [rows] = await sqldb.query(
        `
            SELECT source, account_id
            FROM (
                SELECT 'user' AS source, user_id AS account_id
                FROM users
                WHERE phone = ?
                UNION ALL
                SELECT 'driver' AS source, driver_id AS account_id
                FROM drivers
                ${driverWhereClause}
            ) existing_accounts
            LIMIT 1
        `,
        [phone, ...driverParams]
    );

    return rows[0] || null;
}

export async function routeExists(routeId) {
    const [rows] = await sqldb.query(`SELECT id FROM routes WHERE id = ? LIMIT 1`, [routeId]);
    return rows.length > 0;
}

export async function rideExists(rideId) {
    const [rows] = await sqldb.query(
        `SELECT id FROM rides WHERE id = ? AND avail = 1 LIMIT 1`,
        [rideId]
    );
    return rows.length > 0;
}

export async function findDriverMetaRoutes() {
    const [rows] = await sqldb.query(
        `SELECT id, r_title FROM routes ORDER BY r_title ASC, id ASC`
    );
    return rows.map((row) => ({ id: Number(row.id), r_title: row.r_title }));
}

export async function findDriverMetaRides() {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type FROM rides WHERE avail = 1 ORDER BY ride_type ASC, id ASC`
    );
    return rows.map((row) => ({ id: Number(row.id), ride_type: row.ride_type }));
}

export async function insertDriver(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            INSERT INTO drivers (
                password_hash, drv_address, email, firstname, lastname, phone, state, drv_country,
                car_plate_num, car_reg_num, car_model, car_color, car_year, route_id, ride_id,
                reg_route_id, is_activated, account_deleted, available, operation_status,
                account_active, photo_file, bank_name, bank_acc_holder_name,
                bank_acc_num, bank_code, bank_swift_code, country_code, country_dial_code,
                driver_commision
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            payload.passwordHash,
            payload.drvAddress,
            payload.email,
            payload.firstname,
            payload.lastname,
            payload.phone,
            payload.state,
            payload.drvCountry,
            payload.carPlateNum,
            payload.carRegNum,
            payload.carModel,
            payload.carColor,
            payload.carYear,
            payload.routeId,
            payload.rideId,
            payload.regRouteId,
            payload.isActivated,
            payload.accountDeleted,
            payload.available,
            payload.operationStatus,
            payload.accountActive,
            payload.photoFile,
            payload.bankName,
            payload.bankAccHolderName,
            payload.bankAccNum,
            payload.bankCode,
            payload.bankSwiftCode,
            payload.countryCode,
            payload.countryDialCode,
            payload.driverCommision,
        ]
    );

    return Number(result.insertId);
}

export async function findDrivers(filters) {
    const { joins, whereSql, params } = buildDriverFilterQueryParts(filters);
    const sortColumn = SORT_COLUMN_MAP[filters.sort_by] || SORT_COLUMN_MAP.account_create_date;
    const sortOrder = filters.sort_order === "ASC" ? "ASC" : "DESC";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `
            SELECT
                d.driver_id, d.firstname, d.lastname, CONCAT(d.firstname, ' ', d.lastname) AS full_name,
                d.email, d.phone, d.drv_address, d.state, d.drv_country, d.car_plate_num,
                d.car_reg_num, d.car_model, d.car_color, d.car_year, d.route_id,
                route_current.r_title AS route_name, d.reg_route_id,
                route_registered.r_title AS reg_route_name, d.ride_id, rd.ride_type,
                d.is_activated, d.account_deleted, d.available, d.operation_status,
                d.driver_rating, d.account_active, d.photo_file, d.driving_license_file,
                d.road_worthiness_file, COALESCE(wa.wallet_amount, 0) AS wallet_amount, d.bank_name, d.bank_acc_holder_name,
                d.bank_acc_num, d.bank_code, d.bank_swift_code, d.completed_rides,
                d.cancelled_rides, d.rejected_rides, d.country_code, d.country_dial_code,
                d.driver_commision, d.account_create_date,
                COALESCE(doc.document_status, 'no_documents') AS document_status,
                COALESCE(doc.document_count, 0) AS document_count,
                COALESCE(doc.pending_count, 0) AS pending_count,
                COALESCE(doc.failed_count, 0) AS failed_count,
                COALESCE(doc.expired_count, 0) AS expired_count,
                COALESCE(doc.approved_count, 0) AS approved_count
            FROM drivers d
            ${joins}
            ${whereSql}
            ORDER BY ${sortColumn} ${sortOrder}, d.driver_id DESC
            LIMIT ? OFFSET ?
        `,
        [...params, filters.limit, offset]
    );

    return rows.map(mapDriverRow);
}

export async function countDrivers(filters) {
    const { joins, whereSql, params } = buildDriverFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items FROM drivers d ${joins} ${whereSql}`,
        params
    );
    return Number(rows[0]?.total_items || 0);
}

export async function summarizeDrivers(filters) {
    const { joins, whereSql, params } = buildDriverFilterQueryParts(filters);
    const [rows] = await sqldb.query(
        `
            SELECT
                COUNT(*) AS total_drivers,
                SUM(CASE WHEN base.available = 1 THEN 1 ELSE 0 END) AS online_drivers,
                SUM(CASE WHEN base.is_activated = 0 AND base.account_deleted = 0 THEN 1 ELSE 0 END) AS pending_activation_drivers,
                SUM(CASE WHEN base.account_active = 1 THEN 1 ELSE 0 END) AS active_drivers,
                SUM(CASE WHEN base.account_active = 0 THEN 1 ELSE 0 END) AS inactive_drivers,
                SUM(CASE WHEN base.document_status = 'approved' THEN 1 ELSE 0 END) AS approved_documents,
                SUM(CASE WHEN base.document_status = 'pending' THEN 1 ELSE 0 END) AS pending_documents,
                SUM(CASE WHEN base.document_status = 'expired' THEN 1 ELSE 0 END) AS expired_documents,
                SUM(CASE WHEN base.document_status = 'failed' THEN 1 ELSE 0 END) AS failed_documents,
                SUM(CASE WHEN base.document_status = 'no_documents' THEN 1 ELSE 0 END) AS no_documents
            FROM (
                SELECT
                    d.driver_id, d.available, d.is_activated, d.account_deleted, d.account_active,
                    COALESCE(doc.document_status, 'no_documents') AS document_status
                FROM drivers d
                ${joins}
                ${whereSql}
            ) base
        `,
        params
    );

    const row = rows[0] || {};
    return {
        totalDrivers: Number(row.total_drivers || 0),
        onlineDrivers: Number(row.online_drivers || 0),
        pendingActivationDrivers: Number(row.pending_activation_drivers || 0),
        accountActiveSummary: {
            active: Number(row.active_drivers || 0),
            inactive: Number(row.inactive_drivers || 0),
        },
        documentStatusSummary: {
            approved: Number(row.approved_documents || 0),
            pending: Number(row.pending_documents || 0),
            expired: Number(row.expired_documents || 0),
            failed: Number(row.failed_documents || 0),
            no_documents: Number(row.no_documents || 0),
        },
    };
}

export async function findDriverById(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                d.driver_id, d.firstname, d.lastname, CONCAT(d.firstname, ' ', d.lastname) AS full_name,
                d.email, d.phone, d.drv_address, d.state, d.drv_country, d.car_plate_num,
                d.car_reg_num, d.car_model, d.car_color, d.car_year, d.route_id,
                route_current.r_title AS route_name, d.reg_route_id,
                route_registered.r_title AS reg_route_name, d.ride_id, rd.ride_type,
                d.is_activated, d.account_deleted, d.available, d.operation_status,
                d.driver_rating, d.account_active, d.photo_file, d.driving_license_file,
                d.road_worthiness_file, COALESCE(wa.wallet_amount, 0) AS wallet_amount, d.bank_name, d.bank_acc_holder_name,
                d.bank_acc_num, d.bank_code, d.bank_swift_code, d.completed_rides,
                d.cancelled_rides, d.rejected_rides, d.country_code, d.country_dial_code,
                d.driver_commision, d.account_create_date,
                COALESCE(doc.document_status, 'no_documents') AS document_status,
                COALESCE(doc.document_count, 0) AS document_count,
                COALESCE(doc.pending_count, 0) AS pending_count,
                COALESCE(doc.failed_count, 0) AS failed_count,
                COALESCE(doc.expired_count, 0) AS expired_count,
                COALESCE(doc.approved_count, 0) AS approved_count
            FROM drivers d
            LEFT JOIN routes route_current ON route_current.id = d.route_id
            LEFT JOIN routes route_registered ON route_registered.id = d.reg_route_id
            LEFT JOIN rides rd ON rd.id = d.ride_id
            ${DRIVER_WALLET_AGGREGATE_JOIN}
            ${DRIVER_DOCUMENT_AGGREGATE_JOIN}
            WHERE d.driver_id = ?
            LIMIT 1
        `,
        [driverId]
    );

    return mapDriverRow(rows[0]);
}

export async function findDriverAccountById(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT driver_id, email, phone, account_active, is_activated, available, account_deleted, photo_file
            FROM drivers
            WHERE driver_id = ?
            LIMIT 1
        `,
        [driverId]
    );

    return mapDriverAccountRow(rows[0]);
}

export async function updateDriverAccountStatus({ driverId, accountActive }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE drivers SET account_active = ? WHERE driver_id = ? LIMIT 1`,
        [accountActive, driverId]
    );
    return result.affectedRows === 1;
}

export async function updateDriverPersonalInfo(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `
            UPDATE drivers
            SET
                firstname = ?, lastname = ?, drv_address = ?, route_id = ?, reg_route_id = ?,
                country_code = ?, country_dial_code = ?, phone = ?, email = ?, car_plate_num = ?,
                car_model = ?, ride_id = ?, car_year = ?, car_color = ?, bank_acc_holder_name = ?,
                bank_acc_num = ?, bank_name = ?, bank_code = ?, bank_swift_code = ?, driver_commision = ?,
                account_active = ?, is_activated = ?, available = ?, photo_file = ?
            WHERE driver_id = ?
            LIMIT 1
        `,
        [
            payload.firstname,
            payload.lastname,
            payload.drvAddress,
            payload.routeId,
            payload.regRouteId,
            payload.countryCode,
            payload.countryDialCode,
            payload.phone,
            payload.email,
            payload.carPlateNum,
            payload.carModel,
            payload.rideId,
            payload.carYear,
            payload.carColor,
            payload.bankAccHolderName,
            payload.bankAccNum,
            payload.bankName,
            payload.bankCode,
            payload.bankSwiftCode,
            payload.driverCommision,
            payload.accountActive,
            payload.isActivated,
            payload.available,
            payload.photoFile,
            payload.driverId,
        ]
    );

    return result.affectedRows === 1;
}

export async function findDriverTransactions(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                CONCAT('wallet-ledger-', wl.ledger_id) AS row_key,
                wl.ledger_id AS source_id,
                COALESCE(p.payment_code, CAST(wl.payment_id AS CHAR)) AS reference_id,
                wl.amount,
                wl.balance_after AS wallet_balance,
                COALESCE(p.booking_id, 0) AS booking_id,
                CASE WHEN wl.direction = 'credit' THEN 2 ELSE 3 END AS type_code,
                wl.description,
                wl.created_at AS transaction_date
            FROM wallet_accounts wa
            INNER JOIN wallet_ledger wl ON wl.wallet_id = wa.wallet_id
            LEFT JOIN payments p ON p.payment_id = wl.payment_id
            WHERE wa.actor_id = ? AND wa.actor_type = ?
            ORDER BY wl.created_at DESC, wl.ledger_id DESC
        `,
        [driverId, DRIVER_WALLET_ACTOR_TYPE]
    );

    return rows.map((row) => ({
        row_key: row.row_key,
        source_id: Number(row.source_id),
        reference_id: row.reference_id,
        amount: Number(row.amount || 0),
        wallet_balance: Number(row.wallet_balance || 0),
        booking_id: Number(row.booking_id || 0),
        type_code: Number(row.type_code || 0),
        description: row.description,
        transaction_date: row.transaction_date,
    }));
}

export async function findDriverBookings(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                b.id,
                NULLIF(TRIM(CONCAT(
                    COALESCE(NULLIF(b.user_firstname, ''), u.firstname, ''),
                    ' ',
                    COALESCE(NULLIF(b.user_lastname, ''), u.lastname, '')
                )), '') AS customer_name,
                b.pickup_address, b.dropoff_address, b.pickup_datetime, b.estimated_cost,
                b.paid_amount, b.payment_type, b.status, b.date_created
            FROM bookings b
            LEFT JOIN users u ON u.user_id = b.user_id
            WHERE b.driver_id = ?
            ORDER BY b.date_created DESC, b.id DESC
        `,
        [driverId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        customer_name: row.customer_name,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        pickup_datetime: row.pickup_datetime,
        estimated_cost: Number(row.estimated_cost || 0),
        paid_amount: Number(row.paid_amount || 0),
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        status: Number(row.status || 0),
        date_created: row.date_created,
    }));
}

export async function findDriverWithdrawals(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                wr.withdrawal_id AS id,
                wr.amount AS withdrawal_amount,
                wr.amount AS wallet_amount,
                wa.balance AS wallet_balance,
                CASE
                    WHEN wr.status = 'pending' THEN 0
                    WHEN wr.status IN ('cancelled', 'rejected') THEN 1
                    ELSE 2
                END AS request_status,
                wr.requested_at AS date_requested,
                wr.processed_at AS date_settled
            FROM wallet_accounts wa
            INNER JOIN withdrawal_requests wr ON wr.wallet_id = wa.wallet_id
            WHERE wa.actor_id = ? AND wa.actor_type = ?
            ORDER BY wr.requested_at DESC, wr.withdrawal_id DESC
        `,
        [driverId, DRIVER_WALLET_ACTOR_TYPE]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        withdrawal_amount: Number(row.withdrawal_amount || 0),
        wallet_amount: Number(row.wallet_amount || 0),
        wallet_balance: Number(row.wallet_balance || 0),
        request_status: Number(row.request_status || 0),
        date_requested: row.date_requested,
        date_settled: row.date_settled,
    }));
}

export async function findDriverReviews(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                ru.id, ru.booking_id,
                NULLIF(TRIM(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))), '') AS reviewer_name,
                ru.user_rating, ru.user_comment
            FROM ratings_users ru
            INNER JOIN bookings b ON b.id = ru.booking_id
            LEFT JOIN users u ON u.user_id = ru.user_id
            WHERE b.driver_id = ?
            ORDER BY ru.id DESC
        `,
        [driverId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        booking_id: Number(row.booking_id || 0),
        reviewer_name: row.reviewer_name,
        rating: Number(row.user_rating || 0),
        comment: row.user_comment,
    }));
}

export async function findDriverDocuments(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                dd.id,
                dd.document_id AS doc_id,
                0 AS u_vehicle_id,
                doc.title AS u_doc_title,
                doc.doc_id_num_title AS u_doc_id_num_title,
                dd.doc_number AS u_doc_id_num,
                1 AS u_can_edit,
                dd.doc_expiry_date AS u_doc_expiry_date,
                NULL AS u_doc_img,
                CASE
                    WHEN dd.doc_expiry_date IS NOT NULL AND dd.doc_expiry_date < CURDATE() THEN 2
                    WHEN dd.verified = 1 THEN 3
                    ELSE 0
                END AS u_doc_status,
                dd.date_submitted AS date_created,
                dd.date_submitted AS date_updated
            FROM driver_documents dd
            LEFT JOIN documents doc ON doc.id = dd.document_id
            WHERE dd.driver_id = ?
            ORDER BY dd.date_submitted DESC, dd.id DESC
        `,
        [driverId]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        doc_id: Number(row.doc_id || 0),
        vehicle_id: Number(row.u_vehicle_id || 0),
        title: row.u_doc_title,
        id_number_title: row.u_doc_id_num_title,
        id_number: row.u_doc_id_num,
        can_edit: Number(row.u_can_edit || 0),
        expiry_date: row.u_doc_expiry_date,
        image_url: row.u_doc_img,
        status: Number(row.u_doc_status || 0),
        date_created: row.date_created,
        date_updated: row.date_updated,
    }));
}

export async function findLatestDriverLocation(driverId) {
    const [rows] = await sqldb.query(
        `
            SELECT driver_id, \`long\`, lat, b_angle, loc_static_status, loc_static_duration, updated_at
            FROM driver_current_locations
            WHERE driver_id = ?
            LIMIT 1
        `,
        [driverId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.driver_id),
        driver_id: Number(row.driver_id),
        long: Number(row.long),
        lat: Number(row.lat),
        b_angle: Number(row.b_angle || 0),
        loc_static_status: Number(row.loc_static_status || 0),
        loc_static_duration: row.loc_static_duration === null ? null : Number(row.loc_static_duration),
        location_date: row.updated_at,
    };
}

export async function findOnlineDriversWithLocations() {
    const conn = await sqldb.getConnection();
    try {
        const [rows] = await conn.query(`
            SELECT
                d.driver_id,
                d.firstname,
                d.lastname,
                d.phone,
                d.driver_rating,
                d.operation_status,
                dcl.lat,
                dcl.\`long\` AS lng,
                dcl.updated_at AS location_date
            FROM drivers d
            LEFT JOIN driver_current_locations dcl ON dcl.driver_id = d.driver_id
            WHERE d.available = 1
              AND d.account_active = 1
              AND d.is_activated = 1
              AND d.account_deleted = 0
            ORDER BY d.driver_id DESC
        `);
        return rows.map((row) => ({
            driver_id:        Number(row.driver_id),
            full_name:        `${row.firstname || ""} ${row.lastname || ""}`.trim(),
            firstname:        row.firstname || "",
            lastname:         row.lastname || "",
            phone:            row.phone || "",
            driver_rating:    row.driver_rating != null ? Number(row.driver_rating) : null,
            operation_status: Number(row.operation_status),
            lat:              row.lat != null ? Number(row.lat) : null,
            lng:              row.lng != null ? Number(row.lng) : null,
            location_date:    row.location_date || null,
        }));
    } finally {
        conn.release();
    }
}

export async function findAdminPasswordById(userId) {
    const [rows] = await sqldb.query(
        `SELECT user_id, password_hash FROM users WHERE user_id = ? AND account_type = 3 LIMIT 1`,
        [userId]
    );
    const row = rows[0];
    return row ? { user_id: Number(row.user_id), password_hash: row.password_hash } : null;
}

export async function softDeleteDriverAccount(driverId, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE drivers SET account_deleted = 1 WHERE driver_id = ? AND account_deleted = 0 LIMIT 1`,
        [driverId]
    );
    return result.affectedRows === 1;
}

export async function findDriverWithdrawalById(driverId, withdrawalId) {
    const [rows] = await sqldb.query(
        `
            SELECT
                wr.withdrawal_id AS id,
                wa.actor_id AS person_id,
                wa.actor_type AS user_type,
                CASE
                    WHEN wr.status = 'pending' THEN 0
                    WHEN wr.status IN ('cancelled', 'rejected') THEN 1
                    ELSE 2
                END AS request_status,
                wr.amount AS wallet_amount,
                wa.balance AS wallet_balance,
                wr.amount AS withdrawal_amount
            FROM wallet_accounts wa
            INNER JOIN withdrawal_requests wr ON wr.wallet_id = wa.wallet_id
            WHERE wr.withdrawal_id = ? AND wa.actor_id = ? AND wa.actor_type = ?
            LIMIT 1
        `,
        [withdrawalId, driverId, DRIVER_WALLET_ACTOR_TYPE]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        id: Number(row.id),
        person_id: Number(row.person_id),
        user_type: Number(row.user_type),
        request_status: Number(row.request_status || 0),
        wallet_amount: Number(row.wallet_amount || 0),
        wallet_balance: Number(row.wallet_balance || 0),
        withdrawal_amount: Number(row.withdrawal_amount || 0),
    };
}

export async function updateDriverWithdrawalStatus({ withdrawalId, requestStatus }, conn) {
    const db = dbConnection(conn);

    let status = "pending";
    if (Number(requestStatus) === 1) {
        status = "cancelled";
    } else if (Number(requestStatus) === 2) {
        status = "approved";
    }

    const [result] = await db.query(
        `
            UPDATE withdrawal_requests
            SET status = ?, processed_at = CASE WHEN ? = 'pending' THEN NULL ELSE NOW() END
            WHERE withdrawal_id = ?
            LIMIT 1
        `,
        [status, status, withdrawalId]
    );

    return result.affectedRows === 1;
}
