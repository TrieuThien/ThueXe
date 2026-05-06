import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import SummaryCard from '../components/ui/SummaryCard';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { ownerService } from '../services/ownerService';
import { formatCurrency, formatDate } from '../utils/format';

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: ownerService.getDashboard,
  });

  const bookingColumns = [
    { key: 'code', header: 'Mã đơn' },
    { key: 'vehicleName', header: 'Xe' },
    { key: 'customerName', header: 'Khách hàng' },
    { key: 'startDate', header: 'Ngày nhận', render: (row) => formatDate(row.startDate) },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const withdrawalColumns = [
    { key: 'requestCode', header: 'Mã rút tiền' },
    { key: 'amount', header: 'Số tiền', render: (row) => formatCurrency(row.amount) },
    { key: 'createdAt', header: 'Thời gian', render: (row) => formatDate(row.createdAt) },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <section>
      <PageHeader
        title="Tổng quan chủ xe"
        description="Theo dõi trạnh trạng xe, đơn thuê và doanh thu của bạn một cách nhanh chóng và trực quan."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Tổng số xe" value={data?.summary?.totalVehicles || 0} />
        <SummaryCard title="Xe đang hoạt động" value={data?.summary?.activeVehicles || 0} tone="positive" />
        <SummaryCard title="Đơn chờ xác nhận" value={data?.summary?.pendingBookings || 0} tone="warning" />
        <SummaryCard title="Doanh thu tháng" value={formatCurrency(data?.summary?.monthlyRevenue || 0)} tone="info" />
      </div>

      {(() => {
        const trend = data?.monthlyTrend || [];
        const maxValue = Math.max(...trend.map((t) => t.revenue), 1);
        return trend.length > 0 ? (
          <article className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Xu hướng doanh thu theo tháng</h3>
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
          </article>
        ) : null;
      })()}

      <div className="mt-4 grid gap-4">
        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-800">Đơn thuê gần đây</h3>
          <DataTable
            columns={bookingColumns}
            rows={data?.latestBookings || []}
            loading={isLoading}
            error={isError}
            emptyMessage="Chưa có đơn thuê nào."
          />
        </div>

        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-800">Rút tiền gần đây</h3>
          <DataTable
            columns={withdrawalColumns}
            rows={data?.latestWithdrawals || []}
            loading={isLoading}
            error={isError}
            emptyMessage="Chưa có yêu cầu rút tiền nào."
          />
        </div>
      </div>
    </section>
  );
}
