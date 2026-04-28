import { useEffect, useState } from "react";
import { useRentalBookingFilters } from "../../hooks/useRentalBookingFilters";
import { assignRentalBooking, getRentalBookings, updateRentalBookingStatus } from "../../services/rentalBookingService";
import RentalBookingFilters from "../../components/rental-bookings/RentalBookingFilters";
import RentalBookingTable from "../../components/rental-bookings/RentalBookingTable";

const STATUS_OPTIONS = [
    "scheduled",
    "pending",
    "in_progress",
    "completed",
    "cancelled",
];

export default function RentalBookingListPage() {
    const { filters, queryParams, updateFilter, resetFilters } = useRentalBookingFilters();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [summary, setSummary] = useState({ total: 0, in_progress: 0, completed: 0 });

    async function loadData(params = queryParams) {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getRentalBookings(params);
            const fetched = data.items || [];
            setItems(fetched);
            setPagination({
                page: Number(data.pagination?.page || 1),
                totalPages: Number(data.pagination?.totalPages || 0),
            });
            setTotalItems(Number(data.pagination?.total || fetched.length));
            setSummary({
                total: Number(data.pagination?.total || fetched.length),
                in_progress: fetched.filter((i) => i.status === "in_progress").length,
                completed: fetched.filter((i) => i.status === "completed").length,
            });
        } catch (error) {
            setItems([]);
            setTotalItems(0);
            setErrorMessage(error?.response?.data?.message || "Không thể tải danh sách đơn thuê.");
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
        setBusyId(item.rental_id);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const input = window.prompt(
                `Nhập mã tài xế (driver_id) để gán cho đơn ${item.rental_booking_code || `#${item.rental_id}`}:`,
                item.driver_id ? String(item.driver_id) : ""
            );
            if (!input) return;
            const driverId = Number(input);
            if (!Number.isInteger(driverId) || driverId < 1) throw new Error("Mã tài xế không hợp lệ.");
            await assignRentalBooking(item.rental_id, { driver_id: driverId });
            setSuccessMessage(`Đã gán tài xế #${driverId} cho đơn #${item.rental_id}.`);
            await loadData();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể gán tài xế.");
        } finally {
            setBusyId(null);
        }
    }

    async function handleStatusChange(item) {
        setBusyId(item.rental_id);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const optionsList = STATUS_OPTIONS.join(", ");
            const input = window.prompt(
                `Nhập trạng thái mới cho đơn ${item.rental_booking_code || `#${item.rental_id}`}:\n(${optionsList})`,
                item.status || ""
            );
            if (!input) return;
            const trimmed = input.trim().toLowerCase();
            if (!STATUS_OPTIONS.includes(trimmed)) throw new Error(`Trạng thái không hợp lệ: "${trimmed}"`);

            let cancelReason;
            if (trimmed === "cancelled") {
                cancelReason = window.prompt("Lý do hủy (không bắt buộc):", "") || undefined;
            }

            await updateRentalBookingStatus(item.rental_id, {
                status: trimmed,
                cancel_reason: cancelReason,
            });
            setSuccessMessage(`Đã cập nhật trạng thái đơn #${item.rental_id} thành "${trimmed}".`);
            await loadData();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể cập nhật trạng thái.");
        } finally {
            setBusyId(null);
        }
    }

    function handlePageChange(newPage) {
        updateFilter("page", newPage);
    }

    useEffect(() => {
        loadData(queryParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page]);

    return (
        <div className="space-y-5">
            <section className="rounded-[24px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Quản lý</p>
                <h1 className="mt-2 text-3xl font-bold">Đơn Thuê Xe / Tài Xế</h1>
                <p className="mt-2 text-sm text-slate-200">Theo dõi và xử lý các đơn thuê xe, thuê tài xế với bộ lọc nâng cao.</p>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500">Tổng đơn</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{totalItems}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase text-blue-700">Đang thực hiện</p>
                    <p className="mt-2 text-2xl font-bold text-blue-800">{summary.in_progress}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Hoàn thành</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{summary.completed}</p>
                </div>
            </section>

            <RentalBookingFilters
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
                    Trang {pagination.page} / {pagination.totalPages || 1} — {totalItems} đơn
                </p>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            )}

            <RentalBookingTable
                items={items}
                loading={loading}
                onAssign={handleAssign}
                onStatusChange={handleStatusChange}
                busyId={busyId}
                pagination={pagination}
                onPageChange={handlePageChange}
            />
        </div>
    );
}
