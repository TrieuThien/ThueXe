import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import RevenueSummaryCards from '../features/owner-revenue/components/RevenueSummaryCards';
import RevenueByVehicleTable from '../features/owner-revenue/components/RevenueByVehicleTable';
import { ownerRevenueService } from '../services/ownerRevenueService';

const initialFilter = {
  dateFrom: '',
  dateTo: '',
};

export default function OwnerRevenuePage() {
  const [timeFilter, setTimeFilter] = useState(initialFilter);
  const [vehicleRevenuePage, setVehicleRevenuePage] = useState(1);

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

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý doanh thu chủ xe"
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
    </section>
  );
}

