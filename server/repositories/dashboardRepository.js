import sqldb from "../config/sqldatabase.js";

export async function getAdminKpiSummary({ dateFrom, dateTo } = {}) {
    const whereDate = [];
    const params = [];
    if (dateFrom) {
        whereDate.push("b.date_created >= ?");
        params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
        whereDate.push("b.date_created <= ?");
        params.push(`${dateTo} 23:59:59`);
    }
    const whereSql = whereDate.length ? `WHERE ${whereDate.join(" AND ")}` : "";

    const [userRows, driverRows, bookingRows, walletRows, rentalRows] = await Promise.all([
        sqldb.query(`SELECT COUNT(*) AS total_users, SUM(CASE WHEN account_active = 1 THEN 1 ELSE 0 END) AS active_users FROM users WHERE account_type = 1`),
        sqldb.query(`SELECT COUNT(*) AS total_drivers, SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) AS online_drivers FROM drivers WHERE account_deleted = 0`),
        sqldb.query(
            `SELECT COUNT(*) AS total_bookings,
                    SUM(CASE WHEN b.status IN (0,1,6) THEN 1 ELSE 0 END) AS active_bookings,
                    SUM(CASE WHEN b.status = 3 THEN 1 ELSE 0 END) AS completed_bookings,
                    SUM(CASE WHEN b.status IN (2,4,5) THEN 1 ELSE 0 END) AS cancelled_bookings,
                    COALESCE(SUM(CASE WHEN b.status = 3 THEN COALESCE(NULLIF(b.actual_cost,0), b.estimated_cost, 0) ELSE 0 END),0) AS completed_revenue
             FROM bookings b
             ${whereSql}`,
            params
        ),
        sqldb.query(
            `SELECT COALESCE(SUM(balance),0) AS total_wallet_balance
             FROM wallet_accounts`
        ),
        sqldb.query(
            `SELECT COUNT(*) AS total_rentals,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS active_rentals,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_rentals,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END),0) AS rental_revenue
             FROM rental_bookings`
        ),
    ]);

    return {
        users: {
            total: Number(userRows[0][0]?.total_users || 0),
            active: Number(userRows[0][0]?.active_users || 0),
        },
        drivers: {
            total: Number(driverRows[0][0]?.total_drivers || 0),
            online: Number(driverRows[0][0]?.online_drivers || 0),
        },
        bookings: {
            total: Number(bookingRows[0][0]?.total_bookings || 0),
            active: Number(bookingRows[0][0]?.active_bookings || 0),
            completed: Number(bookingRows[0][0]?.completed_bookings || 0),
            cancelled: Number(bookingRows[0][0]?.cancelled_bookings || 0),
            revenue: Number(bookingRows[0][0]?.completed_revenue || 0),
        },
        rentals: {
            total: Number(rentalRows[0][0]?.total_rentals || 0),
            active: Number(rentalRows[0][0]?.active_rentals || 0),
            completed: Number(rentalRows[0][0]?.completed_rentals || 0),
            revenue: Number(rentalRows[0][0]?.rental_revenue || 0),
        },
        wallets: {
            total_balance: Number(walletRows[0][0]?.total_wallet_balance || 0),
        },
    };
}

export async function getDispatcherBoard() {
    const [bookingsRows, driversRows] = await Promise.all([
        sqldb.query(
            `SELECT b.id, b.user_id, b.driver_id, b.pickup_address, b.dropoff_address, b.status, b.date_created,
                    NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name,
                    NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name
             FROM bookings b
             LEFT JOIN users u ON u.user_id = b.user_id
             LEFT JOIN drivers d ON d.driver_id = b.driver_id
             WHERE b.status IN (0,1,6)
             ORDER BY b.id DESC
             LIMIT 100`
        ),
        sqldb.query(
            `SELECT d.driver_id, d.firstname, d.lastname, d.phone, d.available, d.operation_status,
                    d.route_id, d.ride_id, d.driver_rating, l.long, l.lat, l.updated_at
             FROM drivers d
             LEFT JOIN driver_current_locations l ON l.driver_id = d.driver_id
             WHERE d.account_deleted = 0 AND d.account_active = 1 AND d.is_activated = 1
             ORDER BY d.available DESC, d.driver_id DESC
             LIMIT 300`
        ),
    ]);

    return {
        active_bookings: bookingsRows[0].map((row) => ({
            id: Number(row.id),
            user_id: Number(row.user_id),
            user_name: row.user_name,
            driver_id: row.driver_id === null ? null : Number(row.driver_id),
            driver_name: row.driver_name,
            pickup_address: row.pickup_address,
            dropoff_address: row.dropoff_address,
            status: Number(row.status || 0),
            date_created: row.date_created,
        })),
        fleet: driversRows[0].map((row) => ({
            driver_id: Number(row.driver_id),
            full_name: `${row.firstname || ""} ${row.lastname || ""}`.trim(),
            phone: row.phone,
            available: Number(row.available || 0),
            operation_status: Number(row.operation_status || 0),
            route_id: row.route_id === null ? null : Number(row.route_id),
            ride_id: row.ride_id === null ? null : Number(row.ride_id),
            driver_rating: Number(row.driver_rating || 0),
            long: row.long === null ? null : Number(row.long),
            lat: row.lat === null ? null : Number(row.lat),
            location_updated_at: row.updated_at,
        })),
    };
}

