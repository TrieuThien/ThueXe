import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import RentalOrderFilters from '../features/rental-bookings/components/RentalOrderFilters';
import RentalOrderTable from '../features/rental-bookings/components/RentalOrderTable';
import RentalOrderDetail from '../features/rental-bookings/components/RentalOrderDetail';
import ContractDetailModal from '../features/rental-bookings/components/ContractDetailModal';
import { rentalBookingService } from '../services/rentalBookingService';

const initialQuery = {
  search: '',
  status: 'all',
  serviceType: 'all',
  vehicleId: 'all',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 8,
};

export default function RentalBookingsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(initialQuery);
  const [quickViewId, setQuickViewId] = useState('');
  const [activeContractId, setActiveContractId] = useState('');

  const listQuery = useQuery({
    queryKey: ['rental-orders-list', query],
    queryFn: () => rentalBookingService.getRentalOrders(query),
  });

  const allOrdersQuery = useQuery({
    queryKey: ['rental-orders-filter-source'],
    queryFn: () =>
      rentalBookingService.getRentalOrders({
        ...initialQuery,
        page: 1,
        pageSize: 200,
      }),
  });

  const quickDetailQuery = useQuery({
    queryKey: ['rental-order-quick-detail', quickViewId],
    queryFn: () => rentalBookingService.getRentalOrderDetail(quickViewId),
    enabled: Boolean(quickViewId),
  });

  const contractListQuery = useQuery({
    queryKey: ['rental-order-contracts-quick', quickViewId],
    queryFn: () => rentalBookingService.getRentalContracts({ bookingId: quickViewId }),
    enabled: Boolean(quickViewId),
  });

  const contractDetailQuery = useQuery({
    queryKey: ['rental-contract-detail', activeContractId],
    queryFn: () => rentalBookingService.getContractDetail(activeContractId),
    enabled: Boolean(activeContractId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload) => rentalBookingService.updateRentalOrderStatus(quickViewId, payload),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái đơn thành công.');
      queryClient.invalidateQueries({ queryKey: ['rental-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['rental-order-quick-detail', quickViewId] });
    },
    onError: (error) => toast.error(error.message || 'Cập nhật trạng thái thất bại.'),
  });

  const vehicles = useMemo(() => {
    const map = new Map();
    (allOrdersQuery.data?.items || []).forEach((item) => {
      if (!map.has(item.vehicleId)) {
        map.set(item.vehicleId, {
          id: item.vehicleId,
          plateNumber: item.plateNumber,
          vehicleName: item.vehicleName,
        });
      }
    });
    return Array.from(map.values());
  }, [allOrdersQuery.data]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý đơn thuê"
        description="Theo dõi danh sách đơn thuê, cập nhật trạng thái và quản lý hợp đồng liên quan."
      />

      <RentalOrderFilters
        value={query}
        vehicles={vehicles}
        onChange={setQuery}
        onReset={() => setQuery(initialQuery)}
      />

      <RentalOrderTable
        data={listQuery.data}
        loading={listQuery.isLoading}
        onQuickView={setQuickViewId}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />

      {quickViewId ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-slate-100 p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Xem nhanh chi tiết đơn</h3>
            <button type="button" className="btn" onClick={() => setQuickViewId('')}>
              <X size={16} />
              Đóng
            </button>
          </div>

          <RentalOrderDetail
            booking={quickDetailQuery.data}
            loading={quickDetailQuery.isLoading}
            contracts={contractListQuery.data}
            contractsLoading={contractListQuery.isLoading}
            onStatusUpdate={(payload) => updateStatusMutation.mutate(payload)}
            onViewContractDetail={setActiveContractId}
            statusUpdating={updateStatusMutation.isPending}
          />
        </div>
      ) : null}

      <ContractDetailModal
        open={Boolean(activeContractId)}
        contract={contractDetailQuery.data}
        loading={contractDetailQuery.isLoading}
        onClose={() => setActiveContractId('')}
      />
    </section>
  );
}

