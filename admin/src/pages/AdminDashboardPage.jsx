import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car, CircleCheckBig, RefreshCw, UserRound, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";
import { getDashboardSummary } from "../services/adminService";

function BarChart({ items = [] }) {
    const maxValue = Math.max(...items.map((item) => item.value || 0), 1);

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{item.label}</span><span>{item.value}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(5, (item.value / maxValue) * 100)}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const [summary, setSummary] = useState({
        bookings: { total: 0, completed: 0, cancelled: 0, active: 0, revenue: 0 },
        drivers: { total: 0, online: 0 },
        users: { total: 0, active: 0 },
        rentals: { total: 0, completed: 0, active: 0, revenue: 0 },
        wallets: { total_balance: 0 },
        operations: { cancellation_rate_percent: 0 },
        revenueSeries: [],
        serviceBreakdown: [],
    });

    async function loadSummary() {
        try {
            const response = await getDashboardSummary();
            setSummary((prev) => ({
                ...prev,
                ...response,
                revenueSeries: [
                    { label: "Đặt xe", value: Number(response?.bookings?.revenue || 0) },
                    { label: "Thuê xe", value: Number(response?.rentals?.revenue || 0) },
                    { label: "Ví", value: Number(response?.wallets?.total_balance || 0) },
                ],
                serviceBreakdown: [
                    { label: "Tổng cộng", value: Number(response?.bookings?.total || 0) },
                    { label: "Hoàn thành", value: Number(response?.bookings?.completed || 0) },
                    { label: "Đã hủy", value: Number(response?.bookings?.cancelled || 0) },
                ],
            }));
        } catch {
            setSummary((prev) => prev);
        }
    }

    useEffect(() => {
        loadSummary();
    }, []);

    const quickLinks = useMemo(
        () => [
            { to: "/admin/bookings", label: "Danh sách đặt xe" },
            { to: "/admin/drivers", label: "Danh sách tài xế" },
            { to: "/admin/customers", label: "Danh sách khách hàng" },
        ],
        []
    );

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.dashboard.badge")}
                title={t("adminModules.dashboard.title")}
                description={t("adminModules.dashboard.desc")}
                actions={
                    <button type="button" onClick={loadSummary} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                        <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span>
                    </button>
                }
            />

            <section className="grid gap-4 xl:grid-cols-3">
                <StatCard label="Tổng số đơn thuê" value={summary.bookings?.total || 0} tone="blue" icon={Car} />
                <StatCard label="Chuyến đi hoàn thành" value={summary.bookings?.completed || 0} tone="emerald" icon={CircleCheckBig} />
                <StatCard label="Doanh thu đặt xe" value={`${new Intl.NumberFormat("vi-VN").format(Number(summary.bookings?.revenue || 0))} VND`} tone="amber" icon={Wallet} />
                <StatCard label="Tài xế trực tuyến/Tổng" value={`${summary.drivers?.online || 0}/${summary.drivers?.total || 0}`} tone="cyan" icon={UserRound} />
                <StatCard label="Người dùng hoạt động/Tổng" value={`${summary.users?.active || 0}/${summary.users?.total || 0}`} tone="blue" icon={UserRound} />
                <StatCard label="Tỷ lệ hủy bỏ" value={`${Number(summary.operations?.cancellation_rate_percent || 0).toFixed(2)}%`} tone="amber" icon={CircleCheckBig} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-bold text-slate-900">Doanh thu theo ngày/tháng</h2>
                    <div className="mt-4">
                        <BarChart items={(summary.revenueSeries || []).map((item) => ({ label: item.label || item.date || "-", value: Number(item.value || item.amount || 0) }))} />
                    </div>
                </article>

                <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-bold text-slate-900">Số lượng đặt xe theo loại dịch vụ</h2>
                    <div className="mt-4">
                        <BarChart items={(summary.serviceBreakdown || []).map((item) => ({ label: item.label || item.service_type || "-", value: Number(item.value || item.count || 0) }))} />
                    </div>
                </article>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Truy cập nhanh</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                    {quickLinks.map((item) => <Link key={item.to} to={item.to} className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">{item.label}</Link>)}
                </div>
            </section>
        </div>
    );
}
