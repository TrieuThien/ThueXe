import sqldb from "../../config/sqldatabase.js";

function db(conn) {
    return conn || sqldb;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Effective cost = actual_cost when > 0, otherwise estimated_cost.
 * driver_earnings = ROUND(effective_cost × driver_commision / 100, 2)
 */
const EARNINGS_EXPR = `ROUND(
    COALESCE(NULLIF(b.actual_cost, 0), b.estimated_cost, 0)
    * b.driver_commision / 100,
2)`;

/**
 * Build WHERE + params for income history filters.
 * Base condition: driver_id = ? AND status = 3 (completed).
 */
function buildIncomeWhere(driverId, filters = {}) {
    const clauses = ["b.driver_id = ?", "b.status = 3"];
    const params = [driverId];

    if (filters.fromDate) {
        clauses.push("b.date_completed >= ?");
        params.push(`${filters.fromDate} 00:00:00`);
    }
    if (filters.toDate) {
        clauses.push("b.date_completed <= ?");
        params.push(`${filters.toDate} 23:59:59`);
    }
    if (filters.serviceType !== undefined) {
        clauses.push("b.service_type = ?");
        params.push(filters.serviceType);
    }

    return { whereSql: `WHERE ${clauses.join(" AND ")}`, params };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Aggregate income stats from completed bookings.
 * Returns: total_trips, today_trips, month_trips,
 *          total_earnings, today_earnings, month_earnings,
 *          unsettled_earnings (driver_settled=0).
 */
export async function getIncomeSummaryStats(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            COUNT(*)                                                        AS total_trips,
            SUM(CASE WHEN DATE(b.date_created) = CURDATE()             THEN 1 ELSE 0 END) AS today_trips,
            SUM(CASE WHEN YEAR(b.date_created)  = YEAR(NOW())
                      AND MONTH(b.date_created) = MONTH(NOW())          THEN 1 ELSE 0 END) AS month_trips,

            SUM(${EARNINGS_EXPR})                                          AS total_earnings,
            SUM(CASE WHEN DATE(b.date_created) = CURDATE()
                     THEN ${EARNINGS_EXPR} ELSE 0 END)                    AS today_earnings,
            SUM(CASE WHEN YEAR(b.date_created)  = YEAR(NOW())
                      AND MONTH(b.date_created) = MONTH(NOW())
                     THEN ${EARNINGS_EXPR} ELSE 0 END)                    AS month_earnings,

            SUM(CASE WHEN b.driver_settled = 0
                     THEN ${EARNINGS_EXPR} ELSE 0 END)                    AS unsettled_earnings
         FROM bookings b
         WHERE b.driver_id = ?`,
        [driverId]
    );

    const r = rows[0] || {};
    return {
        total_trips: Number(r.total_trips || 0),
        today_trips: Number(r.today_trips || 0),
        month_trips: Number(r.month_trips || 0),
        total_earnings: Number(r.total_earnings || 0),
        today: Number(r.today_earnings || 0),
        thisMonth: Number(r.month_earnings || 0),
        allTime: Number(r.total_earnings || 0),
        unsettled: Number(r.unsettled_earnings || 0),
    };
}

// ─── Chart ────────────────────────────────────────────────────────────────────

/**
 * Income chart data grouped by day for the last `days` days.
 * Optionally filtered by date range (fromDate, toDate).
 * Returns array of { label: 'YYYY-MM-DD', trips, earnings }.
 */
export async function getIncomeChartByDay(driverId, days = 30, fromDate = null, toDate = null, conn = null) {
    // Build date condition
    let dateCondition = "b.date_completed >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
    const params = [driverId, days];

    if (fromDate || toDate) {
        const conditions = [];
        if (fromDate) {
            conditions.push("b.date_completed >= ?");
            params.push(`${fromDate} 00:00:00`);
        }
        if (toDate) {
            conditions.push("b.date_completed <= ?");
            params.push(`${toDate} 23:59:59`);
        }
        if (conditions.length > 0) {
            dateCondition = conditions.join(" AND ");
            // Remove the default date interval parameter if we have custom dates
            params.splice(1, 1); // Remove the 'days' parameter
        }
    }

    const [rows] = await db(conn).query(
        `SELECT
            DATE(b.date_completed)  AS label,
            COUNT(*)                AS trips,
            SUM(${EARNINGS_EXPR})   AS earnings
         FROM bookings b
         WHERE b.driver_id = ?
           AND b.status    = 3
           AND ${dateCondition}
         GROUP BY DATE(b.date_completed)
         ORDER BY label ASC`,
        params
    );

    return rows.map((r) => ({
        label: r.label instanceof Date
            ? r.label.toISOString().slice(0, 10)
            : String(r.label),
        trips: Number(r.trips || 0),
        earnings: Number(r.earnings || 0),
    }));
}

/**
 * Income chart data grouped by month for the last `months` months.
 * Optionally filtered by date range (fromDate, toDate).
 * Returns array of { label: 'YYYY-MM', trips, earnings }.
 */
export async function getIncomeChartByMonth(driverId, months = 12, fromDate = null, toDate = null, conn = null) {
    // Build date condition
    let dateCondition = "b.date_completed >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)";
    const params = [driverId, months];

    if (fromDate || toDate) {
        const conditions = [];
        if (fromDate) {
            conditions.push("b.date_completed >= ?");
            params.push(`${fromDate} 00:00:00`);
        }
        if (toDate) {
            conditions.push("b.date_completed <= ?");
            params.push(`${toDate} 23:59:59`);
        }
        if (conditions.length > 0) {
            dateCondition = conditions.join(" AND ");
            // Remove the default date interval parameter if we have custom dates
            params.splice(1, 1); // Remove the 'months' parameter
        }
    }

    const [rows] = await db(conn).query(
        `SELECT
            DATE_FORMAT(b.date_completed, '%Y-%m') AS label,
            COUNT(*)                               AS trips,
            SUM(${EARNINGS_EXPR})                  AS earnings
         FROM bookings b
         WHERE b.driver_id = ?
           AND b.status    = 3
           AND ${dateCondition}
         GROUP BY DATE_FORMAT(b.date_completed, '%Y-%m')
         ORDER BY label ASC`,
        params
    );

    return rows.map((r) => ({
        label: String(r.label || ""),
        trips: Number(r.trips || 0),
        earnings: Number(r.earnings || 0),
    }));
}

// ─── Income history ───────────────────────────────────────────────────────────

/**
 * Paginated list of completed trips with per-trip earnings.
 * Filters: fromDate, toDate, serviceType.
 */
export async function listIncomeHistory(driverId, filters = {}, { limit, offset } = {}, conn = null) {
    const { whereSql, params } = buildIncomeWhere(driverId, filters);
    const queryParams = [...params, limit, offset];

    const [rows] = await db(conn).query(
        `SELECT
            b.id,
            b.b_uuid,
            b.user_firstname,
            b.user_lastname,
            b.user_phone,
            b.pickup_address,
            b.dropoff_address,
            b.estimated_cost,
            b.actual_cost,
            b.cur_symbol,
            b.cur_code,
            b.driver_commision,
            b.driver_settled,
            b.payment_type,
            b.service_type,
            b.date_completed,
            b.date_created,
            ${EARNINGS_EXPR} AS driver_earnings
         FROM bookings b
         ${whereSql}
         ORDER BY b.date_completed DESC, b.id DESC
         LIMIT ? OFFSET ?`,
        queryParams
    );

    return rows.map((row) => ({
        id: Number(row.id),
        b_uuid: row.b_uuid,
        user_name: [row.user_firstname, row.user_lastname].filter(Boolean).join(" ") || null,
        user_phone: row.user_phone,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        estimated_cost: Number(row.estimated_cost || 0),
        actual_cost: Number(row.actual_cost || 0),
        cur_symbol: row.cur_symbol,
        cur_code: row.cur_code,
        driver_commision: Number(row.driver_commision || 0),
        driver_settled: Number(row.driver_settled || 0),
        driver_earnings: Number(row.driver_earnings || 0),
        payment_type: row.payment_type !== null ? Number(row.payment_type) : null,
        service_type: Number(row.service_type || 0),
        date_completed: row.date_completed,
        date_created: row.date_created,
    }));
}

export async function countIncomeHistory(driverId, filters = {}, conn = null) {
    const { whereSql, params } = buildIncomeWhere(driverId, filters);

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM bookings b
         ${whereSql}`,
        params
    );
    return Number(rows[0]?.total_items || 0);
}
