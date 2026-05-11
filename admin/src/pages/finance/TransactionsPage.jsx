import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { getTransactions } from "../../services/adminService";

function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
}

export default function TransactionsPage() {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const debouncedQuery = useDebouncedValue(query);
    const actorMap = {0: "Hành khách", 1: "Tài xế", 2: "Chủ xe", 3: "Quản trị viên", 4: "Hệ thống"};
    const queryParams = useMemo(
        () => ({
            page,
            limit: 10,
            actor_id: debouncedQuery || undefined,
            direction: status || undefined,
            entry_type: type || undefined,
        }),
        [debouncedQuery, page, status, type]
    );

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const response = await getTransactions(queryParams);
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
    }

    useEffect(() => {
        loadData();
    }, [debouncedQuery, page, status, type]);

    async function handleExport() {
        const headers = ["ledger_id", "wallet_id", "amount", "balance_after", "direction", "entry_type", "source_type", "source_id", "actor_type", "actor_id", "created_at", "description"];
        const csvRows = [
            headers.join(","),
            ...rows.map((row) =>
                headers
                    .map((key) => {
                        const raw = row[key] ?? "";
                        const escaped = String(raw).replace(/"/g, "\"\"");
                        return `"${escaped}"`;
                    })
                    .join(",")
            ),
        ];
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const href = URL.createObjectURL(blob);
        link.href = href;
        link.download = `transactions-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.transactions.badge")}
                title={t("adminModules.transactions.title")}
                description={t("adminModules.transactions.desc")}
                actions={
                    <>
                        <button type="button" onClick={loadData} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                            <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span>
                        </button>
                        <button type="button" onClick={handleExport} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />CSV</span>
                        </button>
                    </>
                }
            />

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="grid gap-3 md:grid-cols-4">
                    <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-slate-600">{t("adminModules.search")}</span>
                        <div className="flex items-center rounded-2xl border border-slate-300 px-3 py-2.5">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} className="w-full bg-transparent px-2 outline-none" placeholder={t("adminModules.transactions.searchPlaceholder")} />
                        </div>
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-medium text-slate-600">Loại giao dịch</span>
                        <select value={type} onChange={(event) => { setPage(1); setType(event.target.value); }} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5">
                            <option value="">Tất cả</option>
                            <option value="topup">Nạp tiền</option>
                            <option value="ride_payment">Thanh toán chuyến đi</option>
                            <option value="rental_payment">Thanh toán thuê xe</option>
                            <option value="manual_adjustment">Điều chỉnh thủ công</option>
                            <option value="withdrawal">Rút tiền</option>
                        </select>
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-medium text-slate-600">Phương thức giao dịch</span>
                        <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5">
                            <option value="">Tất cả</option>
                            <option value="credit">Cộng tiền</option>
                            <option value="debit">Trừ tiền</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                {loading ? (
                    <div className="space-y-3 p-5"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div>
                ) : (
                    <>
                        {error ? <p className="px-5 py-3 text-sm text-red-600">{error}</p> : null}
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">ID giao dịch</th><th className="px-4 py-3">Ví</th><th className="px-4 py-3">Số tiền</th><th className="px-4 py-3">Số dư</th><th className="px-4 py-3">Phương thức</th><th className="px-4 py-3">Loại giao dịch</th><th className="px-4 py-3">Tác nhân thanh toán</th><th className="px-4 py-3">Tác nhân thụ hưởng</th><th className="px-4 py-3">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.ledger_id || row.id} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">{row.ledger_id || row.id}</td>
                                            <td className="px-4 py-3">{row.wallet_id || "--"}</td>
                                            <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                                            <td className="px-4 py-3">{formatCurrency(row.balance_after)}</td>
                                            <td className="px-4 py-3">{row.direction === 'credit' ? 'Cộng tiền' : row.direction === 'debit' ? 'Trừ tiền' : "--"}</td>
                                            <td className="px-4 py-3">{row.entry_type || "--"}</td>
                                            <td className="px-4 py-3">{actorMap[row.actor_type] || "--"}</td>
                                            <td className="px-4 py-3">{actorMap[row.actor_id] || "--"}</td>
                                            <td className="px-4 py-3">{row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "--"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                            <span>Tổng: {meta.total}</span>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)} className="rounded-xl border px-3 py-1.5 disabled:opacity-40">Trước</button>
                                <span>{page}/{meta.totalPages}</span>
                                <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((prev) => prev + 1)} className="rounded-xl border px-3 py-1.5 disabled:opacity-40">Sau</button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
