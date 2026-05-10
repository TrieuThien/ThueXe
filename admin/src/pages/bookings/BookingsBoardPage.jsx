import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import BookingFilters from "../../components/bookings/BookingFilters";
import BookingTable from "../../components/bookings/BookingTable";
import { useBookingFilters } from "../../hooks/useBookingFilters";
import { BOOKING_STATUS_OPTIONS, getStatusLabel } from "../../types/bookingTypes";
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
    const [statusModal, setStatusModal] = useState(null);
    const [statusForm, setStatusForm] = useState({ status: "0", cancel_comment: "" });
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
    const [summary, setSummary] = useState({ immediate_count: 0, scheduled_count: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [assignModal, setAssignModal] = useState(null);
    const [assignForm, setAssignForm] = useState({ driver_id: "", driverList: [] });
    const [assignModalLoading, setAssignModalLoading] = useState(false);

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
        setAssignModalLoading(true);

        try {
            const drivers = await getAssignableDrivers({
                route_id: item.route_id || undefined,
                ride_id: item.ride_id || undefined,
                limit: 15,
            });

            setAssignModal(item);
            setAssignForm({
                driver_id: item.driver_id ? String(item.driver_id) : "",
                driverList: drivers.items || [],
            });
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể tải danh sách tài xế.");
        } finally {
            setAssignModalLoading(false);
            setBusyId(null);
        }
    }

    function handleCloseAssignModal() {
        if (assignModalLoading) return;
        setAssignModal(null);
        setAssignForm({ driver_id: "", driverList: [] });
    }

    async function handleSubmitAssignModal(event) {
        event.preventDefault();
        if (!assignModal) return;

        const parsedDriverId = Number(assignForm.driver_id);
        if (!Number.isInteger(parsedDriverId) || parsedDriverId < 1) {
            setErrorMessage("Mã tài xế không hợp lệ");
            return;
        }

        setBusyId(assignModal.id);
        setErrorMessage("");
        setSuccessMessage("");
        setAssignModalLoading(true);

        try {
            await assignDriver(assignModal.id, parsedDriverId);
            setSuccessMessage(`Đã gán tài xế #${parsedDriverId} cho booking #${assignModal.id}.`);
            handleCloseAssignModal();
            await loadData();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể gán tài xế.");
        } finally {
            setAssignModalLoading(false);
            setBusyId(null);
        }
    }

    function handleStatusChange(item) {
        setStatusModal(item);
        setStatusForm({
            status: String(item.status ?? 0),
            cancel_comment: item.cancel_comment || "",
        });
    }

    function handleCloseStatusModal() {
        if (busyId) return;
        setStatusModal(null);
        setStatusForm({ status: "0", cancel_comment: "" });
    }

    async function handleSubmitStatusModal(event) {
        event.preventDefault();
        if (!statusModal) return;

        setBusyId(statusModal.id);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const parsedStatus = Number(statusForm.status);
            const note = statusForm.cancel_comment.trim();

            await updateBookingStatus(statusModal.id, {
                status: parsedStatus,
                cancel_comment: note || undefined,
            });

            setSuccessMessage(`Đã cập nhật trạng thái booking #${statusModal.id} thành ${getStatusLabel(parsedStatus)}.`);
            handleCloseStatusModal();
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

            {statusModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">Cập nhật trạng thái booking #{statusModal.id}</h2>
                        <p className="mt-1 text-sm text-slate-500">Chọn trạng thái mới và nhập ghi chú nếu cần.</p>

                        <form className="mt-4 space-y-4" onSubmit={handleSubmitStatusModal}>
                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</span>
                                <select
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    value={statusForm.status}
                                    onChange={(event) =>
                                        setStatusForm((prev) => ({ ...prev, status: event.target.value }))
                                    }
                                >
                                    {BOOKING_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.value} - {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Lý do / Ghi chú</span>
                                <textarea
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Nhập ghi chú (nếu có)"
                                    value={statusForm.cancel_comment}
                                    onChange={(event) =>
                                        setStatusForm((prev) => ({ ...prev, cancel_comment: event.target.value }))
                                    }
                                />
                            </label>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleCloseStatusModal}
                                    disabled={busyId === statusModal.id}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={busyId === statusModal.id}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {busyId === statusModal.id ? "Đang cập nhật..." : "Lưu trạng thái"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {assignModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">Gán tài xế cho booking #{assignModal.id}</h2>
                        <p className="mt-1 text-sm text-slate-500">Chọn tài xế từ danh sách hoặc nhập mã tài xế trực tiếp.</p>

                        <form className="mt-4 space-y-4" onSubmit={handleSubmitAssignModal}>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Danh sách tài xế có sẵn</label>
                                {assignForm.driverList.length > 0 ? (
                                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        {assignForm.driverList.map((driver) => (
                                            <button
                                                key={driver.driver_id}
                                                type="button"
                                                onClick={() =>
                                                    setAssignForm((prev) => ({
                                                        ...prev,
                                                        driver_id: String(driver.driver_id),
                                                    }))
                                                }
                                                className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-all ${assignForm.driver_id === String(driver.driver_id)
                                                        ? "border-indigo-500 bg-indigo-50"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                            >
                                                <p className="font-semibold text-slate-900">
                                                    #{driver.driver_id}: {driver.full_name}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {driver.phone || "--"} {driver.vehicle_number ? `• ${driver.vehicle_number}` : ""}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
                                        Không có tài xế phù hợp
                                    </div>
                                )}
                            </div>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Hoặc nhập mã tài xế</span>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Nhập mã tài xế..."
                                    value={assignForm.driver_id}
                                    onChange={(event) =>
                                        setAssignForm((prev) => ({
                                            ...prev,
                                            driver_id: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleCloseAssignModal}
                                    disabled={assignModalLoading}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignModalLoading || !assignForm.driver_id}
                                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {assignModalLoading ? "Đang gán..." : "Gán tài xế"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
