import { useEffect, useState } from "react";
import { getRentalBookings } from "../../services/rentalBookingService";
import RentalBookingStatusModal from "../../components/rental-bookings/RentalBookingStatusModal";
import RentalBookingDetailModal from "../../components/rental-bookings/RentalBookingDetailModal";

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "scheduled", label: "Đã lên lịch" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "in_progress", label: "Đang thực hiện" },
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
];

const STATUS_LABEL = {
    scheduled: "Đã lên lịch",
    pending: "Chờ xử lý",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
};

const STATUS_CLASS = {
    scheduled: "bg-yellow-100 text-yellow-700",
    pending: "bg-orange-100 text-orange-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
};

const SERVICE_TYPE_LABEL = { 1: "Thuê xe", 3: "Xe + tài xế" };
const SERVICE_TYPE_CLASS = {
    1: "bg-emerald-100 text-emerald-700",
    3: "bg-purple-100 text-purple-700",
};

function formatCurrency(amount) {
    if (!amount && amount !== 0) return "—";
    return Number(amount).toLocaleString("vi-VN") + "đ";
}

function formatDatetime(val) {
    if (!val) return "—";
    return new Date(val).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

const DEFAULT_FILTERS = { search: "", status: "", page: 1, limit: 15 };

export default function RentalCarBookingListPage() {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [statusModal, setStatusModal] = useState(null); // booking item or null
    const [detailModal, setDetailModal] = useState(null); // rental_id or null

    const buildParams = (f) => {
        const p = { service_types: "1,3", page: f.page, limit: f.limit };
        if (f.status) p.status = f.status;
        if (f.search.trim()) p.search = f.search.trim();
        return p;
    };

    async function loadData(f = filters) {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getRentalBookings(buildParams(f));
            setItems(data.items || []);
            setPagination(data.pagination || { page: 1, totalPages: 0, total: 0 });
        } catch (err) {
            setItems([]);
            setErrorMessage(err?.response?.data?.message || "Không thể tải danh sách đơn thuê xe.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page]);

    function handleApply(e) {
        e.preventDefault();
        const next = { ...filters, page: 1 };
        setFilters(next);
        loadData(next);
    }

    function handleReset() {
        setFilters(DEFAULT_FILTERS);
        loadData(DEFAULT_FILTERS);
    }

    const inProgressCount = items.filter((i) => i.status === "in_progress").length;
    const completedCount = items.filter((i) => i.status === "completed").length;

    return (
        <div className="space-y-5">
            <section className="rounded-[24px] bg-gradient-to-r from-slate-950 via-purple-900 to-indigo-900 px-6 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-purple-200">Quản lý</p>
                <h1 className="mt-2 text-3xl font-bold">Đơn Thuê Xe</h1>
                <p className="mt-2 text-sm text-slate-200">Theo dõi và xử lý các đơn thuê xe (không tài xế và có tài xế).</p>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500">Tổng đơn</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{pagination.total}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase text-blue-700">Đang thực hiện</p>
                    <p className="mt-2 text-2xl font-bold text-blue-800">{inProgressCount}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Hoàn thành</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{completedCount}</p>
                </div>
            </section>

            {/* Filters */}
            <form
                onSubmit={handleApply}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Bộ lọc</p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Tìm kiếm
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                            placeholder="Tên KH, SĐT, mã đơn, địa chỉ..."
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Trạng thái
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-3 flex gap-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Lọc
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={loading}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Đặt lại
                    </button>
                    <button
                        type="button"
                        onClick={() => loadData(filters)}
                        disabled={loading}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Tải lại
                    </button>
                </div>
            </form>

            <p className="text-sm text-slate-500">
                Trang {pagination.page} / {pagination.totalPages || 1} — {pagination.total} đơn
            </p>

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

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">Đang tải...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Mã đơn</th>
                                    <th className="px-4 py-3">Loại</th>
                                    <th className="px-4 py-3">Khách hàng</th>
                                    <th className="px-4 py-3">Biển số xe</th>
                                    <th className="px-4 py-3">Thời gian</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Giá</th>
                                    <th className="px-4 py-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                                            Không có đơn thuê xe nào.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        return (
                                            <tr
                                                key={item.rental_id}
                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-slate-600">
                                                        {item.rental_code || `#${item.rental_id}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SERVICE_TYPE_CLASS[item.service_type] || "bg-slate-100 text-slate-600"}`}>
                                                        {SERVICE_TYPE_LABEL[item.service_type] || `Type ${item.service_type}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800">{item.user_name || "—"}</p>
                                                    <p className="text-xs text-slate-400">{item.user_phone || ""}</p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {item.license_plate || <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    <p className="text-xs">{formatDatetime(item.start_datetime)}</p>
                                                    {item.end_datetime && (
                                                        <p className="text-xs text-slate-400">→ {formatDatetime(item.end_datetime)}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[item.status] || "bg-slate-100 text-slate-600"}`}>
                                                        {STATUS_LABEL[item.status] || item.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-800">
                                                    {formatCurrency(item.total_price)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailModal(item.rental_id)}
                                                            className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                                        >
                                                            Chi tiết
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setStatusModal(item)}
                                                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Cập nhật trạng thái
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                        <p className="text-xs text-slate-500">
                            Trang {pagination.page} / {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                                disabled={pagination.page <= 1}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <RentalBookingDetailModal
                open={detailModal !== null}
                rentalId={detailModal}
                onClose={() => setDetailModal(null)}
            />

            <RentalBookingStatusModal
                open={statusModal !== null}
                booking={statusModal}
                onClose={() => setStatusModal(null)}
                onSuccess={() => {
                    setSuccessMessage(`Đã cập nhật trạng thái đơn #${statusModal?.rental_id}.`);
                    loadData(filters);
                }}
            />
        </div>
    );
}
