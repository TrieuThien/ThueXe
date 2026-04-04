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
    { key: 'bankName', header: 'Ngân hàng' },
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
