import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, ShieldX, UsersRound } from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import { deleteVehicleOwnerAccount, getVehicleOwnerMeta, getVehicleOwners, getVehicleOwnerSummary, updateVehicleOwnerAccountStatus } from "../../services/vehicleOwnerService";
import { buildVehicleOwnerDetailPath, buildVehicleOwnerEditPath } from "./vehicleOwnerNavigation";
import { buildVehicleOwnerQueryParams, defaultVehicleOwnerFilters, formatVehicleOwnerAccountStatus, formatVehicleOwnerActivationStatus, formatVehicleOwnerVerificationStatus, OWNER_ACCOUNT_ACTIVE_OPTIONS, OWNER_ACTIVATION_OPTIONS, OWNER_LIST_LIMIT_OPTIONS, OWNER_SORT_OPTIONS, OWNER_VERIFICATION_OPTIONS, validateVehicleOwnerFilters } from "./vehicleOwnerFormUtils";

function formatMoney(amount, currencyCode = "VND") {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(Number(amount || 0));
}

function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
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
        <button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
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

export default function VehicleOwnerList() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [owners, setOwners] = useState([]);
    const [draftFilters, setDraftFilters] = useState(defaultVehicleOwnerFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultVehicleOwnerFilters);
    const [filterErrors, setFilterErrors] = useState({});
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [summary, setSummary] = useState({ totalOwners: 0, activeOwners: 0, pendingVerificationOwners: 0, verifiedOwners: 0 });
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionOwnerId, setActionOwnerId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, owner: null, loading: false, error: "" });

    const queryParams = useMemo(() => buildVehicleOwnerQueryParams(appliedFilters, pagination.page), [appliedFilters, pagination.page]);

    async function loadOwners(params, successText = "") {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getVehicleOwners(params);
            setOwners(data.items || []);
            setPagination((prev) => ({ ...prev, page: Number(data.pagination?.page || params.page || 1), limit: Number(data.pagination?.limit || params.limit || 10), totalPages: Number(data.pagination?.totalPages || 0) }));
            setTotalItems(Number(data.totalItems || 0));
            if (successText) setSuccessMessage(successText);
        } catch (error) {
            setOwners([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách chủ xe.");
        } finally {
            setLoading(false);
        }
    }

    async function loadSummary(params) {
        setSummaryLoading(true);
        try {
            const data = await getVehicleOwnerSummary(params);
            setSummary({
                totalOwners: Number(data.totalOwners || 0),
                activeOwners: Number(data.activeOwners || 0),
                pendingVerificationOwners: Number(data.pendingVerificationOwners || 0),
                verifiedOwners: Number(data.verifiedOwners || 0),
            });
        } catch (error) {
            setSummary({ totalOwners: 0, activeOwners: 0, pendingVerificationOwners: 0, verifiedOwners: 0 });
            setErrorMessage((prev) => prev || error?.response?.data?.message || "Không tải được thống kê chủ xe.");
        } finally {
            setSummaryLoading(false);
        }
    }

    useEffect(() => {
        getVehicleOwnerMeta().catch(() => null);
    }, []);

    useEffect(() => {
        loadOwners(queryParams);
        loadSummary(queryParams);
    }, [queryParams]);

    function updateDraftFilter(name, value) {
        setDraftFilters((prev) => ({ ...prev, [name]: value }));
        setFilterErrors((prev) => ({ ...prev, [name]: "", date_range: "" }));
        setSuccessMessage("");
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const nextErrors = validateVehicleOwnerFilters(draftFilters);
        setFilterErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setErrorMessage("Vui lòng kiểm tra lại bộ lọc trước khi tìm kiếm.");
            return;
        }
        setPagination((prev) => ({ ...prev, page: 1 }));
        setAppliedFilters({ ...draftFilters });
        setErrorMessage("");
        setSuccessMessage("Đã áp dụng bộ lọc chủ xe.");
    }

    function handleResetFilters() {
        setDraftFilters(defaultVehicleOwnerFilters);
        setAppliedFilters(defaultVehicleOwnerFilters);
        setFilterErrors({});
        setPagination((prev) => ({ ...prev, page: 1, limit: 10 }));
        setErrorMessage("");
        setSuccessMessage("Đã reset bộ lọc chủ xe.");
    }

    function handlePageChange(nextPage) {
        if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) return;
        setPagination((prev) => ({ ...prev, page: nextPage }));
    }

    async function handleToggleAccount(owner) {
        const nextStatus = Number(owner.account_active) === 1 ? 0 : 1;
        if (!window.confirm(`Bạn có chắc muốn ${nextStatus === 1 ? "mở khóa" : "khóa"} tài khoản cho ${owner.fullname}?`)) return;
        setActionOwnerId(owner.owner_id);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            await updateVehicleOwnerAccountStatus(owner.owner_id, { owner_id: owner.owner_id, account_active: nextStatus, status: nextStatus });
            await Promise.all([loadOwners(queryParams, nextStatus === 1 ? "Đã mở khóa tài khoản chủ xe." : "Đã khóa tài khoản chủ xe."), loadSummary(queryParams)]);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái tài khoản.");
        } finally {
            setActionOwnerId(null);
        }
    }

    async function handleDeleteOwner() {
        if (!deleteModal.owner) return;
        setDeleteModal((prev) => ({ ...prev, loading: true, error: "" }));
        try {
            await deleteVehicleOwnerAccount(deleteModal.owner.owner_id, { owner_id: deleteModal.owner.owner_id });
            setDeleteModal({ open: false, owner: null, loading: false, error: "" });
            await Promise.all([loadOwners(queryParams, "Đã xóa mềm tài khoản chủ xe."), loadSummary(queryParams)]);
        } catch (error) {
            setDeleteModal((prev) => ({ ...prev, loading: false, error: error?.response?.data?.message || "Không thể xóa mềm tài khoản chủ xe." }));
        }
    }

    function renderActions(owner) {
        return (
            <div className="flex flex-wrap gap-2">
                <Link to={buildVehicleOwnerDetailPath(role, owner.owner_id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Xem</Link>
                <Link to={buildVehicleOwnerEditPath(role, owner.owner_id)} className="rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50">Sửa</Link>
                <button type="button" onClick={() => handleToggleAccount(owner)} disabled={actionOwnerId === owner.owner_id} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${Number(owner.account_active) === 1 ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                    {actionOwnerId === owner.owner_id ? "Đang xử lý..." : Number(owner.account_active) === 1 ? "Khóa" : "Mở khóa"}
                </button>
                <button type="button" onClick={() => setDeleteModal({ open: true, owner, loading: false, error: "" })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50">Xóa mềm</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Vehicle owner list</p>
                    <h1 className="mt-2 text-3xl font-bold">Danh sách chủ xe</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Theo dõi trạng thái xác minh, trạng thái tài khoản và thông tin ví của đối tác chủ xe.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => { setSuccessMessage(""); loadOwners(queryParams, "Đã tải lại danh sách chủ xe."); loadSummary(queryParams); }} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><RefreshCw className="h-4 w-4" />Tải lại</button>
                    <Link to={buildRolePath(role, "vehicle-owner/create")} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">Thêm chủ xe</Link>
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "Tổng chủ xe", value: summary.totalOwners },
                    { label: "Đang hoạt động", value: summary.activeOwners },
                    { label: "Chờ xác minh", value: summary.pendingVerificationOwners },
                    { label: "Đã xác minh", value: summary.verifiedOwners },
                ].map((item) => (
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
                        <h2 className="text-lg font-bold text-slate-900">Bộ lọc chủ xe</h2>
                        <p className="text-sm text-slate-500">Lọc theo xác minh, trạng thái tài khoản, kích hoạt và thời gian tạo.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <FilterField label="Tìm kiếm">
                        <input type="text" value={draftFilters.search} onChange={(event) => updateDraftFilter("search", event.target.value)} placeholder="Tên, điện thoại, email hoặc mã chủ xe" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Xác minh">
                        <select value={draftFilters.verification_status} onChange={(event) => updateDraftFilter("verification_status", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {OWNER_VERIFICATION_OPTIONS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Trạng thái tài khoản">
                        <select value={draftFilters.account_active} onChange={(event) => updateDraftFilter("account_active", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {OWNER_ACCOUNT_ACTIVE_OPTIONS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Kích hoạt">
                        <select value={draftFilters.is_activated} onChange={(event) => updateDraftFilter("is_activated", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {OWNER_ACTIVATION_OPTIONS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Từ ngày" error={filterErrors.date_range}>
                        <input type="date" value={draftFilters.date_from} onChange={(event) => updateDraftFilter("date_from", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Đến ngày">
                        <input type="date" value={draftFilters.date_to} onChange={(event) => updateDraftFilter("date_to", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Sắp xếp theo">
                        <select value={draftFilters.sort_by} onChange={(event) => updateDraftFilter("sort_by", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {OWNER_SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Số bản ghi / trang">
                        <select value={draftFilters.limit} onChange={(event) => updateDraftFilter("limit", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {OWNER_LIST_LIMIT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </FilterField>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"><Search className="h-4 w-4" />Áp dụng bộ lọc</button>
                    <button type="button" onClick={handleResetFilters} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset bộ lọc</button>
                </div>
            </form>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMessage}</span></div></div> : null}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-lg font-bold text-slate-900">Danh sách chủ xe</h2></div>
                {loading ? <div className="flex min-h-72 items-center justify-center px-6 py-10 text-slate-600"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Đang tải danh sách chủ xe...</div> : null}
                {!loading && owners.length === 0 ? <div className="px-6 py-14 text-center text-sm text-slate-500">Không có chủ xe nào phù hợp với bộ lọc hiện tại.</div> : null}
                {!loading && owners.length > 0 ? (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                        <th className="px-6 py-4">STT</th>
                                        <th className="px-6 py-4">Chủ xe</th>
                                        <th className="px-6 py-4">Xác minh</th>
                                        <th className="px-6 py-4">Kích hoạt / tài khoản</th>
                                        <th className="px-6 py-4">Hoa hồng / ví</th>
                                        <th className="px-6 py-4">Ngày tạo</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {owners.map((owner, index) => {
                                        const verification = formatVehicleOwnerVerificationStatus(owner.verification_status);
                                        const account = formatVehicleOwnerAccountStatus(owner.account_active);
                                        const activation = formatVehicleOwnerActivationStatus(owner.is_activated);
                                        return (
                                            <tr key={owner.owner_id} className="align-top">
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-700">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                                <td className="px-6 py-5"><div><p className="font-semibold text-slate-900">{owner.fullname}</p><p className="mt-1 text-xs text-slate-500">Owner #{owner.owner_id}</p><p className="mt-1 text-xs text-slate-500">{owner.phone || "--"}</p><p className="mt-1 text-xs text-slate-500">{owner.email || "--"}</p></div></td>
                                                <td className="px-6 py-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${verification.className}`}>{verification.label}</span></td>
                                                <td className="px-6 py-5"><div className="space-y-2 text-xs"><span className={`inline-flex rounded-full px-3 py-1 font-semibold ${activation.className}`}>{activation.label}</span><span className={`inline-flex rounded-full px-3 py-1 font-semibold ${account.className}`}>{account.label}</span></div></td>
                                                <td className="px-6 py-5 text-sm text-slate-600"><p className="font-semibold text-slate-900">{Number(owner.commission_rate || 0)}%</p><p className="mt-1">{formatMoney(owner.wallet_balance)}</p></td>
                                                <td className="px-6 py-5 text-sm text-slate-600">{formatDateTime(owner.date_created)}</td>
                                                <td className="px-6 py-5">{renderActions(owner)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-4 p-4 lg:hidden">
                            {owners.map((owner) => {
                                const verification = formatVehicleOwnerVerificationStatus(owner.verification_status);
                                const account = formatVehicleOwnerAccountStatus(owner.account_active);
                                return (
                                    <article key={owner.owner_id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base font-bold text-slate-900">{owner.fullname}</h3>
                                            <p className="mt-1 text-sm text-slate-500">Owner #{owner.owner_id}</p>
                                            <p className="mt-1 text-sm text-slate-500">{owner.phone || "--"}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verification.className}`}>{verification.label}</span>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${account.className}`}>{account.label}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                                            <p>Hoa hồng: <span className="font-semibold text-slate-900">{Number(owner.commission_rate || 0)}%</span></p>
                                            <p>Ví: <span className="font-semibold text-slate-900">{formatMoney(owner.wallet_balance)}</span></p>
                                        </div>
                                        <div className="mt-4">{renderActions(owner)}</div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                ) : null}

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span> {" • "}Tổng bản ghi: <span className="font-semibold text-slate-900">{totalItems}</span></p>
                    <div className="flex items-center gap-2">
                        <PaginationButton disabled={pagination.page <= 1 || loading} onClick={() => handlePageChange(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></PaginationButton>
                        <PaginationButton disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages || loading} onClick={() => handlePageChange(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></PaginationButton>
                    </div>
                </div>
            </section>

            {deleteModal.open ? (
                <ModalShell title={`Xóa mềm chủ xe #${deleteModal.owner?.owner_id || ""}`} onClose={() => setDeleteModal({ open: false, owner: null, loading: false, error: "" })}>
                    <p className="text-sm text-slate-600">Hành động này sẽ đặt trạng thái tài khoản chủ xe sang đã xóa mềm.</p>
                    {deleteModal.error ? <p className="mt-3 text-sm text-red-600">{deleteModal.error}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={handleDeleteOwner} disabled={deleteModal.loading} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                            {deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                            Xác nhận xóa mềm
                        </button>
                    </div>
                </ModalShell>
            ) : null}
        </div>
    );
}
