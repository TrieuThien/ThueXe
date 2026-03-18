import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    MapPinned,
    RefreshCw,
    Search,
    ShieldX,
    UsersRound,
} from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import {
    deleteDriverAccount,
    getDriverLocation,
    getDriverMeta,
    getDrivers,
    getDriverSummary,
    updateDriverAccountStatus,
} from "../../services/driverService";
import {
    buildDriverBookingHistoryDestination,
    buildDriverDetailPath,
} from "./driverNavigation";
import {
    buildDriverQueryParams,
    defaultDriverFilters,
    DRIVER_ACTIVATION_OPTIONS,
    DRIVER_DOCUMENT_STATUS_OPTIONS,
    DRIVER_LIST_LIMIT_OPTIONS,
    DRIVER_ONLINE_OPTIONS,
    DRIVER_SORT_OPTIONS,
    formatDriverActivationStatus,
    formatDriverAvailability,
    formatDriverDocumentStatus,
    validateDriverFilters,
} from "./driverFormUtils";

function formatMoney(amount, currencyCode = "VND") {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function FilterField({ label, error, children }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
            {children}
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
    );
}

function PaginationButton({ children, disabled, onClick }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </button>
    );
}

function ModalShell({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Đóng
                    </button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}

export default function DriverList() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const isAdmin = role === "admin";
    const [drivers, setDrivers] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [rides, setRides] = useState([]);
    const [draftFilters, setDraftFilters] = useState(defaultDriverFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultDriverFilters);
    const [filterErrors, setFilterErrors] = useState({});
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [summary, setSummary] = useState({ totalDrivers: 0, onlineDrivers: 0, pendingActivationDrivers: 0 });
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [metaLoading, setMetaLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionDriverId, setActionDriverId] = useState(null);
    const [trackingModal, setTrackingModal] = useState({ open: false, loading: false, driver: null, location: null, error: "" });
    const [deleteModal, setDeleteModal] = useState({ open: false, driver: null, password: "", loading: false, error: "" });

    const queryParams = useMemo(
        () => buildDriverQueryParams(appliedFilters, pagination.page),
        [appliedFilters, pagination.page]
    );

    async function loadMeta() {
        setMetaLoading(true);
        try {
            const data = await getDriverMeta();
            setRoutes(data.routes || []);
            setRides(data.rides || []);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được dữ liệu bộ lọc tài xế.");
        } finally {
            setMetaLoading(false);
        }
    }

    async function loadDrivers(params, successText = "") {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getDrivers(params);
            setDrivers(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || params.page || 1),
                limit: Number(data.pagination?.limit || params.limit || 10),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
            setTotalItems(Number(data.totalItems || 0));
            if (successText) setSuccessMessage(successText);
        } catch (error) {
            setDrivers([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách tài xế.");
        } finally {
            setLoading(false);
        }
    }

    async function loadSummary(params) {
        setSummaryLoading(true);
        try {
            const data = await getDriverSummary(params);
            setSummary({
                totalDrivers: Number(data.totalDrivers || 0),
                onlineDrivers: Number(data.onlineDrivers || 0),
                pendingActivationDrivers: Number(data.pendingActivationDrivers || 0),
            });
        } catch (error) {
            setSummary({ totalDrivers: 0, onlineDrivers: 0, pendingActivationDrivers: 0 });
            setErrorMessage((prev) => prev || error?.response?.data?.message || "Không tải được thống kê tài xế.");
        } finally {
            setSummaryLoading(false);
        }
    }

    useEffect(() => {
        loadMeta();
    }, []);

    useEffect(() => {
        loadDrivers(queryParams);
        loadSummary(queryParams);
    }, [queryParams]);

    function updateDraftFilter(name, value) {
        setDraftFilters((prev) => ({ ...prev, [name]: value }));
        setFilterErrors((prev) => ({ ...prev, [name]: "", rating_range: "", date_range: "" }));
        setSuccessMessage("");
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const nextErrors = validateDriverFilters(draftFilters);
        setFilterErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setErrorMessage("Vui lòng kiểm tra lại bộ lọc trước khi tìm kiếm.");
            return;
        }

        setPagination((prev) => ({ ...prev, page: 1 }));
        setAppliedFilters({ ...draftFilters });
        setErrorMessage("");
        setSuccessMessage("Đã áp dụng bộ lọc tài xế.");
    }

    function handleResetFilters() {
        setDraftFilters(defaultDriverFilters);
        setAppliedFilters(defaultDriverFilters);
        setFilterErrors({});
        setPagination((prev) => ({ ...prev, page: 1, limit: 10 }));
        setErrorMessage("");
        setSuccessMessage("Đã reset bộ lọc tài xế.");
    }

    function handlePageChange(nextPage) {
        if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) return;
        setPagination((prev) => ({ ...prev, page: nextPage }));
    }

    async function handleToggleAccount(driver) {
        if (!isAdmin) return;
        const nextStatus = Number(driver.account_active) === 1 ? 0 : 1;

        if (
            !window.confirm(
                `Bạn có chắc muốn ${nextStatus === 1 ? "mở khóa" : "khóa"} tài khoản cho ${driver.full_name}?`
            )
        ) {
            return;
        }

        setActionDriverId(driver.driver_id);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            await updateDriverAccountStatus(driver.driver_id, {
                driver_id: driver.driver_id,
                account_active: nextStatus,
            });

            await Promise.all([
                loadDrivers(
                    queryParams,
                    nextStatus === 1 ? "Đã mở khóa tài khoản tài xế." : "Đã khóa tài khoản tài xế."
                ),
                loadSummary(queryParams),
            ]);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái tài khoản.");
        } finally {
            setActionDriverId(null);
        }
    }

    async function openTrackingModal(driver) {
        setTrackingModal({ open: true, loading: true, driver, location: null, error: "" });
        try {
            const data = await getDriverLocation(driver.driver_id);
            setTrackingModal({ open: true, loading: false, driver, location: data.location || null, error: "" });
        } catch (error) {
            setTrackingModal({
                open: true,
                loading: false,
                driver,
                location: null,
                error: error?.response?.data?.message || "Không tải được vị trí tài xế.",
            });
        }
    }

    async function handleDeleteDriver() {
        if (!deleteModal.driver) return;
        setDeleteModal((prev) => ({ ...prev, loading: true, error: "" }));

        try {
            await deleteDriverAccount(deleteModal.driver.driver_id, {
                admin_password: deleteModal.password,
            });

            setDeleteModal({ open: false, driver: null, password: "", loading: false, error: "" });
            await Promise.all([
                loadDrivers(queryParams, "Đã xóa mềm tài khoản tài xế."),
                loadSummary(queryParams),
            ]);
        } catch (error) {
            setDeleteModal((prev) => ({
                ...prev,
                loading: false,
                error: error?.response?.data?.message || "Không thể xóa mềm tài khoản tài xế.",
            }));
        }
    }

    function renderActions(driver) {
        return (
            <div className="flex flex-wrap gap-2">
                <Link to={buildDriverDetailPath(role, driver.driver_id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    Xem
                </Link>
                <Link to={buildDriverBookingHistoryDestination(role, driver)} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50">
                    Lịch sử chuyến
                </Link>
                <button type="button" onClick={() => openTrackingModal(driver)} className="rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50">
                    Theo dõi
                </button>
                {isAdmin ? (
                    <>
                        <button type="button" onClick={() => handleToggleAccount(driver)} disabled={actionDriverId === driver.driver_id} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${Number(driver.account_active) === 1 ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                            {actionDriverId === driver.driver_id ? "Đang xử lý..." : Number(driver.account_active) === 1 ? "Khóa tài khoản" : "Mở khóa"}
                        </button>
                        <button type="button" onClick={() => setDeleteModal({ open: true, driver, password: "", loading: false, error: "" })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50">
                            Xóa mềm
                        </button>
                    </>
                ) : null}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Driver list</p>
                    <h1 className="mt-2 text-3xl font-bold">Danh sách tài xế</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Theo dõi tài xế theo thành phố, loại xe, hồ sơ, đánh giá và trạng thái online.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => { setSuccessMessage(""); loadDrivers(queryParams, "Đã tải lại danh sách tài xế."); loadSummary(queryParams); }} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                        <RefreshCw className="h-4 w-4" />
                        Tải lại
                    </button>
                    {isAdmin ? <Link to={buildRolePath(role, "driver/create")} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">Thêm tài xế</Link> : null}
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                {[{ label: "Tổng tài xế", value: summary.totalDrivers }, { label: "Tài xế online", value: summary.onlineDrivers }, { label: "Chờ kích hoạt", value: summary.pendingActivationDrivers }].map((item) => (
                    <article key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><UsersRound className="h-6 w-6" /></div>
                            <div>
                                <p className="text-sm text-slate-500">{item.label}</p>
                                {summaryLoading ? <div className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tính...</div> : <p className="mt-1 text-3xl font-bold text-slate-900">{item.value}</p>}
                            </div>
                        </div>
                    </article>
                ))}
            </section>

            <form onSubmit={handleApplyFilters} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><Search className="h-5 w-5" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Bộ lọc tài xế</h2>
                        <p className="text-sm text-slate-500">Lọc theo thành phố, loại xe, trạng thái hồ sơ và đánh giá.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <FilterField label="Thành phố hoạt động"><select value={draftFilters.reg_route_id} onChange={(event) => updateDraftFilter("reg_route_id", event.target.value)} disabled={metaLoading} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100"><option value="">{metaLoading ? "Đang tải..." : "Tất cả thành phố"}</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}</select></FilterField>
                    <FilterField label="Loại xe"><select value={draftFilters.ride_id} onChange={(event) => updateDraftFilter("ride_id", event.target.value)} disabled={metaLoading} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100"><option value="">{metaLoading ? "Đang tải..." : "Tất cả loại xe"}</option>{rides.map((ride) => <option key={ride.id} value={ride.id}>{ride.ride_type}</option>)}</select></FilterField>
                    <FilterField label="Kích hoạt"><select value={draftFilters.is_activated} onChange={(event) => updateDraftFilter("is_activated", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">{DRIVER_ACTIVATION_OPTIONS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select></FilterField>
                    <FilterField label="Trạng thái online"><select value={draftFilters.available} onChange={(event) => updateDraftFilter("available", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">{DRIVER_ONLINE_OPTIONS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select></FilterField>
                    <FilterField label="Từ ngày" error={filterErrors.date_range}><input type="date" value={draftFilters.date_from} onChange={(event) => updateDraftFilter("date_from", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" /></FilterField>
                    <FilterField label="Đến ngày"><input type="date" value={draftFilters.date_to} onChange={(event) => updateDraftFilter("date_to", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" /></FilterField>
                    <FilterField label="Đánh giá tối thiểu" error={filterErrors.rating_min}><input type="number" placeholder="0.0" min="0" max="5" step="0.1" value={draftFilters.rating_min} onChange={(event) => updateDraftFilter("rating_min", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" /></FilterField>
                    <FilterField label="Đánh giá tối đa" error={filterErrors.rating_max}><input type="number" placeholder="5.0" min="0" max="5" step="0.1" value={draftFilters.rating_max} onChange={(event) => updateDraftFilter("rating_max", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" /></FilterField>
                    <FilterField label="Tình trạng hồ sơ"><select value={draftFilters.document_status} onChange={(event) => updateDraftFilter("document_status", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">{DRIVER_DOCUMENT_STATUS_OPTIONS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select></FilterField>
                    <FilterField label="Tìm kiếm"><input type="text" value={draftFilters.search} onChange={(event) => updateDraftFilter("search", event.target.value)} placeholder="Tên, số điện thoại hoặc mã tài xế" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" /></FilterField>
                    <FilterField label="Sắp xếp theo"><select value={draftFilters.sort_by} onChange={(event) => updateDraftFilter("sort_by", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">{DRIVER_SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FilterField>
                    <FilterField label="Số bản ghi / trang"><select value={draftFilters.limit} onChange={(event) => updateDraftFilter("limit", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">{DRIVER_LIST_LIMIT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></FilterField>
                </div>

                {filterErrors.rating_range ? <p className="mt-4 text-sm text-red-600">{filterErrors.rating_range}</p> : null}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"><Search className="h-4 w-4" />Áp dụng bộ lọc</button>
                    <button type="button" onClick={handleResetFilters} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset bộ lọc</button>
                </div>
            </form>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMessage}</span></div></div> : null}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Danh sách tài xế</h2>
                </div>

                {loading ? <div className="flex min-h-72 items-center justify-center px-6 py-10 text-slate-600"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Đang tải danh sách tài xế...</div> : null}
                {!loading && drivers.length === 0 ? <div className="px-6 py-14 text-center text-sm text-slate-500">Không có tài xế nào phù hợp với bộ lọc hiện tại.</div> : null}
                {!loading && drivers.length > 0 ? (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                        <th className="px-6 py-4">STT</th>
                                        <th className="px-6 py-4">Tài xế</th>
                                        <th className="px-6 py-4">Thành phố</th>
                                        <th className="px-6 py-4">Hoạt động</th>
                                        <th className="px-6 py-4">Ví / xe</th>
                                        <th className="px-6 py-4">Ngày đăng ký</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {drivers.map((driver, index) => {
                                        const documentStatus = formatDriverDocumentStatus(driver.document_status);
                                        const availability = formatDriverAvailability(driver.available);
                                        return (
                                            <tr key={driver.driver_id} className="align-top">
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-700">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                                <td className="px-6 py-5"><div className="flex items-center gap-3">{driver.photo_file ? <img src={driver.photo_file} alt={driver.full_name} className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">{driver.firstname?.[0] || "D"}</div>}<div><p className="font-semibold text-slate-900">{driver.full_name}</p><p className="mt-1 text-xs text-slate-500">Driver #{driver.driver_id}</p><p className="mt-1 text-xs text-slate-500">{driver.ride_type || "--"}</p></div></div></td>
                                                <td className="px-6 py-5 text-sm text-slate-600">{driver.route_name || "--"}</td>
                                                <td className="px-6 py-5"><div className="space-y-2 text-xs"><span className={`inline-flex rounded-full px-3 py-1 font-semibold ${availability.className}`}>{availability.label}</span><span className={`inline-flex rounded-full px-3 py-1 font-semibold ${documentStatus.className}`}>{documentStatus.label}</span></div></td>
                                                <td className="px-6 py-5 text-sm text-slate-600"><p className="font-semibold text-slate-900">{formatMoney(driver.wallet_amount)}</p><p className="mt-1">{driver.car_model || "--"}</p><p className="mt-1 text-xs text-slate-500">{driver.driving_license_file ? "Có GPLX" : "Chưa có GPLX"}</p></td>
                                                <td className="px-6 py-5 text-sm text-slate-600">{formatDateTime(driver.account_create_date)}</td>
                                                <td className="px-6 py-5">{renderActions(driver)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-4 p-4 lg:hidden">
                            {drivers.map((driver) => {
                                const availability = formatDriverAvailability(driver.available);
                                const activation = formatDriverActivationStatus(driver.is_activated);
                                return (
                                    <article key={driver.driver_id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-start gap-4">
                                            {driver.photo_file ? <img src={driver.photo_file} alt={driver.full_name} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">{driver.firstname?.[0] || "D"}</div>}
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-bold text-slate-900">{driver.full_name}</h3>
                                                <p className="mt-1 text-sm text-slate-500">Driver #{driver.driver_id}</p>
                                                <div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${availability.className}`}>{availability.label}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${activation.className}`}>{activation.label}</span></div>
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600"><p>Thành phố: <span className="font-semibold text-slate-900">{driver.route_name || "--"}</span></p><p>Mẫu xe: <span className="font-semibold text-slate-900">{driver.car_model || "--"}</span></p><p>Ví: <span className="font-semibold text-slate-900">{formatMoney(driver.wallet_amount)}</span></p></div>
                                        <div className="mt-4">{renderActions(driver)}</div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                ) : null}

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span>{" • "}Tổng bản ghi: <span className="font-semibold text-slate-900">{totalItems}</span></p>
                    <div className="flex items-center gap-2"><PaginationButton disabled={pagination.page <= 1 || loading} onClick={() => handlePageChange(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></PaginationButton><PaginationButton disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages || loading} onClick={() => handlePageChange(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></PaginationButton></div>
                </div>
            </section>

            {trackingModal.open ? <ModalShell title={`Theo dõi tài xế #${trackingModal.driver?.driver_id || ""}`} onClose={() => setTrackingModal({ open: false, loading: false, driver: null, location: null, error: "" })}>{trackingModal.loading ? <div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Đang tải vị trí...</div> : trackingModal.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{trackingModal.error}</div> : trackingModal.location ? <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><p className="flex items-center gap-2 font-semibold text-slate-900"><MapPinned className="h-4 w-4" />{trackingModal.driver?.full_name}</p><p>Latitude: <span className="font-semibold">{trackingModal.location.lat}</span></p><p>Longitude: <span className="font-semibold">{trackingModal.location.long}</span></p><p>Thời gian cập nhật: <span className="font-semibold">{formatDateTime(trackingModal.location.location_date)}</span></p></div> : <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Chưa có dữ liệu vị trí mới nhất cho tài xế này.</div>}</ModalShell> : null}
            {deleteModal.open ? <ModalShell title={`Xóa mềm tài xế #${deleteModal.driver?.driver_id || ""}`} onClose={() => setDeleteModal({ open: false, driver: null, password: "", loading: false, error: "" })}><p className="text-sm text-slate-600">Nhập mật khẩu admin hiện tại để xác nhận xóa mềm tài khoản tài xế.</p><div className="mt-4"><label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu admin</label><input type="password" value={deleteModal.password} onChange={(event) => setDeleteModal((prev) => ({ ...prev, password: event.target.value, error: "" }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500" /></div>{deleteModal.error ? <p className="mt-3 text-sm text-red-600">{deleteModal.error}</p> : null}<div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={handleDeleteDriver} disabled={deleteModal.loading || !deleteModal.password.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">{deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}Xác nhận xóa mềm</button></div></ModalShell> : null}
        </div>
    );
}
