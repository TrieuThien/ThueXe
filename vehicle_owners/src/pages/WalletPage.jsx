import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SummaryCard from '../components/ui/SummaryCard';
import PaymentHistoryTable from '../features/owner-revenue/components/PaymentHistoryTable';
import WalletBalanceCard from '../features/owner-revenue/components/WalletBalanceCard';
import WithdrawalRequestForm from '../features/owner-revenue/components/WithdrawalRequestForm';
import TopupWalletForm from '../features/owner-revenue/components/TopupWalletForm';
import { ownerRevenueService } from '../services/ownerRevenueService';
import { ownerService } from '../services/ownerService';
import { formatCurrency, formatDateTime } from '../utils/format';

const initialFilter = {
  dateFrom: '',
  dateTo: '',
};

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState(initialFilter);
  const [ledgerPage, setLedgerPage] = useState(1);

  
  const walletBalanceQuery = useQuery({
    queryKey: ['owner-revenue-wallet'],
    queryFn: ownerRevenueService.getWalletBalance,
  });

  const ledgerQuery = useQuery({
    queryKey: ['owner-revenue-ledger', timeFilter, ledgerPage],
    queryFn: () =>
      ownerRevenueService.getWalletLedger({
        ...timeFilter,
        page: ledgerPage,
        pageSize: 10,
      }),
  });

  const paymentHistoryQuery = useQuery({
    queryKey: ['owner-revenue-payment-history', timeFilter],
    queryFn: () =>
      ownerRevenueService.getPaymentHistory({
        ...timeFilter,
        page: 1,
        pageSize: 5,
      }),
  });

  const withdrawalRequestsQuery = useQuery({
    queryKey: ['owner-revenue-withdraw-requests'],
    queryFn: () =>
      ownerRevenueService.getWithdrawalRequests({
        page: 1,
        pageSize: 5,
      }),
  });

  const withdrawalMutation = useMutation({
    mutationFn: ownerRevenueService.createWithdrawalRequest,
    onSuccess: () => {
      toast.success('Đã tạo yêu cầu rút tiền.');
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-summary'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-withdraw-requests'] });
    },
    onError: (error) => toast.error(error.message || 'Không thể tạo yêu cầu rút tiền.'),
  });

  const topupMutation = useMutation({
    mutationFn: ownerRevenueService.createTopupTransaction,
    onSuccess: (data) => {
      if (data.paymentUrl) {
        toast.success('Đang chuyển đến trang thanh toán...');
        window.open(data.paymentUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.success('Nạp tiền thành công!');
        queryClient.invalidateQueries({ queryKey: ['owner-revenue-summary'] });
        queryClient.invalidateQueries({ queryKey: ['owner-revenue-wallet'] });
        queryClient.invalidateQueries({ queryKey: ['owner-revenue-ledger'] });
        queryClient.invalidateQueries({ queryKey: ['owner-revenue-payment-history'] });
      }
    },
    onError: (error) => toast.error(error.message || 'Không thể tạo giao dịch nạp tiền.'),
  });

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
    <section className="space-y-4 px-3 py-4 sm:px-4 lg:px-6">
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

      <WalletBalanceCard
        wallet={walletBalanceQuery.data}
        withdrawalRequests={withdrawalRequestsQuery.data}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <WithdrawalRequestForm
          wallet={walletBalanceQuery.data}
          submitting={withdrawalMutation.isPending}
          onSubmit={(payload) => withdrawalMutation.mutate(payload)}
        />
        <TopupWalletForm
          submitting={topupMutation.isPending}
          onSubmit={(payload) => topupMutation.mutate(payload)}
        />
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
        Số bản ghi thanh toán gần đây: <span className="font-semibold">{paymentHistoryQuery.data?.total || 0}</span>
      </article>

      <PaymentHistoryTable data={ledgerQuery.data} loading={ledgerQuery.isLoading} onPageChange={setLedgerPage} />

      
    </section>
  );
}


