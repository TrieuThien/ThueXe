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
    UsersRound,
} from "lucide-react";
import {
    getCustomerSummary,
    getCustomers,
    getRoutes,
    updateCustomerAccountStatus,
} from "../../services/customerService";
import { buildRolePath } from "../../config/roleRoutes";
import {
    buildBookingCreateDestination,
    buildBookingCreateState,
    buildBookingHistoryDestination,
    buildCustomerDetailPath,
} from "./customerNavigation";

const defaultFilters = {
    route_id: "",
    account_active: "",
    is_activated: "",
    document_status: "",
    rating_min: "",
    rating_max: "",
    date_from: "",
    date_to: "",
    search: "",
    sort_by: "account_create_date",
    sort_order: "DESC",
    limit: "10",
};

const documentStatusOptions = [
    { value: "", label: "Tất cả hồ sơ" },
    { value: "no_documents", label: "Chưa có hồ sơ" },
    { value: "pending", label: "Đang chờ duyệt" },
    { value: "failed", label: "Không đạt" },
    { value: "expired", label: "Hết hạn" },
    { value: "approved", label: "Đã duyệt" },
];

const accountActiveOptions = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "1", label: "Đang hoạt động" },
    { value: "0", label: "Đang khóa" },
];

const activationOptions = [
    { value: "", label: "Tất cả kích hoạt" },
    { value: "1", label: "Đã kích hoạt" },
    { value: "0", label: "Chưa kích hoạt" },
];

const sortByOptions = [
    { value: "account_create_date", label: "Ngày tạo" },
    { value: "firstname", label: "Họ" },
    { value: "user_rating", label: "Đánh giá" },
    { value: "wallet_amount", label: "Ví" },
    { value: "user_id", label: "Mã khách hàng" },
];

function buildQueryParams(filters, page) {
    return {
        page,
        limit: Number(filters.limit) || 10,
        route_id: filters.route_id || undefined,
        account_active: filters.account_active || undefined,
        is_activated: filters.is_activated || undefined,
        document_status: filters.document_status || undefined,
        rating_min: filters.rating_min || undefined,
        rating_max: filters.rating_max || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        search: filters.search.trim() || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
    };
}

function validateFilters(filters) {
    const errors = {};
    const ratingMin = filters.rating_min === "" ? null : Number(filters.rating_min);
    const ratingMax = filters.rating_max === "" ? null : Number(filters.rating_max);

    if (filters.rating_min !== "" && (Number.isNaN(ratingMin) || ratingMin < 0 || ratingMin > 5)) {
        errors.rating_min = "Đánh giá tối thiểu phải từ 0 đến 5.";
    }

    if (filters.rating_max !== "" && (Number.isNaN(ratingMax) || ratingMax < 0 || ratingMax > 5)) {
        errors.rating_max = "Đánh giá tối đa phải từ 0 đến 5.";
    }

    if (ratingMin !== null && ratingMax !== null && ratingMin > ratingMax) {
        errors.rating_range = "Đánh giá tối thiểu không được lớn hơn đánh giá tối đa.";
    }

    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
        errors.date_range = "Ngày bắt đầu không được lớn hơn ngày kết thúc.";
    }

    return errors;
}

function formatDocumentStatus(value) {
    const map = {
        no_documents: { label: "Chưa có hồ sơ", className: "bg-slate-200 text-slate-700" },
        pending: { label: "Đang chờ duyệt", className: "bg-amber-100 text-amber-700" },
        failed: { label: "Không đạt", className: "bg-rose-100 text-rose-700" },
        expired: { label: "Hết hạn", className: "bg-orange-100 text-orange-700" },
        approved: { label: "Đã duyệt", className: "bg-emerald-100 text-emerald-700" },
    };

    return map[value] || map.no_documents;
}

