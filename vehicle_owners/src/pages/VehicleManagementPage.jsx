import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import VehicleRegistrationForm from '../features/vehicle-management/components/VehicleRegistrationForm';
import VehicleManagementTable from '../features/vehicle-management/components/VehicleManagementTable';
import VehicleDetailModal from '../features/vehicle-management/components/VehicleDetailModal';
import VehicleDocumentsModal from '../features/vehicle-management/components/VehicleDocumentsModal';
import VerificationAlertBanner from '../features/owner-account/components/VerificationAlertBanner';
import { vehicleManagementService } from '../services/vehicleManagementService';
import { vehicleDocumentService } from '../services/vehicleDocumentService';
import { ownerVerificationService } from '../services/ownerVerificationService';

const initialQuery = {
  search: '',
  status: 'all',
  page: 1,
  pageSize: 8,
};

export default function VehicleManagementPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(initialQuery);
  const [activeVehicleId, setActiveVehicleId] = useState('');
  const [documentVehicleId, setDocumentVehicleId] = useState('');
  const [duplicatePlateError, setDuplicatePlateError] = useState('');

  const verificationStatusQuery = useQuery({
    queryKey: ['owner-verification-status'],
    queryFn: ownerVerificationService.getVerificationStatus,
  });

  const verificationStatus = verificationStatusQuery.data?.status;
  const isVerified = verificationStatus === 'verified';

  const vehicleTypesQuery = useQuery({
    queryKey: ['vehicle-management-type-options'],
    queryFn: vehicleManagementService.getVehicleTypeOptions,
  });

  const documentCatalogQuery = useQuery({
    queryKey: ['vehicle-management-document-catalog'],
    queryFn: vehicleDocumentService.getVehicleDocumentCatalog,
  });

  const listQuery = useQuery({
    queryKey: ['vehicle-management-list', query],
    queryFn: () => vehicleManagementService.getOwnerVehicles(query),
  });

  const activeVehicleDetailQuery = useQuery({
    queryKey: ['vehicle-management-detail', activeVehicleId],
    queryFn: () => vehicleManagementService.getVehicleDetail(activeVehicleId),
    enabled: Boolean(activeVehicleId),
  });

  const documentVehicleDetailQuery = useQuery({
    queryKey: ['vehicle-management-document-detail', documentVehicleId],
    queryFn: () => vehicleManagementService.getVehicleDetail(documentVehicleId),
    enabled: Boolean(documentVehicleId),
  });

  const createVehicleMutation = useMutation({
    mutationFn: vehicleManagementService.createVehicle,
    onSuccess: () => {
      setDuplicatePlateError('');
      toast.success('Đăng ký xe thành công. Hồ sơ đã được gửi duyệt.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-list'] });
    },
    onError: (error) => {
      if (error.cođể === 'PLATE_ALREADY_EXISTS') {
        setDuplicatePlateError(error.message);
      } else {
        setDuplicatePlateError('');
        toast.error(error.message || 'Không thể Đăng ký xe.');
      }
    },
  });

  const updateDocumentsMutation = useMutation({
    mutationFn: ({ vehicleId, payload }) =>
      vehicleDocumentService.upsertVehicleDocuments(vehicleId, payload),
    onSuccess: () => {
      toast.success('Cập nhật giấy tờ thành công.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-document-detail', documentVehicleId] });
      setDocumentVehicleId('');
    },
    onError: (error) => toast.error(error.message || 'Không thể cập nhật giấy tờ.'),
  });

  const updateVehiclePhotoMutation = useMutation({
    mutationFn: ({ vehicleId, photoFile }) =>
      vehicleManagementService.updateVehiclePhoto(vehicleId, photoFile),
    onSuccess: () => {
      toast.success('Cập nhật ảnh xe thành công.');
      queryClient.invalidateQueries({ queryKey: ['vehicle-management-detail', activeVehicleId] });
    },
    onError: (error) => toast.error(error.message || 'Không thể cập nhật ảnh xe.'),
  });

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý phương tiện"
        description="Đăng ký xe mới, theo dõi trạng thái đăng ký và cập nhật giấy tờ theo từng phương tiện."
      />

      <VerificationAlertBanner verificationStatus={verificationStatus} />

      <VehicleRegistrationForm
        vehicleTypes={vehicleTypesQuery.data?.items || []}
        documentCatalog={documentCatalogQuery.data?.items || []}
        submitting={createVehicleMutation.isPending}
        duplicatePlateError={duplicatePlateError}
        isVerified={isVerified}
        onSubmit={(values) => {
          setDuplicatePlateError('');
          createVehicleMutation.mutate(values);
        }}
      />

      <VehicleManagementTable
        data={listQuery.data}
        query={query}
        loading={listQuery.isLoading}
        onSearchChange={(search) => setQuery((prev) => ({ ...prev, search, page: 1 }))}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        onOpenDetail={setActiveVehicleId}
        onOpenDocumentModal={setDocumentVehicleId}
      />

      <VehicleDetailModal
        open={Boolean(activeVehicleId)}
        vehicle={activeVehicleDetailQuery.data}
        loading={activeVehicleDetailQuery.isLoading}
        uploadingPhoto={updateVehiclePhotoMutation.isPending}
        onClose={() => setActiveVehicleId('')}
        onUpdatePhoto={(photoFile) =>
          updateVehiclePhotoMutation.mutate({ vehicleId: activeVehicleId, photoFile })
        }
      />

      <VehicleDocumentsModal
        open={Boolean(documentVehicleId)}
        vehicle={documentVehicleDetailQuery.data}
        documentCatalog={documentCatalogQuery.data?.items || []}
        loading={documentVehicleDetailQuery.isLoading}
        submitting={updateDocumentsMutation.isPending}
        onClose={() => setDocumentVehicleId('')}
        onSubmit={(vehicleId, payload) => updateDocumentsMutation.mutate({ vehicleId, payload })}
      />
    </section>
  );
}