export async function getRevenueReport({ granularity = "day", dateFrom, dateTo } = {}) {
    const dateExpr = granularity === "month" ? "DATE_FORMAT(date_created, '%Y-%m')" : "DATE(date_created)";
    const whereClauses = [];
    const params = [];
    if (dateFrom) {
        whereClauses.push("date_created >= ?");
        params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
        whereClauses.push("date_created <= ?");
        params.push(`${dateTo} 23:59:59`);
    }
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT ${dateExpr} AS period,
                COUNT(*) AS total_bookings,
                SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS completed_bookings,
                SUM(CASE WHEN status IN (2,4,5) THEN 1 ELSE 0 END) AS cancelled_bookings,
                COALESCE(SUM(CASE WHEN status = 3 THEN COALESCE(NULLIF(actual_cost,0), estimated_cost, 0) ELSE 0 END), 0) AS revenue
         FROM bookings
         ${whereSql}
         GROUP BY ${dateExpr}
         ORDER BY period ASC`,
        params
    );
    return rows.map((row) => ({
        period: row.period,
        total_bookings: Number(row.total_bookings || 0),
        completed_bookings: Number(row.completed_bookings || 0),
        cancelled_bookings: Number(row.cancelled_bookings || 0),
        revenue: Number(row.revenue || 0),
    }));
}

export async function getDriverPerformanceReport({ dateFrom, dateTo } = {}) {
    const whereClauses = [];
    const params = [];
    if (dateFrom) {
        whereClauses.push("b.date_created >= ?");
        params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
        whereClauses.push("b.date_created <= ?");
        params.push(`${dateTo} 23:59:59`);
    }
    const whereSql = whereClauses.length ? `AND ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT d.driver_id,
                NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name,
                COUNT(b.id) AS total_trips,
                SUM(CASE WHEN b.status = 3 THEN 1 ELSE 0 END) AS completed_trips,
                SUM(CASE WHEN b.status = 4 THEN 1 ELSE 0 END) AS cancelled_by_driver,
                COALESCE(AVG(ru.user_rating), 0) AS avg_user_rating
         FROM drivers d
         LEFT JOIN bookings b ON b.driver_id = d.driver_id
         LEFT JOIN ratings_users ru ON ru.booking_id = b.id
         WHERE d.account_deleted = 0 ${whereSql}
         GROUP BY d.driver_id, driver_name
         ORDER BY completed_trips DESC, total_trips DESC
         LIMIT 500`,
        params
    );
    return rows.map((row) => ({
        driver_id: Number(row.driver_id),
        driver_name: row.driver_name,
        total_trips: Number(row.total_trips || 0),
        completed_trips: Number(row.completed_trips || 0),
        cancelled_by_driver: Number(row.cancelled_by_driver || 0),
        avg_user_rating: Number(row.avg_user_rating || 0),
    }));
}

export async function getWalletReport() {
    const [rows] = await sqldb.query(
        `SELECT wa.actor_type, COUNT(*) AS total_wallets, COALESCE(SUM(wa.balance),0) AS total_balance
         FROM wallet_accounts wa
         GROUP BY wa.actor_type
         ORDER BY wa.actor_type ASC`
    );
    return rows.map((row) => ({
        actor_type: Number(row.actor_type),
        total_wallets: Number(row.total_wallets || 0),
        total_balance: Number(row.total_balance || 0),
    }));
}

export async function getDocumentStatusReport() {
    const [userRows, driverRows] = await Promise.all([
        sqldb.query(
            `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) AS pending
             FROM user_documents`
        ),
        sqldb.query(
            `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) AS pending
             FROM driver_documents`
        ),
    ]);
    return {
        user_documents: {
            total: Number(userRows[0][0]?.total || 0),
            approved: Number(userRows[0][0]?.approved || 0),
            pending: Number(userRows[0][0]?.pending || 0),
        },
        driver_documents: {
            total: Number(driverRows[0][0]?.total || 0),
            approved: Number(driverRows[0][0]?.approved || 0),
            pending: Number(driverRows[0][0]?.pending || 0),
        },
    };
}

