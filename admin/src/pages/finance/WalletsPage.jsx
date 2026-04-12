import { useEffect, useState } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import { adjustWallet, getWallets } from "../../services/adminService";

export default function WalletsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState("");

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const response = await getWallets({ page: 1, limit: 30 });
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

    async function handleQuickCredit(wallet) {
        await adjustWallet({
            actor_type: wallet.actor_type,
            actor_id: wallet.actor_id,
            direction: "credit",
            amount: 10000,
            note: "Quick credit from admin panel",
        });
        loadData();
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.wallets.badge")}
                title={t("adminModules.wallets.title")}
                description={t("adminModules.wallets.desc")}
                gradient="from-slate-950 via-slate-900 to-emerald-900"
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
                                        <th className="px-4 py-3">ID Ví</th><th className="px-4 py-3">Chủ sở hữu</th><th className="px-4 py-3">Loại tài khoản</th><th className="px-4 py-3">Số dư</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.wallet_id || row.id} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">{row.wallet_id || row.id}</td>
                                            <td className="px-4 py-3">{row.actor_name || "--"} ({row.actor_phone || "--"})</td>
                                            <td className="px-4 py-3">{row.actor_type}</td>
                                            <td className="px-4 py-3">{new Intl.NumberFormat("vi-VN").format(Number(row.balance || 0))} VND</td>
                                            <td className="px-4 py-3">{Number(row.status) === 1 ? "active" : "disabled"}</td>
                                            <td className="px-4 py-3">
                                                <button type="button" onClick={() => handleQuickCredit(row)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50">
                                                    <PlusCircle className="h-4 w-4" />
                                                    +10,000
                                                </button>
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
