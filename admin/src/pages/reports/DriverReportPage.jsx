import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import { getOperationsReport } from "../../services/adminService";

export default function DriverReportPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ completed: 0, cancelled: 0, avgRating: 0 });

    async function loadData() {
        const response = await getOperationsReport({ granularity: "day" });
        const items = response.driver_performance || [];
        setRows(items);
        const completed = items.reduce((sum, item) => sum + Number(item.completed_trips || 0), 0);
        const cancelled = items.reduce((sum, item) => sum + Number(item.cancelled_by_driver || 0), 0);
        const avgRating = items.length
            ? (items.reduce((sum, item) => sum + Number(item.avg_user_rating || 0), 0) / items.length).toFixed(2)
            : 0;
        setSummary({ completed, cancelled, avgRating });
    }

    useEffect(() => {
        loadData();
    }, []);

    const totalTrips = useMemo(() => rows.reduce((sum, item) => sum + Number(item.total_trips || 0), 0), [rows]);

    return (
        <div className="space-y-6">
            <PageHeader badge={t("adminModules.reports.badge")} title={t("adminModules.reports.driverTitle")} description={t("adminModules.reports.desc")} actions={<button type="button" onClick={loadData} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span></button>} />
            <section className="grid gap-4 xl:grid-cols-4">
                <StatCard label="Tổng số chuyến" value={totalTrips} tone="blue" />
                <StatCard label="Hoàn thành" value={summary.completed} tone="emerald" />
                <StatCard label="Đã hủy" value={summary.cancelled} tone="amber" />
                <StatCard label="Đánh giá trung bình" value={summary.avgRating} tone="cyan" />
            </section>
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Tài xế</th><th className="px-4 py-3">Chuyến đi</th><th className="px-4 py-3">Hoàn thành</th><th className="px-4 py-3">Đã hủy</th><th className="px-4 py-3">Đánh giá trung bình</th></tr></thead>
                        <tbody>{rows.map((row) => <tr key={row.driver_id || row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.driver_name || "--"}</td><td className="px-4 py-3">{row.total_trips || 0}</td><td className="px-4 py-3">{row.completed_trips || 0}</td><td className="px-4 py-3">{row.cancelled_by_driver || 0}</td><td className="px-4 py-3">{Number(row.avg_user_rating || 0).toFixed(2)}</td></tr>)}</tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
