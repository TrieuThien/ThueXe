import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import BookingFilters from "../../components/bookings/BookingFilters";
import BookingTable from "../../components/bookings/BookingTable";
import { useBookingFilters } from "../../hooks/useBookingFilters";
import {
    assignDriver,
    getAssignableDrivers,
    getBookings,
    getProcessingBookings,
    getScheduledBookings,
    updateBookingStatus,
} from "../../services/bookingService";

const MODE_TITLE = {
    all: "Danh Sách Booking",
    processing: "Trang Điều Phối",
    scheduled: "Danh Sách Hẹn Đặt",
};

const MODE_DESCRIPTION = {
    all: "Theo dõi toàn bộ booking với bộ lọc nâng cao.",
    processing: "Theo dõi booking đang xử lý và điều phối tài xế.",
    scheduled: "Quản lý booking hẹn đặt và điều phối trước.",
};

function getFetchByMode(mode) {
    if (mode === "processing") return getProcessingBookings;
    if (mode === "scheduled") return getScheduledBookings;
    return getBookings;
}

export default function BookingsBoardPage({ mode = "all" }) {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const { filters, queryParams, updateFilter, resetFilters } = useBookingFilters();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
    const [summary, setSummary] = useState({ immediate_count: 0, scheduled_count: 0 });
    const [totalItems, setTotalItems] = useState(0);

    const detailPathBase = useMemo(() => (role === "admin" ? "/admin/bookings" : "/dispatcher/bookings"), [role]);

    async function loadData(params = queryParams) {
        setLoading(true);
        setErrorMessage("");
        try {
            const fetchFn = getFetchByMode(mode);
            const data = await fetchFn(params);
            setItems(data.items || []);
            setPagination({
                page: Number(data.pagination?.page || 1),
                totalPages: Number(data.pagination?.totalPages || 0),
            });
            setTotalItems(Number(data.totalItems || 0));
            setSummary({
                immediate_count: Number(data.summary?.immediate_count || 0),
                scheduled_count: Number(data.summary?.scheduled_count || 0),
            });
        } catch (error) {
            setItems([]);
            setTotalItems(0);
            setSummary({ immediate_count: 0, scheduled_count: 0 });
            setErrorMessage(error?.response?.data?.message || "Không thể tải danh sách booking.");
        } finally {
            setLoading(false);
        }
    }

    async function handleApply(event) {
        event.preventDefault();
        await loadData({ ...queryParams, page: 1 });
    }

    async function handleReset() {
        resetFilters();
        await loadData({ page: 1, limit: 15 });
    }

    async function handleAssign(item) {
        setBusyId(item.id);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const drivers = await getAssignableDrivers({
                route_id: item.route_id,
                ride_id: item.ride_id,
                limit: 15,
            });

            const choices = (drivers.items || [])
                .map((driver) => `${driver.driver_id}: ${driver.full_name} (${driver.phone || "--"})`)
                .join("\n");

            const selected = window.prompt(
                `Nhập mã tài xế để gán:\n${choices || "Không có gợi ý phù hợp"}`,
                item.driver_id ? String(item.driver_id) : ""
            );

            if (!selected) {
                return;
            }

            const parsedDriverId = Number(selected);
            if (!Number.isInteger(parsedDriverId) || parsedDriverId < 1) {
                throw new Error("Mã tài xế không hợp lệ");
            }

            await assignDriver(item.id, parsedDriverId);
            setSuccessMessage(`Đã gán tài xế #${parsedDriverId} cho booking #${item.id}.`);
            await loadData();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể gán tài xế.");
        } finally {
            setBusyId(null);
        }
    }

    async function handleStatusChange(item) {
        setBusyId(item.id);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const nextStatus = window.prompt(
                "Nhập trạng thái mới (0 chờ xử lý, 1 đang chở, 2 khách hủy, 3 hoàn thành, 4 tài xế hủy, 5 admin hủy, 6 đã đến điểm đón)",
                String(item.status)
            );

            if (!nextStatus) {
                return;
            }

            const parsedStatus = Number(nextStatus);
            const cancelComment =
                parsedStatus === 2 || parsedStatus === 4 || parsedStatus === 5
                    ? window.prompt("Lý do hủy (không bắt buộc):", "") || undefined
                    : undefined;

            await updateBookingStatus(item.id, {
                status: parsedStatus,
                cancel_comment: cancelComment,
            });

            setSuccessMessage(`Đã cập nhật trạng thái booking #${item.id} thành ${parsedStatus}.`);
            await loadData();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể cập nhật trạng thái.");
        } finally {
            setBusyId(null);
        }
    }

    useEffect(() => {
        loadData(queryParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, role]);

    return (
        <div className="space-y-5">
            <section className="rounded-[24px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Booking</p>
                <h1 className="mt-2 text-3xl font-bold">{MODE_TITLE[mode]}</h1>
                <p className="mt-2 text-sm text-slate-200">{MODE_DESCRIPTION[mode]}</p>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Tổng đặt ngay</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{summary.immediate_count}</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-xs font-semibold uppercase text-indigo-700">Tổng hẹn đặt</p>
                    <p className="mt-2 text-2xl font-bold text-indigo-800">{summary.scheduled_count}</p>
                </div>
                {mode === "processing" ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase text-amber-700">Đang xử lý</p>
                        <p className="mt-2 text-2xl font-bold text-amber-800">{totalItems}</p>
                    </div>
                ) : null}
            </section>

            <BookingFilters
                filters={filters}
                onChange={updateFilter}
                onApply={handleApply}
                onReset={handleReset}
                disabled={loading}
            />

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => loadData(queryParams)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    Tải lại
                </button>
                <p className="text-sm text-slate-500">
                    Trang {pagination.page} / {pagination.totalPages || 1}
                </p>
            </div>

            {errorMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            ) : null}

            {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            ) : null}

            {loading ? (
                <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    Đang tải booking...
                </div>
            ) : (
                <BookingTable
                    items={items}
                    role={role}
                    onAssign={handleAssign}
                    onStatusChange={handleStatusChange}
                    busyId={busyId}
                    detailPathBase={detailPathBase}
                />
            )}
        </div>
    );
}
