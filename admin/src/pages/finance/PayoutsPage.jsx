import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Coins, RefreshCw, Search, X, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { getPayouts, reviewPayout } from "../../services/adminService";

const PAGE_SIZE = 10;

export default function PayoutsPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingId, setProcessingId] = useState(null);
    const [payModalRow, setPayModalRow] = useState(null);
    const debouncedQuery = useDebouncedValue(query);

    const mapsActorType = {
        0: "Người dùng",
        1: "Tài xế",
        2: "Chủ xe",
        3: "Nhân viên",
    };

    const mapsStatus = {
        pending: "Chờ xử lý",
        approved: "Đã duyệt",
        rejected: "Từ chối",
        paid: "Đã thanh toán",
        cancelled: "Đã hủy",
    };

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const response = await getPayouts();
            setRows(response.items || []);
        } catch (loadError) {
            setError(loadError?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [debouncedQuery, statusFilter]);

    const filteredRows = useMemo(() => {
        const normalizedQuery = debouncedQuery.trim().toLowerCase();

        return rows.filter((row) => {
            const statusMatch = !statusFilter || row.status === statusFilter;
            if (!statusMatch) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            const searchSource = [
                row.withdrawal_id,
                row.id,
                mapsActorType[row.actor_type],
                row.actor_id,
                row.wallet_id,
                row.status,
                row.note,
            ]
                .filter((value) => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return searchSource.includes(normalizedQuery);
        });
    }, [rows, debouncedQuery, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredRows.slice(start, start + PAGE_SIZE);
    }, [filteredRows, page]);

    async function handleReview(row, decision) {
        const status = decision === "approve" ? "approved" : "rejected";
        const withdrawalId = row.withdrawal_id || row.id;
        setProcessingId(withdrawalId);
        setError("");
        try {
            await reviewPayout(withdrawalId, { status, note: `Reviewed by admin: ${status}` });
            setRows((prev) =>
                prev.map((item) => {
                    if ((item.withdrawal_id || item.id) === withdrawalId) {
                        return { ...item, status };
                    }
                    return item;
                })
            );
        } catch (requestError) {
            setError(requestError?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setProcessingId(null);
        }
    }

    function openPayModal(row) {
        setPayModalRow(row);
        setError("");
    }

    function closePayModal() {
        if (processingId) {
            return;
        }
        setPayModalRow(null);
    }

    async function handleConfirmPaid() {
        if (!payModalRow) {
            return;
        }
        const withdrawalId = payModalRow.withdrawal_id || payModalRow.id;
        setProcessingId(withdrawalId);
        setError("");
        try {
            await reviewPayout(withdrawalId, { status: "paid", note: "Reviewed by admin: paid" });
            setRows((prev) =>
                prev.map((item) => {
                    if ((item.withdrawal_id || item.id) === withdrawalId) {
                        return { ...item, status: "paid" };
                    }
                    return item;
                })
            );
            setPayModalRow(null);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.payouts.badge")}
                title={t("adminModules.payouts.title")}
                description={t("adminModules.payouts.desc")}
                gradient="from-slate-950 via-slate-900 to-amber-900"
                actions={
                    <button type="button" onClick={loadData} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                        <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span>
                    </button>
                }
            />

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-slate-600">{t("adminModules.search")}</span>
                        <div className="flex items-center rounded-2xl border border-slate-300 px-3 py-2.5">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                className="w-full bg-transparent px-2 outline-none"
                                placeholder="Tìm theo mã rút tiền, ví hoặc tác nhân"
                            />
                        </div>
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-medium text-slate-600">Trạng thái</span>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5">
                            <option value="">Tất cả</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="approved">Đã duyệt</option>
                            <option value="rejected">Từ chối</option>
                            <option value="paid">Đã thanh toán</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                {loading ? (
                    <div className="space-y-3 p-5"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div>
                ) : (
                    <>
                        {error ? <p className="px-5 py-3 text-sm text-red-600">{error}</p> : null}
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">ID yêu cầu rút</th>
                                        <th className="px-4 py-3">Người dùng</th>
                                        <th className="px-4 py-3">ID ví</th>
                                        <th className="px-4 py-3">Số tiền</th>
                                        <th className="px-4 py-3">Trạng thái</th>
                                        <th className="px-4 py-3">Yêu cầu</th>
                                        <th className="px-4 py-3">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRows.map((row) => (
                                        <tr key={row.withdrawal_id || row.id} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">{row.withdrawal_id || row.id}</td>
                                            <td className="px-4 py-3">ID: #{row.actor_id} <br />{row.actor_name ? `Tên: ${row.actor_name}` : "Tên: --"} <br />Loại tài khoản: {mapsActorType[row.actor_type]}</td>
                                            <td className="px-4 py-3">{row.wallet_id || "--"}</td>
                                            <td className="px-4 py-3">{new Intl.NumberFormat("vi-VN").format(Number(row.amount || 0))} VND</td>
                                            <td className="px-4 py-3">{mapsStatus[row.status] || "--"}</td>
                                            <td className="px-4 py-3">{row.requested_at ? new Date(row.requested_at).toLocaleString("vi-VN") : "--"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={row.status !== "pending" || processingId === (row.withdrawal_id || row.id)}
                                                        onClick={() => handleReview(row, "approve")}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />Duyệt
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={row.status !== "pending" || processingId === (row.withdrawal_id || row.id)}
                                                        onClick={() => handleReview(row, "reject")}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <XCircle className="h-4 w-4" />Từ chối
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={row.status !== "approved" || processingId === (row.withdrawal_id || row.id)}
                                                        onClick={() => openPayModal(row)}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-blue-200 px-3 py-1.5 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <Coins className="h-4 w-4" />Thanh toán
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!paginatedRows.length ? (
                                        <tr>
                                            <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>Không có dữ liệu phù hợp</td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                            <span>Tổng: {filteredRows.length}</span>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)} className="rounded-xl border px-3 py-1.5 disabled:opacity-40">Trước</button>
                                <span>{page}/{totalPages}</span>
                                <button type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)} className="rounded-xl border px-3 py-1.5 disabled:opacity-40">Sau</button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {payModalRow ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
                    <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">Xác nhận thanh toán yêu cầu rút tiền</h3>
                            <button type="button" onClick={closePayModal} disabled={Boolean(processingId)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-3 px-6 py-5 text-sm text-slate-700">
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                                Vui lòng xác nhận bạn đã chuyển khoản thủ công cho người nhận trước khi bấm xác nhận. Hệ thống sẽ trừ tiền ví ngay sau thao tác này.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-slate-500">Mã yêu cầu:</span> <span className="font-medium text-slate-900">#{payModalRow.withdrawal_id || payModalRow.id}</span></div>
                                <div><span className="text-slate-500">Số tiền:</span> <span className="font-medium text-slate-900">{new Intl.NumberFormat("vi-VN").format(Number(payModalRow.amount || 0))} VND</span></div>
                                <div><span className="text-slate-500">Người nhận:</span> <span className="font-medium text-slate-900">{payModalRow.actor_name || "--"}</span></div>
                                <div><span className="text-slate-500">Loại tài khoản:</span> <span className="font-medium text-slate-900">{mapsActorType[payModalRow.actor_type] || "--"}</span></div>
                                <div><span className="text-slate-500">Ngân hàng:</span> <span className="font-medium text-slate-900">{payModalRow.payout_bank_name || "--"}</span></div>
                                <div><span className="text-slate-500">Chủ tài khoản:</span> <span className="font-medium text-slate-900">{payModalRow.payout_bank_holder || "--"}</span></div>
                                <div><span className="text-slate-500">Số tài khoản:</span> <span className="font-medium text-slate-900">{payModalRow.payout_bank_account || "--"}</span></div>
                                <div><span className="text-slate-500">Bank code / Swift:</span> <span className="font-medium text-slate-900">{payModalRow.payout_bank_code || payModalRow.payout_bank_swift_code || "--"}</span></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button type="button" onClick={closePayModal} disabled={Boolean(processingId)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                Hủy
                            </button>
                            <button type="button" onClick={handleConfirmPaid} disabled={processingId === (payModalRow.withdrawal_id || payModalRow.id)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                                <Coins className="h-4 w-4" />Xác nhận đã thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
