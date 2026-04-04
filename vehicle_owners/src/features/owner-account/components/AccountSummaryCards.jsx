import SummaryCard from '../../../components/ui/SummaryCard';
import { formatCurrency } from '../../../utils/format';

export default function AccountSummaryCards({ summary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard title="Số xe đang quản lý" value={summary?.totalVehicles ?? 0} />
      <SummaryCard title="Số xe đang chờ duyệt" value={summary?.pendingVehicles ?? 0} tone="warning" />
      <SummaryCard title="Số đơn đang thuê" value={summary?.activeRentals ?? 0} tone="info" />
      <SummaryCard title="Số dư ví" value={formatCurrency(summary?.walletBalance ?? 0)} tone="positive" />
    </div>
  );
}
