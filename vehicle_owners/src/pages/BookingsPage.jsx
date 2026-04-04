import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/ui/SearchFilterBar';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { ownerService } from '../services/ownerService';
import { BOOKING_STATUS, STATUS_LABELS } from '../constants/ownerStatus';
import { formatCurrency, formatDate } from '../utils/format';

const statusOptions = Object.values(BOOKING_STATUS).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState({ page: 1, pageSize: 5, search: '', status: 'all' });
  const [actionTarget, setActionTarget] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-bookings', query],
    queryFn: () => ownerService.getBookings(query),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => ownerService.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
      toast.success('Cập nhật Trạng thái don thành công');
      setActionTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = useMemo(
    () => [
      { key: 'code', header: 'Mã don' },
      { key: 'vehicleName', header: 'Xe' },
      { key: 'customerName', header: 'khách hàng' },
      {
        key: 'time',
        header: 'Thời gian thue',
        render: (row) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}`,
      },
      { key: 'totalAmount', header: 'Tong tien', render: (row) => formatCurrency(row.totalAmount) },
      { key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
      {
        key: 'action',
        header: 'Thao tac',
        render: (row) => (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn"
              onClick={() =>
                setActionTarget({
                  id: row.id,
                  status: BOOKING_STATUS.CONFIRMED,
                  label: 'xac nhan',
                })
              }
              disabled={row.status === BOOKING_STATUS.CONFIRMED || row.status === BOOKING_STATUS.COMPLETED}
            >
              Xac nhan
            </button>
            <button
              type="button"
              className="btn btn-Đanger"
              onClick={() =>
                setActionTarget({
                  id: row.id,
                  status: BOOKING_STATUS.CANCELED,
                  label: 'Hủy',
                })
              }
              disabled={row.status === BOOKING_STATUS.CANCELED || row.status === BOOKING_STATUS.COMPLETED}
            >
              Hủy
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <section>
      <PageHeader
        title="Quản lý đơn thuê"
        description="Lọc theo trạng thái đơn, xác nhận lịch thuê, xử lý đơn hủy nhanh chóng."
      />

      <SearchFilterBar
        searchValue={query.search}
        onSearchChange={(search) => setQuery((prev) => ({ ...prev, page: 1, search }))}
        statusValue={query.status}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, page: 1, status }))}
        statusOptions={statusOptions}
        onReset={() => setQuery((prev) => ({ ...prev, page: 1, search: '', status: 'all' }))}
        searchPlaceholder="Tìm theo mã don, ten xe, khách hàng"
      />

      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={isLoading}
        error={isError}
        pagination={data}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        emptyMessage="Không co don thue phu hop bo loc."
      />

      <ConfirmDialog
        open={Boolean(actionTarget)}
        title="Xac nhan thao tac"
        message={`Ban chac chan muon ${actionTarget?.label || ''} don nay?`}
        onCancel={() => setActionTarget(null)}
        onConfirm={() => mutation.mutate({ id: actionTarget.id, status: actionTarget.status })}
        loading={mutation.isPending}
      />
    </section>
  );
}


