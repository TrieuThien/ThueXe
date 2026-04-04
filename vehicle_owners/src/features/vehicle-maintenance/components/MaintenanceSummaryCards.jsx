import SummaryCard from '../../../components/ui/SummaryCard';
import { formatCurrency } from '../../../utils/format';

export default function MaintenanceSummaryCards({ stats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        title="Số xe đang bảo trì"
        value={stats?.activeVehiclesUnderMaintenance || 0}
        tone="warning"
      />
      <SummaryCard title="Lịch sắp tới" value={stats?.upcomingSchedules || 0} tone="info" />
      <SummaryCard
        title="Tổng chi phí bảo trì"
        value={formatCurrency(stats?.totalMaintenanceCost || 0)}
        tone="default"
      />
    </div>
  );
}


