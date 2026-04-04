import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import RentalOrderDetail from '../features/rental-bookings/components/RentalOrderDetail';
import ContractDetailModal from '../features/rental-bookings/components/ContractDetailModal';
import { OWNER_ROUTES } from '../constants/routes';
import { rentalBookingService } from '../services/rentalBookingService';

export default function RentalBookingDetailPage() {
  const { bookingId = '' } = useParams();
  const queryClient = useQueryClient();
  const [activeContractId, setActiveContractId] = useState('');

  const detailQuery = useQuery({
    queryKey: ['rental-order-detail-page', bookingId],
    queryFn: () => rentalBookingService.getRentalOrderDetail(bookingId),
    enabled: Boolean(bookingId),
  });

  const contractsQuery = useQuery({
    queryKey: ['rental-order-contracts-detail', bookingId],
    queryFn: () => rentalBookingService.getRentalContracts({ bookingId }),
    enabled: Boolean(bookingId),
  });

  const contractDetailQuery = useQuery({
    queryKey: ['rental-contract-detail-page', activeContractId],
    queryFn: () => rentalBookingService.getContractDetail(activeContractId),
    enabled: Boolean(activeContractId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload) => rentalBookingService.updateRentalOrderStatus(bookingId, payload),
    onSuccess: () => {
      toast.success('Cập nhật Trạng thái thành công.');
      queryClient.invalidateQueries({ queryKey: ['rental-order-detail-page', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['rental-orders-list'] });
    },
    onError: (error) => toast.error(error.message || 'Không Cập nhật duoc Trạng thái.'),
  });

  return (
    <section className="space-y-4">
      <PageHeader
        title="chi tiết don thue"
        description="Xem thông tin đầy đủ don thue, timeline, hop dong va Cập nhật Trạng thái theo quy tac."
        actions={
          <Link className="btn" to={OWNER_ROUTES.BOOKINGS}>
            Quay lai danh sach
          </Link>
        }
      />

      <RentalOrderDetail
        booking={detailQuery.data}
        loading={detailQuery.isLoading}
        contracts={contractsQuery.data}
        contractsLoading={contractsQuery.isLoading}
        onStatusUpdate={(payload) => updateStatusMutation.mutate(payload)}
        onViewContractDetail={setActiveContractId}
        statusUpdating={updateStatusMutation.isPending}
      />

      <ContractDetailModal
        open={Boolean(activeContractId)}
        contract={contractDetailQuery.data}
        loading={contractDetailQuery.isLoading}
        onClose={() => setActiveContractId('')}
      />
    </section>
  );
}

