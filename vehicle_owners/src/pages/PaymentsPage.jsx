import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/ui/SearchFilterBar';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { ownerService } from '../services/ownerService';
import { PAYMENT_STATUS, STATUS_LABELS } from '../constants/ownerStatus';
import { formatCurrency, formatDateTime } from '../utils/format';

const statusOptions = Object.values(PAYMENT_STATUS).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export default function PaymentsPage() {
  const [query, setQuery] = useState({ page: 1, pageSize: 6, search: '', status: 'all' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-payments', query],
    queryFn: () => ownerService.getPayments(query),
  });

  const columns = useMemo(
    () => [
      { key: 'bookingCode', header: 'Mã don' },
      { key: 'customerName', header: 'khách hàng' },
      { key: 'amount', header: 'Số tien', render: (row) => formatCurrency(row.amount) },
      { key: 'method', header: 'Phuong thuc' },
      { key: 'paidAt', header: 'Thời gian', render: (row) => formatDateTime(row.paidAt) },
      { key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
    ],
    [],
  );

  return (
    <section>
      <PageHeader
        title="Quản lý thanh toán"
        description="Kiểm tra tiền cọc, tiền thanh toán và các giao dịch thất bại để xử lý kịp thời."
      />

      <SearchFilterBar
        searchValue={query.search}
        onSearchChange={(search) => setQuery((prev) => ({ ...prev, page: 1, search }))}
        statusValue={query.status}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, page: 1, status }))}
        statusOptions={statusOptions}
        onReset={() => setQuery((prev) => ({ ...prev, page: 1, search: '', status: 'all' }))}
        searchPlaceholder="Tìm theo mã đơn, khách hàng, phương thức thanh toán"
      />

      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={isLoading}
        error={isError}
        pagination={data}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        emptyMessage="Chưa có lịch sử thanh toán."
      />
    </section>
  );
}



