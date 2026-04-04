import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import VehicleListTable from '../features/vehicle-activity/components/VehicleListTable';
import VehicleMapView from '../features/vehicle-activity/components/VehicleMapView';
import VehicleAvailabilityCalendar from '../features/vehicle-activity/components/VehicleAvailabilityCalendar';
import VehicleActivityGantt from '../features/vehicle-activity/components/VehicleActivityGantt';
import { vehicleActivityService } from '../services/vehicleActivityService';

const tabs = [
  { key: 'list', label: 'Danh sách xe' },
  { key: 'map', label: 'Bản đồ vị trí xe' },
  { key: 'calendar', label: 'Lịch khả dụng' },
  { key: 'gantt', label: 'Lược đồ Gantt' },
];

const formatDateInput = (date) => {
  const d = new Date(date);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function VehicleActivityPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('list');
  const [listQuery, setListQuery] = useState({
    search: '',
    status: 'all',
    page: 1,
    pageSize: 8,
  });
  const [mapStatusFilter, setMapStatusFilter] = useState('all');
  const [calendarView, setCalendarView] = useState('week');
  const [anchorDate, setAnchorDate] = useState(formatDateInput(new Date()));
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const listVehiclesQuery = useQuery({
    queryKey: ['vehicle-activity-list', listQuery],
    queryFn: () => vehicleActivityService.getOwnerVehicles(listQuery),
  });

  const mapVehiclesQuery = useQuery({
    queryKey: ['vehicle-activity-map', mapStatusFilter],
    queryFn: () => vehicleActivityService.getVehicleLocations({ status: mapStatusFilter }),
  });

  const availabilityWindow = useMemo(() => {
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);
    const rangeDays = calendarView === 'day' ? 1 : calendarView === 'month' ? 30 : 7;
    const end = new Date(start);
    end.setDate(start.getDate() + rangeDays);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [anchorDate, calendarView]);

  const availabilityQuery = useQuery({
    queryKey: ['vehicle-activity-availability', selectedVehicleId, calendarView, availabilityWindow],
    queryFn: () =>
      vehicleActivityService.getVehicleAvailability(selectedVehicleId, {
        view: calendarView,
        from: availabilityWindow.from,
        to: availabilityWindow.to,
      }),
    enabled: Boolean(selectedVehicleId),
  });

  const ganttQuery = useQuery({
    queryKey: ['vehicle-activity-gantt', listQuery.status],
    queryFn: () =>
      vehicleActivityService.getVehicleGanttTimeline({
        from: availabilityWindow.from,
        to: availabilityWindow.to,
        status: listQuery.status,
      }),
  });

  const createBlockMutation = useMutation({
    mutationFn: ({ vehicleId, payload }) => vehicleActivityService.createAvailabilityBlock(vehicleId, payload),
    onSuccess: () => {
      toast.success('Tạo lịch thành công.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-availability'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-gantt'] });
    },
    onError: (error) => toast.error(error.message || 'Không thể tạo lịch.'),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: ({ vehicleId, blockId }) => vehicleActivityService.deleteAvailabilityBlock(vehicleId, blockId),
    onSuccess: () => {
      toast.success('Đã xóa lịch.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-availability'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-gantt'] });
    },
    onError: (error) => toast.error(error.message || 'Không thể xóa lịch.'),
  });

  const allVehicles = listVehiclesQuery.data?.items || [];

  useEffect(() => {
    if (!selectedVehicleId && allVehicles.length > 0) {
      setSelectedVehicleId(allVehicles[0].id);
    }
  }, [allVehicles, selectedVehicleId]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý hoạt động xe"
        description="Theo dõi danh sách xe, bản đồ vị trí, lịch khả dụng và lược đồ Gantt hoạt động của xe."
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {allVehicles.length === 0 && !listVehiclesQuery.isLoading ? (
        <EmptyState
          title="Chưa có xe nào"
          message="Bạn chưa có xe đăng ký. Hãy thêm xe để bắt đầu theo dõi hoạt động và lịch cho thuê."
        />
      ) : null}

      {activeTab === 'list' ? (
        <VehicleListTable
          data={listVehiclesQuery.data}
          query={listQuery}
          loading={listVehiclesQuery.isLoading}
          onSearchChange={(search) => setListQuery((prev) => ({ ...prev, search, page: 1 }))}
          onStatusChange={(status) => setListQuery((prev) => ({ ...prev, status, page: 1 }))}
          onPageChange={(page) => setListQuery((prev) => ({ ...prev, page }))}
        />
      ) : null}

      {activeTab === 'map' ? (
        <VehicleMapView
          locations={mapVehiclesQuery.data}
          loading={mapVehiclesQuery.isLoading}
          statusFilter={mapStatusFilter}
          onStatusFilterChange={setMapStatusFilter}
        />
      ) : null}

      {activeTab === 'calendar' ? (
        <VehicleAvailabilityCalendar
          vehicles={allVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectedVehicleIdChange={setSelectedVehicleId}
          calendarView={calendarView}
          onCalendarViewChange={setCalendarView}
          anchorDate={anchorDate}
          onAnchorDateChange={setAnchorDate}
          availabilityData={availabilityQuery.data}
          loading={availabilityQuery.isLoading}
          onCreateBlock={(vehicleId, payload) => createBlockMutation.mutate({ vehicleId, payload })}
          onDeleteBlock={(vehicleId, blockId) => deleteBlockMutation.mutate({ vehicleId, blockId })}
          submitting={createBlockMutation.isPending || deleteBlockMutation.isPending}
        />
      ) : null}

      {activeTab === 'gantt' ? (
        <VehicleActivityGantt timelineData={ganttQuery.data} loading={ganttQuery.isLoading} />
      ) : null}
    </section>
  );
}


