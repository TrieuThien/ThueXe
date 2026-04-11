import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import { getOperationsReport } from "../../services/adminService";

export default function PaymentReportPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ revenue: 0, walletBalance: 0, walletCount: 0, pendingDocs: 0 });

    async function loadData() {
        const response = await getOperationsReport({ granularity: "day" });
        const revenueRows = response.revenue || [];
        const walletRows = response.wallet || [];
        const totalRevenue = revenueRows.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
        const totalWalletBalance = walletRows.reduce((sum, item) => sum + Number(item.total_balance || 0), 0);
        const totalWallets = walletRows.reduce((sum, item) => sum + Number(item.total_wallets || 0), 0);
        const pendingDocs =
            Number(response.documents?.user_documents?.pending || 0) +
            Number(response.documents?.driver_documents?.pending || 0);
        setRows(revenueRows);
        setSummary({
            revenue: totalRevenue,
            walletBalance: totalWalletBalance,
            walletCount: totalWallets,
            pendingDocs,
        });
    }

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader badge={t("adminModules.reports.badge")} title={t("adminModules.reports.paymentTitle")} description={t("adminModules.reports.desc")} actions={<button type="button" onClick={loadData} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span></button>} />
            <section className="grid gap-4 xl:grid-cols-4">
                <StatCard label="Revenue" value={`${new Intl.NumberFormat("vi-VN").format(Number(summary.revenue || 0))} VND`} tone="blue" />
                <StatCard label="Wallet balance" value={`${new Intl.NumberFormat("vi-VN").format(Number(summary.walletBalance || 0))} VND`} tone="emerald" />
                <StatCard label="Wallet count" value={summary.walletCount} tone="amber" />
                <StatCard label="Pending documents" value={summary.pendingDocs} tone="cyan" />
            </section>
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Total bookings</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Cancelled</th><th className="px-4 py-3">Revenue</th></tr></thead>
                        <tbody>{rows.map((row, index) => <tr key={row.period || index} className="border-t border-slate-100"><td className="px-4 py-3">{row.period || "--"}</td><td className="px-4 py-3">{row.total_bookings || 0}</td><td className="px-4 py-3">{row.completed_bookings || 0}</td><td className="px-4 py-3">{row.cancelled_bookings || 0}</td><td className="px-4 py-3">{new Intl.NumberFormat("vi-VN").format(Number(row.revenue || 0))}</td></tr>)}</tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
