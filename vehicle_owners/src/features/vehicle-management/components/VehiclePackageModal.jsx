import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Loader2, Package, X } from 'lucide-react';
import { rentalPackageService } from '../../../services/rentalPackageService';

function formatVnd(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function durationLabel(pkg) {
  const parts = [];
  if (pkg.duration_hours) parts.push(`${pkg.duration_hours} giờ`);
  if (pkg.duration_days) parts.push(`${pkg.duration_days} ngày`);
  return parts.join(' / ') || '—';
}

/**
 * Modal cho phép chủ xe xem & gán các gói thuê hợp lệ vào xe.
 *
 * Props:
 *   open        - boolean
 *   vehicle     - { vehicle_id, brand, model, license_plate, type_id }
 *   onClose     - () => void
 *   onSaved     - () => void   (gọi sau khi gán thành công)
 */
export default function VehiclePackageModal({ open, vehicle, onClose, onSaved }) {
  const [selected, setSelected] = useState(new Set());

  // Tải danh sách gói thuê xe đang active
  const packagesQuery = useQuery({
    queryKey: ['owner-rental-packages'],
    queryFn: rentalPackageService.listVehicleRentalPackages,
    enabled: open,
    select: (data) => data?.items ?? [],
  });

  // Tải các gói hiện đang gán cho xe
  const vehiclePackagesQuery = useQuery({
    queryKey: ['owner-vehicle-packages', vehicle?.id],
    queryFn: () => rentalPackageService.getVehiclePackages(vehicle.id),
    enabled: open && Boolean(vehicle?.id),
    select: (data) => data?.packages ?? [],
  });

  // Khởi tạo selected từ dữ liệu đang gán
  useEffect(() => {
    if (vehiclePackagesQuery.data) {
      setSelected(new Set(vehiclePackagesQuery.data.map((p) => p.package_id)));
    }
  }, [vehiclePackagesQuery.data]);

  const setMutation = useMutation({
    mutationFn: (ids) => rentalPackageService.setVehiclePackages(vehicle.id, ids),
    onSuccess: () => {
      toast.success('Đã cập nhật gói thuê cho xe.');
      onSaved?.();
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Không thể cập nhật gói thuê.'),
  });

  function togglePackage(packageId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  }

  function handleSave() {
    setMutation.mutate([...selected]);
  }

  if (!open) return null;

  const allPackages = packagesQuery.data ?? [];
  const isLoading = packagesQuery.isLoading || vehiclePackagesQuery.isLoading;

  // Lọc gói phù hợp: type_id null = áp dụng mọi loại xe; type_id !== null = chỉ xe cùng loại
  const compatiblePackages = allPackages.filter(
    (p) => p.type_id === null || Number(p.type_id) === vehicle?.typeId
  );
  const incompatiblePackages = allPackages.filter(
    (p) => p.type_id !== null && Number(p.type_id) !== vehicle?.typeId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-xl rounded-[24px] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-sky-500" />
              <h3 className="text-base font-semibold text-slate-900">Gói thuê cho xe</h3>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {vehicle?.brand} {vehicle?.model} · {vehicle?.plateNumber}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isLoading ? (
            <div className="flex min-h-32 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải...
            </div>
          ) : compatiblePackages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Hiện chưa có gói thuê hợp lệ cho loại xe này.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Gói phù hợp với xe ({compatiblePackages.length})
              </p>
              {compatiblePackages.map((pkg) => {
                const isChecked = selected.has(pkg.package_id);
                return (
                  <button
                    key={pkg.package_id}
                    type="button"
                    onClick={() => togglePackage(pkg.package_id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      isChecked
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isChecked ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{pkg.package_name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span>Thời lượng: {durationLabel(pkg)}</span>
                        <span>Giới hạn: {pkg.distance_limit_km} km</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">{formatVnd(pkg.price)} ₫</p>
                      {Number(pkg.deposit_amount) > 0 && (
                        <p className="text-xs text-slate-400">Đặt cọc {formatVnd(pkg.deposit_amount)} ₫</p>
                      )}
                    </div>
                  </button>
                );
              })}

              {incompatiblePackages.length > 0 && (
                <p className="mt-4 text-xs text-slate-400">
                  {incompatiblePackages.length} gói không áp dụng cho loại xe này (bị ẩn).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={setMutation.isPending}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {setMutation.isPending ? 'Đang lưu...' : `Lưu (${selected.size} gói)`}
          </button>
        </div>
      </div>
    </div>
  );
}
