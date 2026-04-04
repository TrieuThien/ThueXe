import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import MaintenanceSummaryCards from '../features/vehicle-maintenance/components/MaintenanceSummaryCards';
import MaintenanceTable from '../features/vehicle-maintenance/components/MaintenanceTable';
import MaintenanceFormModal from '../features/vehicle-maintenance/components/MaintenanceFormModal';
import { OWNER_ROUTES } from '../constants/routes';
import { vehicleMaintenanceService } from '../services/vehicleMaintenanceService';

const initialQuery = {
  search: '',
  vehicleId: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 8,
};

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(initialQuery);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const recordsQuery = useQuery({
    queryKey: ['vehicle-maintenance-records', query],
    queryFn: () => vehicleMaintenanceService.getMaintenanceRecords(query),
  });

  const vehicleOptionsQuery = useQuery({
    queryKey: ['vehicle-maintenance-vehicle-options'],
    queryFn: vehicleMaintenanceService.getVehicleOptions,
  });

  const statsQuery = useQuery({
    queryKey: ['vehicle-maintenance-stats', query],
    queryFn: () => vehicleMaintenanceService.getMaintenanceStats(query),
  });

  const createMutation = useMutation({
    mutationFn: vehicleMaintenanceService.createMaintenanceRecord,
    onSuccess: () => {
      toast.success('Thêm phieu bao tri thành công.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-list'] });
      setModalOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => toast.error(error.message || 'Không thể Thêm phieu bao tri.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => vehicleMaintenanceService.updateMaintenanceRecord(id, payload),
    onSuccess: () => {
      toast.success('Cập nhật phieu bao tri thành công.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-list'] });
      setModalOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => toast.error(error.message || 'Không thể Cập nhật phieu bao tri.'),
  });

  const deleteMutation = useMutation({
    mutationFn: vehicleMaintenanceService.deleteMaintenanceRecord,
    onSuccess: () => {
      toast.success('Da Xóa phieu bao tri.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-list'] });
    },
    onError: (error) => toast.error(error.message || 'Không thể Xóa phieu bao tri.'),
  });

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý bảo trì xe"
        description="Theo dõi lịch bảo trì theo từng xe, cập nhật trạng thái và quản lý chi phí hiệu quả."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingRecord(null);
              setModalOpen(true);
            }}
          >
            Thêm lịch bảo trì
          </button>
        } 
      />

      <article className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Xe ở trạng thái <span className="font-bold">đang bảo trì</span> sẽ không khả dụng cho thuê.
        <Link className="ml-2 font-bold text-amber-900 underline" to={OWNER_ROUTES.VEHICLE_ACTIVITY}>
          Xem nhanh trang hoạt động xe
        </Link>
      </article>

      <MaintenanceSummaryCards stats={statsQuery.data} />

      <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input
            className="input-field xl:col-span-2"
            value={query.search}
            onChange={(event) => setQuery((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
            placeholder="Tìm theo Biển số, mô tả, ghi chú..."
          />

          <select
            className="input-field"
            value={query.vehicleId}
            onChange={(event) => setQuery((prev) => ({ ...prev, vehicleId: event.target.value, page: 1 }))}
          >
            <option value="all">Tất cả xe</option>
            {(vehicleOptionsQuery.data?.items || []).map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plateNumber} - {vehicle.displayName}
              </option>
            ))}
          </select>

          <select
            className="input-field"
            value={query.status}
            onChange={(event) => setQuery((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="in_progress">Đang bảo trì</option>
            <option value="completed">Hoàn tất</option>
          </select>

          <input
            className="input-field"
            type="date"
            value={query.dateFrom}
            onChange={(event) => setQuery((prev) => ({ ...prev, dateFrom: event.target.value, page: 1 }))}
          />
          <input
            className="input-field"
            type="date"
            value={query.dateTo}
            onChange={(event) => setQuery((prev) => ({ ...prev, dateTo: event.target.value, page: 1 }))}
          />
        </div>
      </article>

      <MaintenanceTable
        data={recordsQuery.data}
        loading={recordsQuery.isLoading}
        onOpenEdit={(record) => {
          setEditingRecord(record);
          setModalOpen(true);
        }}
        onDelete={(id) => deleteMutation.mutate(id)}
        onChangeStatus={(id, payload) => updateMutation.mutate({ id, payload })}
        statusUpdating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />

      <MaintenanceFormModal
        open={modalOpen}
        vehicles={vehicleOptionsQuery.data?.items || []}
        editingRecord={editingRecord}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={(values) => {
          if (editingRecord) {
            updateMutation.mutate({
              id: editingRecord.id,
              payload: values,
            });
            return;
          }
          createMutation.mutate(values);
        }}
      />
    </section>
  );
}


