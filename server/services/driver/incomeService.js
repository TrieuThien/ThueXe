import AppError from "../../utils/appError.js";
import {
    countIncomeHistory,
    getIncomeChartByDay,
    getIncomeChartByMonth,
    getIncomeSummaryStats,
    listIncomeHistory,
} from "../../repositories/driver/incomeRepository.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertDriver(auth) {
    const driverId = Number(auth?.userId || 0);
    if (!driverId) throw new AppError("Forbidden", 403, "FORBIDDEN");
    return driverId;
}

function normalizePagination(query = {}) {
    const page  = Math.max(Number(query.page  || 1),   1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    return { page, limit, offset: (page - 1) * limit };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Income summary: today, this month, all-time totals derived from bookings.
 *
 * Source: bookings (driver_id, status=3, driver_commision, actual/estimated_cost).
 * earnings = ROUND(effective_cost × driver_commision / 100, 2)
 * effective_cost = actual_cost > 0 ? actual_cost : estimated_cost
 */
export async function getIncomeSummary(auth) {
    const driverId = assertDriver(auth);
    const stats = await getIncomeSummaryStats(driverId);
    return { income: stats };
}

/**
 * Income chart: time-series data for frontend chart rendering.
 *
 * Query params:
 *   mode   — 'day' (default) | 'month'
 *   period — number of days (mode=day, default 30) or months (mode=month, default 12), max 365/60
 */
export async function getIncomeChart(auth, query = {}) {
    const driverId = assertDriver(auth);

    const mode = query.mode === "month" ? "month" : "day";

    let period;
    if (mode === "day") {
        period = Math.min(Math.max(Number(query.period || 30), 1), 365);
    } else {
        period = Math.min(Math.max(Number(query.period || 12), 1), 60);
    }

    const data = mode === "day"
        ? await getIncomeChartByDay(driverId, period)
        : await getIncomeChartByMonth(driverId, period);

    return {
        mode,
        period,
        data,
    };
}

/**
 * Paginated income history per completed trip.
 *
 * Filters: fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD), service_type (int).
 */
export async function getIncomeHistory(auth, query = {}) {
    const driverId = assertDriver(auth);
    const { page, limit, offset } = normalizePagination(query);

    const filters = {
        fromDate:    query.fromDate    || undefined,
        toDate:      query.toDate      || undefined,
        serviceType: query.service_type !== undefined ? Number(query.service_type) : undefined,
    };

    const [items, total] = await Promise.all([
        listIncomeHistory(driverId, filters, { limit, offset }),
        countIncomeHistory(driverId, filters),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total_items:  total,
            total_pages:  Math.ceil(total / limit),
        },
    };
}
