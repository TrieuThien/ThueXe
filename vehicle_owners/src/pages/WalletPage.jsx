import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import SummaryCard from '../components/ui/SummaryCard';
import DataTable from '../components/ui/DataTable';
import { ownerService } from '../services/ownerService';
import { formatCurrency, formatDateTime } from '../utils/format';

export default function WalletPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-wallet'],
    queryFn: ownerService.getWalletOverview,
  });

  const columns = useMemo(
    () => [
      { key: 'title', header: 'Nội dung' },
      { key: 'date', header: 'Thời gian', render: (row) => formatDateTime(row.date) },
      {
        key: 'amount',
        header: 'Số tiền',
        render: (row) => (
          <span className={`font-bold ${row.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
            {row.type === 'income' ? '+' : '-'} {formatCurrency(row.amount)}
          </span>
        ),
      },
      { key: 'type', header: 'Loại' },
    ],
    [],
  );

  return (
    <section>
      <PageHeader
        title="Ví chủ xe"
        description="Theo dõi số dư khả dụng, số dư tạm giữ và lịch sử biến động để quản trị dòng tiền."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Số dư khả dụng" value={formatCurrency(data?.wallet.availableBalance || 0)} tone="positive" />
        <SummaryCard title="Số dư tạm giữ" value={formatCurrency(data?.wallet.pendingBalance || 0)} tone="warning" />
        <SummaryCard title="Doanh thu tháng" value={formatCurrency(data?.wallet.totalRevenueMonth || 0)} tone="info" />
        <SummaryCard title="Chi phí bảo trì tháng" value={formatCurrency(data?.wallet.totalMaintenanceMonth || 0)} />
      </div>

      <h3 className="mb-3 mt-4 text-lg font-bold text-slate-800">Lịch sử giao dịch</h3>
      <DataTable
        columns={columns}
        rows={data?.transactions || []}
        loading={isLoading}
        error={isError}
        emptyMessage="Chưa có giao dịch ví."
      />
    </section>
  );
}


