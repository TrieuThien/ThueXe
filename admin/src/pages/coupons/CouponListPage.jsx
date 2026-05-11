import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import { getCouponMeta, getAdminCoupons, updateAdminCouponStatus } from "../../services/couponService";
import {
    formatMoney,
    getCouponExpiryBadge,
    getCouponStatusBadge,
    getCouponVisibilityBadge,
} from "./couponFormUtils";

export default function CouponListPage() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const navigate = useNavigate();

    const [cities, setCities] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        status: "",
        city: "",
        visibility: "",
        activeFrom: "",
        activeTo: "",
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 0,
    });

    const query = useMemo(
        () => ({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
            status: filters.status,
            city: filters.city,
            visibility: filters.visibility,
            activeFrom: filters.activeFrom,
            activeTo: filters.activeTo,
        }),
        [filters, pagination.limit, pagination.page]
    );

    async function loadMeta() {
        try {
            const meta = await getCouponMeta();
            setCities(meta.cities || []);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được dữ liệu thành phố.");
        }
    }

    async function loadCoupons() {
        setLoading(true);
        setErrorMessage("");

        try {
            const data = await getAdminCoupons(query);
            setItems(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || prev.page),
                limit: Number(data.pagination?.limit || prev.limit),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
        } catch (error) {
            setItems([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách mã giảm giá.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadMeta();
    }, []);

    useEffect(() => {
        loadCoupons();
    }, [query]);

    async function handleToggleStatus(coupon) {
        const nextStatus = Number(coupon.status) === 1 ? 0 : 1;
        setActionLoadingId(coupon.id);

        try {
            await updateAdminCouponStatus(coupon.id, nextStatus);
            await loadCoupons();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái mã.");
        } finally {
            setActionLoadingId(null);
        }
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-4 py-5 text-white sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Coupons</p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Quản lý mã giảm giá</h1>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={loadCoupons}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        <RefreshCw className="h-4 w-4" /> Tải lại
                    </button>
                    <Link
                        to={buildRolePath(role, "coupons/create")}
                        className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        Tạo mã mới
                    </Link>
                </div>
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
                }}
                className="rounded-3xl border border-slate-200 bg-white p-3 sm:p-4"
            >
                <div className="grid gap-3 xl:grid-cols-6">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Tìm theo mã hoặc tiêu đề"
                        className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 xl:col-span-2"
                    />

                    <select
                        value={filters.status}
                        onChange={(event) => {
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            setFilters((prev) => ({ ...prev, status: event.target.value }));
                        }}
                        className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="1">Đang hoạt động</option>
                        <option value="0">Ngừng hoạt động</option>
                    </select>

                    <select
                        value={filters.city}
                        onChange={(event) => {
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            setFilters((prev) => ({ ...prev, city: event.target.value }));
                        }}
                        className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                    >
                        <option value="">Tất cả thành phố</option>
                        {cities.map((city) => (
                            <option key={city.id} value={city.id}>
                                {city.r_title}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.visibility}
                        onChange={(event) => {
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            setFilters((prev) => ({ ...prev, visibility: event.target.value }));
                        }}
                        className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                    >
                        <option value="">Tất cả hiển thị</option>
                        <option value="1">Công khai</option>
                        <option value="0">Nhập tay</option>
                    </select>

                    <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                        <Search className="h-4 w-4" /> Tìm
                    </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:max-w-xl">
                    <input
                        type="datetime-local"
                        value={filters.activeFrom}
                        onChange={(event) => {
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            setFilters((prev) => ({ ...prev, activeFrom: event.target.value }));
                        }}
                        className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                    <input
                        type="datetime-local"
                        value={filters.activeTo}
                        onChange={(event) => {
                            setPagination((prev) => ({ ...prev, page: 1 }));
                            setFilters((prev) => ({ ...prev, activeTo: event.target.value }));
                        }}
                        className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                </div>
            </form>

            {errorMessage ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {loading ? (
                    <div className="flex min-h-56 items-center justify-center text-slate-600">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có mã giảm giá nào.</div>
                ) : (
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Mã</th>
                                    <th className="px-6 py-4">Tiêu đề</th>
                                    <th className="px-6 py-4">Thành phố</th>
                                    <th className="px-6 py-4">Giảm giá</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4">Lượt dùng</th>
                                    <th className="px-6 py-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item) => {
                                    const statusBadge = getCouponStatusBadge(item);
                                    const visibilityBadge = getCouponVisibilityBadge(item);
                                    const expiryBadge = getCouponExpiryBadge(item);
                                    const discountLabel = Number(item.discount_type) === 0
                                        ? `${item.discount_value}%`
                                        : `${formatMoney(item.discount_value)}`;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80">
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.coupon_code}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{item.coupon_title || "--"}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{item.city_name || `#${item.city}`}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {discountLabel}
                                                {Number(item.discount_type) === 0 && Number(item.max_discount_amount) > 0
                                                    ? ` (tối đa ${formatMoney(item.max_discount_amount)})`
                                                    : ""}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {[statusBadge, visibilityBadge, expiryBadge].map((badge) => (
                                                        <span
                                                            key={`${item.id}-${badge.label}`}
                                                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                                                        >
                                                            {badge.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {item.total_used}
                                                {Number(item.limit_count) > 0 ? ` / ${item.limit_count}` : " / Không giới hạn"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(buildRolePath(role, `coupons/${item.id}`))}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(buildRolePath(role, `coupons/${item.id}/edit`))}
                                                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === item.id}
                                                        onClick={() => handleToggleStatus(item)}
                                                        className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                                                    >
                                                        {actionLoadingId === item.id ? "Đang cập nhật..." : Number(item.status) === 1 ? "Tắt mã" : "Bật mã"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-slate-500">
                        Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / {pagination.totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                            className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

