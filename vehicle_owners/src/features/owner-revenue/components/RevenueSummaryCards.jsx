import SummaryCard from '../../../components/ui/SummaryCard';
import { formatCurrency } from '../../../utils/format';

export default function RevenueSummaryCards({ summary }) {
  const trend = summary?.monthlyTrend || [];
  const maxValue = Math.max(...trend.map((item) => item.revenue), 1);

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Tổng doanh thu" value={formatCurrency(summary?.totalRevenue || 0)} />
        <SummaryCard title="Doanh thu tháng nay" value={formatCurrency(summary?.monthRevenue || 0)} tone="positive" />
        <SummaryCard title="Số dư ví hiện tại" value={formatCurrency(summary?.walletBalance || 0)} tone="info" />
        <SummaryCard title="Tổng số tiền yêu cầu rút" value={formatCurrency(summary?.pendingWithdrawal || 0)} tone="warning" />
        <SummaryCard
          title="Đang xử lý rút tiền"
          value={formatCurrency(summary?.processingWithdrawal || 0)}
          tone="warning"
        />
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-base font-bold text-slate-900">Xu hướng doanh thu theo tháng</h4>
        {trend.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu biểu đồ.</p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {trend.map((item) => (
              <div key={item.month} className="text-center">
                <div className="mx-auto flex h-32 w-12 items-end rounded-lg bg-slate-100 p-1">
                  <div
                    className="w-full rounded bg-gradient-to-t from-cyan-500 to-sky-500"
                    style={{ height: `${Math.max(6, (item.revenue / maxValue) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">Tháng {item.month}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}


