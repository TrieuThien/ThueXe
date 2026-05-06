import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Loader2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { vehicleManagementService } from '../services/vehicleManagementService';
import { rentalPackageService } from '../services/rentalPackageService';
import VehiclePackageModal from '../features/vehicle-management/components/VehiclePackageModal';

function formatVnd(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function durationLabel(pkg) {
  const parts = [];
  if (pkg.duration_hours) parts.push(`${pkg.duration_hours} giờ`);
  if (pkg.duration_days) parts.push(`${pkg.duration_days} ngày`);
  return parts.join(' / ') || '—';
}

function VehicleAppliedPackages({ vehicleId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['owner-vehicle-packages', vehicleId],
    queryFn: () => rentalPackageService.getVehiclePackages(vehicleId),
    select: (d) => d?.packages ?? [],
  });
  if (isLoading) return <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />Đang tải...</span>;
  if (!data?.length) return <span className="text-xs text-slate-400">Chưa gán gói</span>;
  return <span className="text-xs text-slate-600">{data.map((p) => p.package_name).join(', ')}</span>;
}

export default function RentalPackagesPage() {
  const queryClient = useQueryClient();
  const [packageVehicleId, setPackageVehicleId] = useState('');

  // Danh sách gói thuê xe đang active (service_type=1)
  const packagesQuery = useQuery({
    queryKey: ['owner-rental-packages'],
    queryFn: rentalPackageService.listVehicleRentalPackages,
    select: (data) => data?.items ?? [],
  });

  // Danh sách xe của chủ xe (để chọn xe gán gói)
  const vehiclesQuery = useQuery({
    queryKey: ['vehicle-management-list-all'],
    queryFn: () => vehicleManagementService.getOwnerVehicles({ pageSize: 100 }),
    select: (data) => data?.items ?? [],
  });

  const selectedVehicle = vehiclesQuery.data?.find(
    (v) => String(v.id) === String(packageVehicleId)
  ) ?? null;

  const packages = packagesQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Cài đặt gói cho thuê xe"
        description="Xem các gói thuê do hệ thống cung cấp và gán gói phù hợp cho từng xe của bạn."
      />

      {/* --- Bảng gói thuê --- */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-slate-800">Gói thuê xe đang áp dụng</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Giá và điều kiện do quản trị viên cài đặt — chủ xe không chỉnh giá.
          </p>
        </div>

        {packagesQuery.isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">Đang tải...</div>
        ) : packages.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Hiện chưa có gói thuê nào được kích hoạt.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Tên gói</th>
                  <th className="px-5 py-3 text-left">Áp dụng loại xe</th>
                  <th className="px-5 py-3 text-left">Thời lượng</th>
                  <th className="px-5 py-3 text-right">Giá (₫)</th>
                  <th className="px-5 py-3 text-right">Đặt cọc (₫)</th>
                  <th className="px-5 py-3 text-right">Km giới hạn</th>
                  <th className="px-5 py-3 text-right">Phí km vượt</th>
                  <th className="px-5 py-3 text-right">Phí giờ vượt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((pkg) => (
                  <tr key={pkg.package_id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-800">{pkg.package_name}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {pkg.type_id !== null ? `Loại xe #${pkg.type_id}` : 'Tất cả loại'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{durationLabel(pkg)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatVnd(pkg.price)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatVnd(pkg.deposit_amount)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{pkg.distance_limit_km} km</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatVnd(pkg.extra_km_fee)}/km</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatVnd(pkg.extra_hour_fee)}/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Gán gói thuê cho xe --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Gán gói thuê cho xe</h2>
        <p className="mb-4 text-xs text-slate-500">
          Chọn xe, sau đó nhấn "Cài gói" để xem và chọn các gói thuê phù hợp.
        </p>

        {vehiclesQuery.isLoading ? (
          <p className="text-sm text-slate-400">Đang tải danh sách xe...</p>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-slate-500">Bạn chưa đăng ký xe nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Xe</th>
                  <th className="px-4 py-3 text-left">Biển số</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Gói đang áp dụng</th>
                  <th className="px-4 py-3 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {v.brand} {v.model} {v.productionYear ? `(${v.productionYear})` : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.plateNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          v.usageStatus === 'available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {v.usageStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <VehicleAppliedPackages vehicleId={v.id} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setPackageVehicleId(String(v.id))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Cài gói
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal chọn gói cho xe */}
      <VehiclePackageModal
        open={Boolean(packageVehicleId)}
        vehicle={selectedVehicle}
        onClose={() => setPackageVehicleId('')}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['owner-vehicle-packages', Number(packageVehicleId)] });
        }}
      />
    </section>
  );
}
