import AppError from "../utils/appError.js";
import {
    getAdminKpiSummary,
    getDispatcherBoard,
    getDocumentStatusReport,
    getDriverPerformanceReport,
    getRevenueReport,
    getWalletReport,
} from "../repositories/dashboardRepository.js";

function normalizeDate(value) {
    if (!value) return undefined;
    const normalized = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        throw new AppError("date must be in YYYY-MM-DD format.", 422, "INVALID_DATE");
    }
    return normalized;
}

export async function adminDashboardService({ query }) {
    const dateFrom = normalizeDate(query.date_from);
    const dateTo = normalizeDate(query.date_to);
    const summary = await getAdminKpiSummary({ dateFrom, dateTo });
    const cancelRate =
        summary.bookings.total > 0
            ? Number(((summary.bookings.cancelled / summary.bookings.total) * 100).toFixed(2))
            : 0;
    return {
        ...summary,
        operations: {
            cancellation_rate_percent: cancelRate,
        },
    };
}

export async function dispatcherDashboardService() {
    return getDispatcherBoard();
}

export async function operationsReportService({ query }) {
    const dateFrom = normalizeDate(query.date_from);
    const dateTo = normalizeDate(query.date_to);
    const granularity = String(query.granularity || "day").trim().toLowerCase();
    if (!["day", "month"].includes(granularity)) {
        throw new AppError("granularity must be day or month.", 422, "INVALID_GRANULARITY");
    }

    const [revenue, driverPerformance, wallet, documents] = await Promise.all([
        getRevenueReport({ granularity, dateFrom, dateTo }),
        getDriverPerformanceReport({ dateFrom, dateTo }),
        getWalletReport(),
        getDocumentStatusReport(),
    ]);

    return {
        revenue,
        driver_performance: driverPerformance,
        wallet,
        documents,
        filters: {
            date_from: dateFrom || null,
            date_to: dateTo || null,
            granularity,
        },
    };
}

