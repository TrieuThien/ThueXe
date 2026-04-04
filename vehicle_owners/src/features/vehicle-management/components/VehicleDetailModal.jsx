import { X } from 'lucide-react';
import { formatDate } from '../../../utils/format';

export default function VehicleDetailModal({ open, vehicle, loading, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">chi tiết phương tiện</h3>
          <button type="button" className="btn" onClick={onClose}>
            <X size={16} />
            Dong
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Đang tai chi tiết xe...</p> : null}
        {!loading && !vehicle ? <p className="text-sm text-slate-500">Không co dữ liệu xe.</p> : null}
        {!loading && vehicle ? (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Biển số:</span> {vehicle.plateNumber}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Loại xe:</span> {vehicle.vehicleType}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Hang/Model:</span> {vehicle.brand} {vehicle.model}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Nam:</span> {vehicle.productionYear}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Mau:</span> {vehicle.color}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Số chỗ:</span> {vehicle.seats}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Hop so:</span> {vehicle.transmission}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Nhien lieu:</span> {vehicle.fuelType}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Số km:</span> {vehicle.odometerKm}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-3">
                <span className="font-semibold">VIN:</span> {vehicle.vin}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-3">
                <span className="font-semibold">Ngay them:</span> {formatDate(vehicle.addedAt)}
              </p>
              {vehicle.notes ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-3">
                  <span className="font-semibold">Ghi chu:</span> {vehicle.notes}
                </p>
              ) : null}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800">giấy tờ da nop</h4>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {(vehicle.documents || []).map((doc) => (
                  <div key={doc.documentTypeId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">{doc.documentTypeId}</p>
                    <p className="mt-1 text-xs text-slate-500">{doc.fileName || 'Chưa có tep'}</p>
                    {doc.fileUrl ? (
                      <a className="mt-1 inline-block text-xs font-semibold text-sky-700 hover:underline" href={doc.fileUrl} target="_blank" rel="noreferrer">
                        Xem tep
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


