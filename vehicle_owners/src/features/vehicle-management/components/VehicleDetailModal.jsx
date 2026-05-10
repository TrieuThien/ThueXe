import { X } from 'lucide-react';
import { formatDate } from '../../../utils/format';

function groupDocuments(docs) {
  const map = new Map();
  for (const doc of docs) {
    if (!map.has(doc.documentTypeId)) {
      map.set(doc.documentTypeId, {
        documentTypeId: doc.documentTypeId,
        documentTitle: doc.documentTitle,
        requiresTwoSides: doc.requiresTwoSides,
        sides: {},
      });
    }
    const group = map.get(doc.documentTypeId);
    const sideKey = doc.side || 'single';
    group.sides[sideKey] = doc;
    if (doc.requiresTwoSides) group.requiresTwoSides = true;
  }
  return Array.from(map.values());
}

const fuelLangMap = new Map([
  ['petrol', "Xăng"],
  ['diesel', "Dầu"],
  ['electric', "Điện"],
  ['hybrid', 'Hybrid']
])

export default function VehicleDetailModal({ open, vehicle, loading, uploadingPhoto, onClose, onUpdatePhoto }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/35 p-4">
      <div className="mx-auto my-4 w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Chi tiết phương tiện</h3>
          <button type="button" className="btn" onClick={onClose}>
            <X size={16} />
            Đóng
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Đang tai chi tiết xe...</p> : null}
        {!loading && !vehicle ? <p className="text-sm text-slate-500">Không co dữ liệu xe.</p> : null}
        {!loading && vehicle ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {vehicle.photoUrl ? (
                <img
                  src={vehicle.photoUrl}
                  alt={`Ảnh xe ${vehicle.plateNumber}`}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 w-full flex-col items-center justify-center gap-2 bg-slate-50">
                  <span className="text-5xl">🚗</span>
                  <p className="text-sm text-slate-400">Chưa có ảnh xe</p>
                </div>
              )}
              <label className={`flex cursor-pointer items-center justify-center gap-1.5 border-t border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 ${uploadingPhoto ? 'pointer-events-none opacity-60' : ''}`}>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpdatePhoto(file);
                    e.target.value = '';
                  }}
                />
                {uploadingPhoto ? 'Đang tải lên...' : vehicle.photoUrl ? '🔄 Đổi ảnh xe' : '📷 Thêm ảnh xe'}
              </label>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Biển số:</span> {vehicle.plateNumber}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Loại xe:</span> {vehicle.vehicleType}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Hãng/Model:</span> {vehicle.brand} {vehicle.model}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Năm sản xuất:</span> {vehicle.productionYear}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Màu xe:</span> {vehicle.color}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Số chỗ:</span> {vehicle.seats}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Hộp số:</span> {vehicle.transmission == "auto" ? "Tự động" : "Số sàn"}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Nhiên liệu:</span> {fuelLangMap.get(vehicle.fuelType)}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">Số km:</span> {vehicle.odometerKm}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-3">
                <span className="font-semibold">Số khung (VIN):</span> {vehicle.vin}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-3">
                <span className="font-semibold">Ngày thêm:</span> {formatDate(vehicle.addedAt)}
              </p>
              {vehicle.notes ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-3">
                  <span className="font-semibold">Ghi chú:</span> {vehicle.notes}
                </p>
              ) : null}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800">Giấy tờ đã nộp</h4>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {groupDocuments(vehicle.documents || []).map((group) => (
                  <div key={group.documentTypeId} className={`rounded-lg border border-slate-200 bg-slate-50 p-3${group.requiresTwoSides ? ' md:col-span-2' : ''}`}>
                    <p className="text-sm font-semibold text-slate-700">
                      {group.documentTitle || group.documentTypeId}
                      {group.requiresTwoSides ? (
                        <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">2 mặt</span>
                      ) : null}
                    </p>
                    {group.requiresTwoSides ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {[{ side: 'front', label: 'Mặt trước' }, { side: 'back', label: 'Mặt sau' }].map(({ side, label }) => {
                          const doc = group.sides[side];
                          return (
                            <div key={side} className="rounded-md border border-dashed border-slate-300 bg-white p-2">
                              <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
                              {doc ? (
                                doc.mimeType === 'application/pdf' ? (
                                  <a className="text-xs font-semibold text-sky-700 hover:underline" href={doc.fileUrl} target="_blank" rel="noreferrer">Xem PDF</a>
                                ) : doc.fileUrl ? (
                                  <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                    <img src={doc.fileUrl} alt={`${group.documentTitle} ${label}`} className="h-24 w-full rounded-md object-cover" />
                                  </a>
                                ) : <p className="text-xs text-slate-400">Chưa có tệp</p>
                              ) : <p className="text-xs text-slate-400">Chưa có tệp</p>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-xs text-slate-500">{group.sides.single?.fileName || 'Chưa có tệp'}</p>
                        {group.sides.single?.fileUrl ? (
                          group.sides.single.mimeType === 'application/pdf' ? (
                            <a className="mt-1 inline-block text-xs font-semibold text-sky-700 hover:underline" href={group.sides.single.fileUrl} target="_blank" rel="noreferrer">Xem PDF</a>
                          ) : (
                            <a href={group.sides.single.fileUrl} target="_blank" rel="noreferrer">
                              <img src={group.sides.single.fileUrl} alt={group.documentTitle || group.documentTypeId} className="mt-2 h-32 w-full rounded-md object-cover" />
                            </a>
                          )
                        ) : null}
                      </>
                    )}
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


