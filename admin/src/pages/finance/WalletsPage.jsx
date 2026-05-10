import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, SlidersHorizontal, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { adjustWallet, getWallets, updateWalletStatus } from "../../services/adminService";

const ACTOR_TYPE_LABEL = { 0: "Người dùng", 1: "Tài xế", 2: "Chủ xe", 3: "Nhân viên" };

function AdjustModal({ wallet, onClose, onSuccess }) {
    const [direction, setDirection] = useState("credit");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    function parseAmountInput(value) {
        const normalized = String(value || "").replace(/[.,\s]/g, "");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const numAmount = parseAmountInput(amount);
        if (!numAmount || numAmount <= 0) {
            setError("Số tiền phải lớn hơn 0.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await adjustWallet({
                actor_type: wallet.actor_type,
                actor_id: wallet.actor_id,
                direction,
                amount: numAmount,
                note: note.trim() || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || "Điều chỉnh thất bại.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-[24px] bg-white shadow-2xl">
                <div className="border-b border-slate-100 px-6 py-4">
                    <p className="text-xs text-slate-500">Ví #{wallet.wallet_id}</p>
                    <h3 className="text-base font-semibold text-slate-900">Điều chỉnh số dư</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {wallet.actor_name || "--"} &middot; Số dư hiện tại:{" "}
                        <span className="font-medium text-slate-800">
                            {new Intl.NumberFormat("vi-VN").format(Number(wallet.balance || 0))} VND
                        </span>
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Loại điều chỉnh</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDirection("credit")}
                                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${
                                    direction === "credit"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                + Cộng tiền
                            </button>
                            <button
                                type="button"
                                onClick={() => setDirection("debit")}
                                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${
                                    direction === "debit"
                                        ? "border-red-500 bg-red-50 text-red-700"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                &minus; Trừ tiền
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Số tiền (VND)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="VD: 100000 hoặc 100.000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Ghi chú (tuỳ chọn)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={255}
                            placeholder="Lý do điều chỉnh..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Huỷ
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                                direction === "credit"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-red-600 hover:bg-red-700"
                            }`}
                        >
                            {submitting ? "Đang lưu..." : "Xác nhận"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function WalletsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
    const [error, setError] = useState("");
    const [adjustTarget, setAdjustTarget] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [actorTypeFilter, setActorTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const debouncedSearch = useDebouncedValue(searchKeyword);

    const queryParams = useMemo(
        () => ({
            page,
            limit: 10,
            search: debouncedSearch.trim() || undefined,
            actor_type: actorTypeFilter === "" ? undefined : Number(actorTypeFilter),
            status: statusFilter === "" ? undefined : Number(statusFilter),
        }),
        [actorTypeFilter, debouncedSearch, page, statusFilter]
    );

    const hasFilters = Boolean(searchKeyword.trim() || actorTypeFilter || statusFilter);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await getWallets(queryParams);
            setRows(response.items || []);
            const total = Number(response.totalItems || 0);
            const limit = Number(response.limit || 10);
            const currentPage = Number(response.page || page);
            const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
            setMeta({ total, totalPages, limit });
            if (currentPage !== page) {
                setPage(currentPage);
            }
        } catch (loadError) {
            setError(loadError?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [queryParams, t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleToggleStatus(wallet) {
        const newStatus = Number(wallet.status) === 1 ? 0 : 1;
        setTogglingId(wallet.wallet_id);
        try {
            await updateWalletStatus(wallet.wallet_id, newStatus);
            setRows((prev) =>
                prev.map((r) =>
                    r.wallet_id === wallet.wallet_id ? { ...r, status: newStatus } : r
                )
            );
        } catch (err) {
            setError(err?.response?.data?.message || "Không thể thay đổi trạng thái ví.");
        } finally {
            setTogglingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.wallets.badge")}
                title={t("adminModules.wallets.title")}
                description={t("adminModules.wallets.desc")}
                gradient="from-slate-950 via-slate-900 to-emerald-900"
                actions={
                    <button
                        type="button"
                        onClick={loadData}
                        className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                    >
                        <span className="inline-flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {t("adminModules.refresh")}
                        </span>
                    </button>
                }
            />

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5">
                    <div className="grid gap-3 md:grid-cols-4">
                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-slate-600">Tìm kiếm</span>
                            <div className="flex items-center rounded-2xl border border-slate-300 px-3 py-2.5">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={searchKeyword}
                                    onChange={(event) => {
                                        setPage(1);
                                        setSearchKeyword(event.target.value);
                                    }}
                                    className="w-full bg-transparent px-2 outline-none"
                                    placeholder="ID ví, ID chủ sở hữu, số điện thoại..."
                                />
                            </div>
                        </label>
                        <label>
                            <span className="mb-2 block text-sm font-medium text-slate-600">Loại tài khoản</span>
                            <select
                                value={actorTypeFilter}
                                onChange={(event) => {
                                    setPage(1);
                                    setActorTypeFilter(event.target.value);
                                }}
                                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5"
                            >
                                <option value="">Tất cả</option>
                                <option value="0">Người dùng</option>
                                <option value="1">Tài xế</option>
                                <option value="2">Chủ xe</option>
                                <option value="3">Nhân viên</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-2 block text-sm font-medium text-slate-600">Trạng thái ví</span>
                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setPage(1);
                                    setStatusFilter(event.target.value);
                                }}
                                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5"
                            >
                                <option value="">Tất cả</option>
                                <option value="1">Hoạt động</option>
                                <option value="0">Đã khóa</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                            Tổng <span className="font-semibold text-slate-700">{meta.total}</span> ví
                        </p>
                        {hasFilters ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setPage(1);
                                    setSearchKeyword("");
                                    setActorTypeFilter("");
                                    setStatusFilter("");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                Xóa bộ lọc
                            </button>
                        ) : null}
                    </div>
                </div>
                {loading ? (
                    <div className="space-y-3 p-5">
                        <SkeletonBlock className="h-16" />
                        <SkeletonBlock className="h-16" />
                    </div>
                ) : (
                    <>
                        {error ? <p className="px-5 py-3 text-sm text-red-600">{error}</p> : null}
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">ID Ví</th>
                                        <th className="px-4 py-3">Chủ sở hữu</th>
                                        <th className="px-4 py-3">Loại TK</th>
                                        <th className="px-4 py-3">Số dư</th>
                                        <th className="px-4 py-3">Trạng thái</th>
                                        <th className="px-4 py-3">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const isActive = Number(row.status) === 1;
                                        const isToggling = togglingId === row.wallet_id;
                                        return (
                                            <tr key={row.wallet_id} className="border-t border-slate-100">
                                                <td className="px-4 py-3 font-medium text-slate-900">#{row.wallet_id}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium">{row.actor_name || "--"}</span>
                                                    <span className="ml-1 text-slate-400">{row.actor_phone ? `(${row.actor_phone})` : ""}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {ACTOR_TYPE_LABEL[row.actor_type] ?? row.actor_type}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {new Intl.NumberFormat("vi-VN").format(Number(row.balance || 0))} VND
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                            isActive
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        {isActive ? "Hoạt động" : "Đã khóa"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAdjustTarget(row)}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                                        >
                                                            <SlidersHorizontal className="h-3.5 w-3.5" />
                                                            Điều chỉnh số dư
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isToggling}
                                                            onClick={() => handleToggleStatus(row)}
                                                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                                                isActive
                                                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                            }`}
                                                        >
                                                            {isActive ? (
                                                                <ToggleRight className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ToggleLeft className="h-3.5 w-3.5" />
                                                            )}
                                                            {isToggling ? "..." : isActive ? "Khóa ví" : "Mở ví"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                            <span>Tổng: {meta.total}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((prev) => prev - 1)}
                                    className="rounded-xl border px-3 py-1.5 disabled:opacity-40"
                                >
                                    Trước
                                </button>
                                <span>{page}/{meta.totalPages}</span>
                                <button
                                    type="button"
                                    disabled={page >= meta.totalPages}
                                    onClick={() => setPage((prev) => prev + 1)}
                                    className="rounded-xl border px-3 py-1.5 disabled:opacity-40"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {adjustTarget ? (
                <AdjustModal
                    wallet={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={() => {
                        setAdjustTarget(null);
                        loadData();
                    }}
                />
            ) : null}
        </div>
    );
}

