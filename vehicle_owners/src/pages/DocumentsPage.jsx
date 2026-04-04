import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/ui/SearchFilterBar';
import DataTable from '../components/ui/DataTable';
import VehicleDetailModal from '../features/vehicle-management/components/VehicleDetailModal';
import VehicleDocumentsModal from '../features/vehicle-management/components/VehicleDocumentsModal';
import { vehicleDocumentService } from '../services/vehicleDocumentService';
import { vehicleManagementService } from '../services/vehicleManagementService';
import { formatDate } from '../utils/format';

const verificationStatusOptions = [
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'verified', label: 'Đã xác minh' },
  { value: 'missing_documents', label: 'Thiếu giấy tờ' },
  { value: 'rejected', label: 'Bị từ chối' },
];

const verificationBadgeClass = {
  pending_review: 'border-amber-200 bg-amber-50 text-amber-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  missing_documents: 'border-rose-200 bg-rose-50 text-rose-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

const verificationLabel = {
  pending_review: 'Chờ duyệt',
  verified: 'Đã xác minh',
  missing_documents: 'Thiếu giấy tờ',
  rejected: 'Bị từ chối',
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 8,
    search: '',
    status: 'all',
  });
  const [activeVehicleId, setActiveVehicleId] = useState('');
  const [documentVehicleId, setDocumentVehicleId] = useState('');

  const vehiclesQuery = useQuery({
    queryKey: ['owner-vehicle-documents-overview', query],
    queryFn: () => vehicleManagementService.getOwnerVehicles(query),
  });

  const detailQuery = useQuery({
    queryKey: ['owner-vehicle-documents-detail', activeVehicleId],
    queryFn: () => vehicleManagementService.getVehicleDetail(activeVehicleId),
    enabled: Boolean(activeVehicleId),
  });

  const documentVehicleDetailQuery = useQuery({
    queryKey: ['owner-vehicle-documents-edit-detail', documentVehicleId],
    queryFn: () => vehicleManagementService.getVehicleDetail(documentVehicleId),
    enabled: Boolean(documentVehicleId),
  });

  const documentCatalogQuery = useQuery({
    queryKey: ['owner-vehicle-document-catalog'],
    queryFn: vehicleDocumentService.getVehicleDocumentCatalog,
  });

  const updateDocumentsMutation = useMutation({
    mutationFn: ({ vehicleId, payload }) =>
      vehicleDocumentService.upsertVehicleDocuments(vehicleId, payload),
    onSuccess: () => {
      toast.success('Cập nhật giấy tờ thành công.');
      queryClient.invalidateQueries({ queryKey: ['owner-vehicle-documents-overview'] });
      queryClient.invalidateQueries({ queryKey: ['owner-vehicle-documents-edit-detail'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-list'] });
      setDocumentVehicleId('');
    },
    onError: (error) => toast.error(error.message || 'Không thể Cập nhật giấy tờ.'),
  });

  const columns = useMemo(
    () => [
      { key: 'plateNumber', header: 'Biển số' },
      { key: 'vehicleType', header: 'Loại xe' },
      {
        key: 'verificationStatus',
        header: 'Trạng thái xác minh',
        render: (row) => (
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
              verificationBadgeClass[row.verificationStatus] || verificationBadgeClass.pending_review
            }`}
          >
            {verificationLabel[row.verificationStatus] || row.verificationStatus}
          </span>
        ),
      },
      {
        key: 'missingDocumentCount',
        header: 'Tình trạng Hồ sơ',
        render: (row) =>
          row.missingDocumentCount > 0 ? (
            <span className="font-semibold text-rose-700">Thiếu {row.missingDocumentCount} giấy tờ</span>
          ) : (
            <span className="font-semibold text-emerald-700">đầy đủ</span>
          ),
      },
      { key: 'addedAt', header: 'Ngày thêm', render: (row) => formatDate(row.addedAt) },
      {
        key: 'action',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setActiveVehicleId(row.id)}>
              Xem
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setDocumentVehicleId(row.id)}>
              Cập nhật giấy tờ
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
        title="Quản lý giấy tờ xe"
        description="Theo dõi tình trạng hồ sơ từng xe và cập nhật giấy tờ khi cần bổ sung."
      />

      <SearchFilterBar
        searchValue={query.search}
        onSearchChange={(search) => setQuery((prev) => ({ ...prev, page: 1, search }))}
        statusValue={query.status}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, page: 1, status }))}
        statusOptions={verificationStatusOptions}
        onReset={() => setQuery((prev) => ({ ...prev, page: 1, search: '', status: 'all' }))}
        searchPlaceholder="Tìm theo Biển số, hãng, model"
      />

      <DataTable
        columns={columns}
        rows={vehiclesQuery.data?.items || []}
        loading={vehiclesQuery.isLoading}
        error={vehiclesQuery.isError}
        pagination={vehiclesQuery.data}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        emptyMessage="Chưa có hồ sơ xe nào."
      />

      <VehicleDetailModal
        open={Boolean(activeVehicleId)}
        vehicle={detailQuery.data}
        loading={detailQuery.isLoading}
        onClose={() => setActiveVehicleId('')}
      />

      <VehicleDocumentsModal
        open={Boolean(documentVehicleId)}
        vehicle={documentVehicleDetailQuery.data}
        documentCatalog={documentCatalogQuery.data?.items || []}
        loading={documentVehicleDetailQuery.isLoading || documentCatalogQuery.isLoading}
        submitting={updateDocumentsMutation.isPending}
        onClose={() => setDocumentVehicleId('')}
        onSubmit={(vehicleId, payload) => updateDocumentsMutation.mutate({ vehicleId, payload })}
      />
    </section>
  );
}


