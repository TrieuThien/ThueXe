import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import RevenueSummaryCards from '../features/owner-revenue/components/RevenueSummaryCards';
import RevenueByVehicleTable from '../features/owner-revenue/components/RevenueByVehicleTable';
import PaymentHistoryTable from '../features/owner-revenue/components/PaymentHistoryTable';
import WalletBalanceCard from '../features/owner-revenue/components/WalletBalanceCard';
import WithdrawalRequestForm from '../features/owner-revenue/components/WithdrawalRequestForm';
import TopupWalletForm from '../features/owner-revenue/components/TopupWalletForm';
import { ownerRevenueService } from '../services/ownerRevenueService';

const initialFilter = {
  dateFrom: '',
  dateTo: '',
};

export default function OwnerRevenuePage() {
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState(initialFilter);
  const [vehicleRevenuePage, setVehicleRevenuePage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);

  const summaryQuery = useQuery({
    queryKey: ['owner-revenue-summary', timeFilter],
    queryFn: () => ownerRevenueService.getRevenueSummary(timeFilter),
  });

  const vehicleRevenueQuery = useQuery({
    queryKey: ['owner-revenue-by-vehicle', timeFilter, vehicleRevenuePage],
    queryFn: () =>
      ownerRevenueService.getRevenueByVehicle({
        ...timeFilter,
        page: vehicleRevenuePage,
        pageSize: 6,
      }),
  });

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
      toast.success(`Tạo payment thành công: ${data.paymentCode}`);
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-summary'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-payment-history'] });
    },
    onError: (error) => toast.error(error.message || 'Không thể tạo giao dịch nạp tiền.'),
  });

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý doanh thu Chủ xe"
        description="Theo dõi doanh thu, ví, lịch sử giao dịch và thực hiện rút/nạp tiền."
      />

      <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="input-field"
            type="date"
            value={timeFilter.dateFrom}
            onChange={(event) => setTimeFilter((prev) => ({ ...prev, dateFrom: event.target.value }))}
          />
          <input
            className="input-field"
            type="date"
            value={timeFilter.dateTo}
            onChange={(event) => setTimeFilter((prev) => ({ ...prev, dateTo: event.target.value }))}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              setTimeFilter(initialFilter);
              setVehicleRevenuePage(1);
              setLedgerPage(1);
            }}
          >
            Đặt lại thời gian
          </button>
        </div>
      </article>

      <RevenueSummaryCards summary={summaryQuery.data} />


      <RevenueByVehicleTable
        data={vehicleRevenueQuery.data}
        loading={vehicleRevenueQuery.isLoading}
        onPageChange={setVehicleRevenuePage}
      />


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


