import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import { getPayouts, reviewPayout } from "../../services/adminService";

export default function PayoutsPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    async function handleReview(row, decision) {
        const status = decision === "approve" ? "approved" : "rejected";
        await reviewPayout(row.withdrawal_id || row.id, { status, note: `Reviewed by admin: ${status}` });
        setRows((prev) => prev.map((item) => {
            if ((item.withdrawal_id || item.id) === (row.withdrawal_id || row.id)) {
                return { ...item, status };
            }
            return item;
        }));
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.payouts.badge")}
                title={t("adminModules.payouts.title")}
                description={t("adminModules.payouts.desc")}
                gradient="from-slate-950 via-slate-900 to-amber-900"
                actions={<button type="button" onClick={loadData} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span></button>}
            />

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
                                        <th className="px-4 py-3">Withdrawal ID</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Wallet</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.withdrawal_id || row.id} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">{row.withdrawal_id || row.id}</td>
                                            <td className="px-4 py-3">{row.actor_type}:{row.actor_id}</td>
                                            <td className="px-4 py-3">{row.wallet_id || "--"}</td>
                                            <td className="px-4 py-3">{new Intl.NumberFormat("vi-VN").format(Number(row.amount || 0))} VND</td>
                                            <td className="px-4 py-3">{row.requested_at ? new Date(row.requested_at).toLocaleString("vi-VN") : "--"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => handleReview(row, "approve")} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" />Approve</button>
                                                    <button type="button" onClick={() => handleReview(row, "reject")} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50"><XCircle className="h-4 w-4" />Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