function formatMoney(amount, currencyCode = "VND") {
    const numericAmount = Number(amount || 0);

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(Number.isNaN(numericAmount) ? 0 : numericAmount);
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

export default function CustomerList() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [customers, setCustomers] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [draftFilters, setDraftFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
    const [filterErrors, setFilterErrors] = useState({});
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [routesLoading, setRoutesLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionUserId, setActionUserId] = useState(null);

    const queryParams = useMemo(
        () => buildQueryParams(appliedFilters, pagination.page),
        [appliedFilters, pagination.page]
    );

    async function loadRoutes() {
        setRoutesLoading(true);
        try {
            setRoutes(await getRoutes());
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách khu vực.");
        } finally {
            setRoutesLoading(false);
        }
    }

    async function loadCustomers(params, successText = "") {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getCustomers(params);
            setCustomers(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || params.page || 1),
                limit: Number(data.pagination?.limit || params.limit || 10),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
            setTotalItems(Number(data.totalItems || 0));
            if (successText) setSuccessMessage(successText);
        } catch (error) {
            setCustomers([]);
            setTotalItems(0);
            setPagination((prev) => ({ ...prev, totalPages: 0 }));
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách khách hàng.");
        } finally {
            setLoading(false);
        }
    }

    async function loadSummary(params) {
        setSummaryLoading(true);
        try {
            const data = await getCustomerSummary(params);
            setTotalCustomers(Number(data.totalCustomers || 0));
        } catch (error) {
            setTotalCustomers(0);
            setErrorMessage((prev) => prev || error?.response?.data?.message || "Không tải được tổng số khách hàng.");
        } finally {
            setSummaryLoading(false);
        }
    }

    useEffect(() => {
        loadRoutes();
    }, []);

    useEffect(() => {
        loadCustomers(queryParams);
        loadSummary(queryParams);
    }, [queryParams]);

    function updateDraftFilter(name, value) {
        setDraftFilters((prev) => ({ ...prev, [name]: value }));
        setFilterErrors((prev) => ({ ...prev, [name]: "", rating_range: "", date_range: "" }));
        setSuccessMessage("");
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const nextErrors = validateFilters(draftFilters);
        setFilterErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setErrorMessage("Vui lòng kiểm tra lại bộ lọc trước khi tìm kiếm.");
            return;
        }
        setPagination((prev) => ({ ...prev, page: 1 }));
        setAppliedFilters({ ...draftFilters });
        setErrorMessage("");
        setSuccessMessage("Đã áp dụng bộ lọc khách hàng.");
    }

    function handleResetFilters() {
        setDraftFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        setFilterErrors({});
        setPagination((prev) => ({ ...prev, page: 1, limit: 10 }));
        setErrorMessage("");
        setSuccessMessage("Đã reset bộ lọc khách hàng.");
    }

    function handlePageChange(nextPage) {
        if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) return;
        setPagination((prev) => ({ ...prev, page: nextPage }));
        setSuccessMessage("");
    }

    function handleRefresh() {
        setSuccessMessage("");
        loadCustomers(queryParams, "Đã tải lại danh sách khách hàng.");
        loadSummary(queryParams);
    }

    async function handleToggleAccount(customer) {
        const customerUserId = Number(customer?.user_id);

        if (!Number.isInteger(customerUserId) || customerUserId < 1) {
            console.error("Missing or invalid customer.user_id when toggling account status:", customer);
            setErrorMessage("Không tìm thấy mã khách hàng hợp lệ để cập nhật trạng thái tài khoản.");
            return;
        }

        const nextAccountActive = Number(customer.account_active) === 1 ? 0 : 1;
        if (!window.confirm(`Bạn có chắc muốn ${nextAccountActive === 1 ? "mở khóa" : "khóa"} tài khoản cho ${customer.full_name}?`)) {
            return;
        }

        setActionUserId(customerUserId);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            await updateCustomerAccountStatus(customerUserId, {
                user_id: customerUserId,
                account_active: nextAccountActive,
            });

            const message = nextAccountActive === 1 ? "Đã mở khóa tài khoản khách hàng." : "Đã khóa tài khoản khách hàng.";
            await Promise.all([loadCustomers(queryParams, message), loadSummary(queryParams)]);
        } catch (error) {
            console.error("Failed to update customer account status:", {
                userId: customerUserId,
                payload: {
                    user_id: customerUserId,
                    account_active: nextAccountActive,
                },
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });
            setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái tài khoản.");
        } finally {
            setActionUserId(null);
        }
    }

    function renderActions(customer) {
        const isActive = Number(customer.account_active) === 1;

        return (
            <div className="flex flex-nowrap gap-2">
                <Link to={buildCustomerDetailPath(role, customer.user_id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    Xem
                </Link>
                <Link to={buildBookingCreateDestination(role, customer)} state={buildBookingCreateState(customer)} className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">
                    Đặt xe
                </Link>
                <Link to={buildBookingHistoryDestination(role, customer)} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50">
                    Lịch sử đặt
                </Link>
                <button
                    type="button"
                    onClick={() => handleToggleAccount(customer)}
                    disabled={actionUserId === customer.user_id || loading}
                    className={`rounded-xl border px-3 py-2 text-xs md:min-w-[128px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                >
                    {actionUserId === customer.user_id ? "Đang xử lý..." : isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Customer list</p>
                    <h1 className="mt-2 text-3xl font-bold">Danh sách khách hàng</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Theo dõi khách hàng theo khu vực, trạng thái hoạt động và hồ sơ trong một màn hình quản trị.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                        <RefreshCw className="h-4 w-4" />
                        Tải lại
                    </button>
                    <Link to={buildRolePath(role, "customer/create")} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                        Thêm khách hàng
                    </Link>
                </div>
            </div>

            <form onSubmit={handleApplyFilters} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
                        <Search className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Bộ lọc khách hàng</h2>
                        <p className="text-sm text-slate-500">Tìm theo tên, email, số điện thoại hoặc trạng thái hồ sơ.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <FilterField label="Khu vực">
                        <select value={draftFilters.route_id} onChange={(event) => updateDraftFilter("route_id", event.target.value)} disabled={routesLoading} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100">
                            <option value="">{routesLoading ? "Đang tải..." : "Tất cả khu vực"}</option>
                            {routes.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Tình trạng hoạt động">
                        <select value={draftFilters.account_active} onChange={(event) => updateDraftFilter("account_active", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {accountActiveOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Tình trạng kích hoạt">
                        <select value={draftFilters.is_activated} onChange={(event) => updateDraftFilter("is_activated", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {activationOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Tình trạng hồ sơ">
                        <select value={draftFilters.document_status} onChange={(event) => updateDraftFilter("document_status", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {documentStatusOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Đánh giá tối thiểu" error={filterErrors.rating_min}>
                        <input type="number" min="0" max="5" placeholder="0" value={draftFilters.rating_min} onChange={(event) => updateDraftFilter("rating_min", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Đánh giá tối đa" error={filterErrors.rating_max}>
                        <input type="number" min="0" max="5" placeholder="5" value={draftFilters.rating_max} onChange={(event) => updateDraftFilter("rating_max", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Từ ngày" error={filterErrors.date_range}>
                        <input type="date" value={draftFilters.date_from} onChange={(event) => updateDraftFilter("date_from", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Đến ngày">
                        <input type="date" value={draftFilters.date_to} onChange={(event) => updateDraftFilter("date_to", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Tìm kiếm">
                        <input type="text" value={draftFilters.search} onChange={(event) => updateDraftFilter("search", event.target.value)} placeholder="Tên, email hoặc số điện thoại" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" />
                    </FilterField>
                    <FilterField label="Sắp xếp theo">
                        <select value={draftFilters.sort_by} onChange={(event) => updateDraftFilter("sort_by", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {sortByOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </FilterField>
                    <FilterField label="Thứ tự">
                        <select value={draftFilters.sort_order} onChange={(event) => updateDraftFilter("sort_order", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            <option value="DESC">Mới nhất</option>
                            <option value="ASC">Cũ nhất</option>
                        </select>
                    </FilterField>
                    <FilterField label="Số bản ghi / trang">
                        <select value={draftFilters.limit} onChange={(event) => updateDraftFilter("limit", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                            {["10", "20", "50", "100"].map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </FilterField>
                </div>

                {filterErrors.rating_range ? <p className="mt-4 text-sm text-red-600">{filterErrors.rating_range}</p> : null}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
                        <Search className="h-4 w-4" />
                        Áp dụng bộ lọc
                    </button>
                    <button type="button" onClick={handleResetFilters} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Reset bộ lọc
                    </button>
                </div>
            </form>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
                            <UsersRound className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Tổng khách hàng theo bộ lọc hiện tại</p>
                            {summaryLoading ? (
                                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang tính toán...
                                </div>
                            ) : (
                                <p className="mt-1 text-3xl font-bold text-slate-900">{totalCustomers}</p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Tổng bản ghi: <span className="font-semibold text-slate-900">{totalItems}</span>
                    </div>
                </div>
            </section>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMessage}</span></div></div> : null}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">Danh sách khách hàng</h2>
                    <p className="mt-1 text-sm text-slate-500">Giữ lại các cột cần thiết và bổ sung cột hành động cho từng khách hàng.</p>
                </div>

                {loading ? (
                    <div className="flex min-h-72 items-center justify-center px-6 py-10 text-slate-600">
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Đang tải danh sách khách hàng...
                    </div>
                ) : customers.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-slate-500">Không có khách hàng nào phù hợp với bộ lọc hiện tại.</div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                        <th className="px-6 py-4">Khách hàng</th>
                                        <th className="px-6 py-4">Liên hệ</th>
                                        <th className="px-6 py-4">Số dư tài khoản</th>
                                        <th className="px-6 py-4">Ngày tạo</th>
                                        <th className="px-6 py-4">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {customers.map((customer) => {
                                        return (
                                            <tr key={customer.user_id} className="align-top">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        {customer.photo_file ? <img src={customer.photo_file} alt={customer.full_name} className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">{customer.firstname?.[0] || "U"}</div>}
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{customer.full_name}</p>
                                                            <p className="mt-1 text-xs text-slate-500">User #{customer.user_id}</p>
                                                            <p className="mt-1 text-xs text-slate-500">{customer.address || "Chưa có địa chỉ"}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-600"><p>{customer.email || "--"}</p><p className="mt-1">{customer.phone || "--"}</p></td>
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-900">{formatMoney(customer.wallet_amount)}</td>
                                                <td className="px-6 py-5 text-sm text-slate-600">{formatDateTime(customer.account_create_date)}</td>
                                                <td className="px-6 py-5">{renderActions(customer)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-4 p-4 lg:hidden">
                            {customers.map((customer) => {
                                return (
                                    <article key={customer.user_id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-start gap-4">
                                            {customer.photo_file ? <img src={customer.photo_file} alt={customer.full_name} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">{customer.firstname?.[0] || "U"}</div>}
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-bold text-slate-900">{customer.full_name}</h3>
                                                <p className="mt-1 text-sm text-slate-500">{customer.email || "--"}</p>
                                                <p className="text-sm text-slate-500">{customer.phone || "--"}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                                            <p>Số dư tài khoản: <span className="font-semibold text-slate-900">{formatMoney(customer.wallet_amount)}</span></p>
                                            <p>Ngày tạo: <span className="font-semibold text-slate-900">{formatDateTime(customer.account_create_date)}</span></p>
                                        </div>
                                        <div className="mt-4">{renderActions(customer)}</div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / <span className="font-semibold text-slate-900">{pagination.totalPages || 1}</span></p>
                    <div className="flex items-center gap-2">
                        <PaginationButton disabled={pagination.page <= 1 || loading} onClick={() => handlePageChange(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></PaginationButton>
                        <PaginationButton disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages || loading} onClick={() => handlePageChange(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></PaginationButton>
                    </div>
                </div>
            </section>
        </div>
    );
}
