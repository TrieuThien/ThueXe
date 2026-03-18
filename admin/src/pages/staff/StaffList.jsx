import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
    Search,
    ShieldX,
    UsersRound,
} from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import { deleteStaffAccount, getRoutes, getStaff, getStaffSummary } from "../../services/staffService";
import {
    buildStaffQueryParams,
    defaultStaffFilters,
    STAFF_SORT_OPTIONS,
    validateStaffFilters,
} from "./staffFormUtils";
import { buildStaffDetailPath } from "./staffNavigation";

const activeTodayOptions = [
    { value: "", label: "Tất cả" },
    { value: "1", label: "Hoạt động hôm nay" },
    { value: "0", label: "Không hoạt động hôm nay" },
];

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
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đóng</button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}

export default function StaffList() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [items, setItems] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [draftFilters, setDraftFilters] = useState(defaultStaffFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultStaffFilters);
    const [filterErrors, setFilterErrors] = useState({});
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [summary, setSummary] = useState({ totalStaff: 0, activeTodayStaff: 0, roleSummary: { dispatcher: 0, admin: 0, biller: 0 } });
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [routesLoading, setRoutesLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModal, setDeleteModal] = useState({ open: false, staff: null, password: "", loading: false, error: "" });

    const queryParams = useMemo(
        () => buildStaffQueryParams(appliedFilters, pagination.page),
        [appliedFilters, pagination.page]
    );

    async function loadRoutes() {
        setRoutesLoading(true);
        try {
            setRoutes(await getRoutes());
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Khong tai duoc routes.");
        } finally {
            setRoutesLoading(false);
        }
    }

    async function loadList(params, successText = "") {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getStaff(params);
            setItems(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || params.page || 1),
                limit: Number(data.pagination?.limit || params.limit || 10),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
            setTotalItems(Number(data.totalItems || 0));
            if (successText) setSuccessMessage(successText);
        } catch (error) {
            setItems([]);
            setTotalItems(0);
            setPagination((prev) => ({ ...prev, totalPages: 0 }));
            setErrorMessage(error?.response?.data?.message || "Khong tai duoc danh sach nhan vien.");
        } finally {
            setLoading(false);
        }
    }

    async function loadSummary(params) {
        setSummaryLoading(true);
        try {
            const data = await getStaffSummary(params);
            setSummary({
                totalStaff: Number(data.totalStaff || 0),
                activeTodayStaff: Number(data.activeTodayStaff || 0),
                roleSummary: {
                    dispatcher: Number(data.roleSummary?.dispatcher || 0),
                    admin: Number(data.roleSummary?.admin || 0),
                    biller: Number(data.roleSummary?.biller || 0),
                },
            });
        } catch (error) {
            setSummary({ totalStaff: 0, activeTodayStaff: 0, roleSummary: { dispatcher: 0, admin: 0, biller: 0 } });
            setErrorMessage((prev) => prev || error?.response?.data?.message || "Khong tai duoc thong ke nhan vien.");
        } finally {
            setSummaryLoading(false);
        }
    }

    useEffect(() => {
        loadRoutes();
    }, []);

    useEffect(() => {
        loadList(queryParams);
        loadSummary(queryParams);
    }, [queryParams]);

    function updateDraftFilter(name, value) {
        setDraftFilters((prev) => ({ ...prev, [name]: value }));
        setFilterErrors((prev) => ({ ...prev, [name]: "", rating_range: "", date_range: "" }));
        setSuccessMessage("");
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const nextErrors = validateStaffFilters(draftFilters);
        setFilterErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setErrorMessage("Vui lòng kiểm tra lại bộ lọc.");
            return;
        }

        setPagination((prev) => ({ ...prev, page: 1 }));
        setAppliedFilters({ ...draftFilters });
        setErrorMessage("");
    }

    function handleResetFilters() {
        setDraftFilters(defaultStaffFilters);
        setAppliedFilters(defaultStaffFilters);
        setFilterErrors({});
        setPagination((prev) => ({ ...prev, page: 1, limit: 10 }));
        setErrorMessage("");
    }

    function handlePageChange(nextPage) {
        if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) return;
        setPagination((prev) => ({ ...prev, page: nextPage }));
        setSuccessMessage("");
    }

    async function handleDelete() {
        if (!deleteModal.staff) return;

        setDeleteModal((prev) => ({ ...prev, loading: true, error: "" }));
        try {
            await deleteStaffAccount(deleteModal.staff.user_id, { admin_password: deleteModal.password });
            setDeleteModal({ open: false, staff: null, password: "", loading: false, error: "" });
            await Promise.all([
                loadList(queryParams, "Đã xóa mềm nhân viên."),
                loadSummary(queryParams),
            ]);
        } catch (error) {
            setDeleteModal((prev) => ({
                ...prev,
                loading: false,
                error: error?.response?.data?.message || "Không thể xóa mềm tài khoản nhân viên.",
            }));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Staff list</p>
                    <h1 className="mt-2 text-3xl font-bold">Danh sách nhân viên</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Quản lý nhân viên có vai trò biller, dispatcher, admin.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => { setSuccessMessage(""); loadList(queryParams, "Đã tải lại danh sách nhân viên."); loadSummary(queryParams); }} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                        <RefreshCw className="h-4 w-4" />Tải lại
                    </button>
                    <Link to={buildRolePath(role, "staff/create")} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                        Thêm nhân viên
                    </Link>
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                {[{ label: "Tổng nhân viên", value: summary.totalStaff }, { label: "Hoạt động hôm nay", value: summary.activeTodayStaff }, { label: "Tổng bản ghi", value: totalItems }].map((item) => (
                    <article key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><UsersRound className="h-6 w-6" /></div>
                            <div>
                                <p className="text-sm text-slate-500">{item.label}</p>
                                {summaryLoading ? <div className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Dang tinh...</div> : <p className="mt-1 text-3xl font-bold text-slate-900">{item.value}</p>}
                            </div>
                        </div>
                    </article>
                ))}
            </section>

            <form onSubmit={handleApplyFilters} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><Search className="h-5 w-5" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Bộ lọc nhân viên</h2>
                        <p className="text-sm text-slate-500">Lọc theo thành phố, hoạt động hôm nay, đánh giá, ngày tạo và tìm theo mã/tên/sĐT.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Thành phố</label>
                        <select value={draftFilters.route_id} onChange={(event) => updateDraftFilter("route_id", event.target.value)} disabled={routesLoading} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100">
                            <option value="">{routesLoading ? "Đang tải..." : "Tất cả"}</option>
                            {routes.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Hoạt động hôm nay</label>
                        <select value={draftFilters.active_today} onChange={(event) => updateDraftFilter("active_today", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {activeTodayOptions.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Đánh giá tối thiểu</label>
                        <input type="number" placeholder="0.0" min="0" max="5" value={draftFilters.rating_min} onChange={(event) => updateDraftFilter("rating_min", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                        {filterErrors.rating_min ? <p className="mt-2 text-sm text-red-600">{filterErrors.rating_min}</p> : null}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Đánh giá tối đa</label>
                        <input type="number" placeholder="5.0" min="0" max="5" value={draftFilters.rating_max} onChange={(event) => updateDraftFilter("rating_max", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                        {filterErrors.rating_max ? <p className="mt-2 text-sm text-red-600">{filterErrors.rating_max}</p> : null}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tạo từ ngày</label>
                        <input type="date" value={draftFilters.date_from} onChange={(event) => updateDraftFilter("date_from", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Đến ngày</label>
                        <input type="date" value={draftFilters.date_to} onChange={(event) => updateDraftFilter("date_to", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                        {filterErrors.date_range ? <p className="mt-2 text-sm text-red-600">{filterErrors.date_range}</p> : null}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tìm kiếm</label>
                        <input type="text" value={draftFilters.search} onChange={(event) => updateDraftFilter("search", event.target.value)} placeholder="Mã, tên hoặc số điện thoại" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Sắp xếp</label>
                        <select value={draftFilters.sort_by} onChange={(event) => updateDraftFilter("sort_by", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {STAFF_SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                </div>

                {filterErrors.rating_range ? <p className="mt-4 text-sm text-red-600">{filterErrors.rating_range}</p> : null}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"><Search className="h-4 w-4" />Áp dụng bộ lọc</button>
                    <button type="button" onClick={handleResetFilters} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
                </div>
            </form>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMessage}</span></div></div> : null}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Danh sách nhân viên</h2>
                </div>

                {loading ? (
                    <div className="flex min-h-72 items-center justify-center px-6 py-10 text-slate-600"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Đang tải danh sách nhân viên...</div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-slate-500">Không có nhân viên nào phù hợp với bộ lọc hiện tại.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                    <th className="px-6 py-4">STT</th>
                                    <th className="px-6 py-4">Ảnh</th>
                                    <th className="px-6 py-4">Họ tên</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Số điện thoại</th>
                                    <th className="px-6 py-4">Số dư ví</th>
                                    <th className="px-6 py-4">Ngày tạo</th>
                                    <th className="px-6 py-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((staff, index) => (
                                    <tr key={staff.user_id} className="align-top">
                                        <td className="px-6 py-5 text-sm font-semibold text-slate-700">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                        <td className="px-6 py-5">{staff.photo_file ? <img src={staff.photo_file} alt={staff.full_name} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-600">{staff.firstname?.[0] || "S"}</div>}</td>
                                        <td className="px-6 py-5 text-sm text-slate-900"><p className="font-semibold">{staff.full_name}</p><p className="text-xs text-slate-500">#{staff.user_id} | {staff.role}</p></td>
                                        <td className="px-6 py-5 text-sm text-slate-600">{staff.email || "--"}</td>
                                        <td className="px-6 py-5 text-sm text-slate-600">{staff.phone || "--"}</td>
                                        <td className="px-6 py-5 text-sm font-semibold text-slate-900">{formatMoney(staff.wallet_amount)}</td>
                                        <td className="px-6 py-5 text-sm text-slate-600">{formatDateTime(staff.account_create_date)}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-nowrap gap-2">
                                                <Link to={buildStaffDetailPath(role, staff.user_id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Xem</Link>
                                                <button type="button" onClick={() => setDeleteModal({ open: true, staff, password: "", loading: false, error: "" })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50">Xóa mềm</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span></p>
                    <div className="flex items-center gap-2">
                        <PaginationButton disabled={pagination.page <= 1 || loading} onClick={() => handlePageChange(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></PaginationButton>
                        <PaginationButton disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages || loading} onClick={() => handlePageChange(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></PaginationButton>
                    </div>
                </div>
            </section>

            {deleteModal.open ? <ModalShell title={`Xóa mềm nhân viên #${deleteModal.staff?.user_id || ""}`} onClose={() => setDeleteModal({ open: false, staff: null, password: "", loading: false, error: "" })}><p className="text-sm text-slate-600">Nhập mật khẩu admin để xóa mềm tài khoản.</p><div className="mt-4"><label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu admin</label><input type="password" value={deleteModal.password} onChange={(event) => setDeleteModal((prev) => ({ ...prev, password: event.target.value, error: "" }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500" /></div>{deleteModal.error ? <p className="mt-3 text-sm text-red-600">{deleteModal.error}</p> : null}<div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={handleDelete} disabled={deleteModal.loading || !deleteModal.password.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">{deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}Xác nhận xóa mềm</button></div></ModalShell> : null}
        </div>
    );
}
