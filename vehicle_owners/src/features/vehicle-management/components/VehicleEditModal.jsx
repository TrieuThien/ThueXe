import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';

const editSchema = z.object({
  vehicleType: z.coerce.number().min(1, 'Vui lòng chọn loại xe.'),
  brand: z.string().trim().min(1, 'Vui lòng nhập hãng xe.'),
  model: z.string().trim().min(1, 'Vui lòng nhập model.'),
  productionYear: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().trim().min(1, 'Vui lòng nhập màu xe.'),
  plateNumber: z.string().trim().min(4, 'Biển số không hợp lệ.').max(15),
  vin: z.string().trim().optional().or(z.literal('')),
  seats: z.coerce.number().min(2, 'Số chỗ phải >= 2.').max(60),
  transmission: z.enum(['auto', 'manual']),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
  odometerKm: z.coerce.number().min(0, 'Số km không hợp lệ.'),
  notes: z.string().optional(),
});

export default function VehicleEditModal({ open, vehicle, vehicleTypes, documentCatalog, submitting, onClose, onSubmit }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(editSchema),
  });

  const [draftDocs, setDraftDocs] = useState({});
  const objectUrlsRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (vehicle) {
      reset({
        vehicleType: vehicle.typeId ?? '',
        brand: vehicle.brand ?? '',
        model: vehicle.model ?? '',
        productionYear: vehicle.productionYear ?? new Date().getFullYear(),
        color: vehicle.color ?? '',
        plateNumber: vehicle.plateNumber ?? '',
        vin: vehicle.vin ?? '',
        seats: vehicle.seats ?? 5,
        transmission: vehicle.transmission ?? 'auto',
        fuelType: vehicle.fuelType ?? 'petrol',
        odometerKm: vehicle.odometerKm ?? 0,
        notes: vehicle.notes ?? '',
      });
    }
  }, [vehicle, reset]);

  useEffect(() => {
    if (!vehicle || !open) return;

    const initial = {};
    (documentCatalog || []).forEach((docType) => {
      if (docType.requiresTwoSides) {
        const existingFront = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id && x.side === 'front');
        const existingBack = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id && x.side === 'back');
        const existingAny = existingFront || existingBack;
        initial[`${docType.id}_front`] = { file: null, fileName: existingFront?.fileName || '', fileUrl: existingFront?.fileUrl || '', mimeType: existingFront?.mimeType || '' };
        initial[`${docType.id}_back`] = { file: null, fileName: existingBack?.fileName || '', fileUrl: existingBack?.fileUrl || '', mimeType: existingBack?.mimeType || '' };
        initial[`${docType.id}_num`] = existingAny?.documentNumber || '';
      } else {
        const existing = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id);
        initial[docType.id] = { file: null, fileName: existing?.fileName || '', fileUrl: existing?.fileUrl || '', mimeType: existing?.mimeType || '', documentNumber: existing?.documentNumber || '' };
      }
    });
    setDraftDocs(initial);
  }, [vehicle, open, documentCatalog]);

  if (!open) return null;

  const setFile = (key, file) => {
    if (objectUrlsRef.current[key]) {
      URL.revokeObjectURL(objectUrlsRef.current[key]);
      delete objectUrlsRef.current[key];
    }
    let previewUrl = '';
    if (file) {
      previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current[key] = previewUrl;
    }
    setDraftDocs((prev) => ({
      ...prev,
      [key]: { ...prev[key], file, fileName: file?.name || prev[key]?.fileName || '', fileUrl: file ? previewUrl : prev[key]?.fileUrl || '', mimeType: file?.type || prev[key]?.mimeType || '' },
    }));
  };

  const requiredMissing = (documentCatalog || []).some((docType) => {
    if (!docType.required) return false;
    if (docType.requiresNumber && !(docType.requiresTwoSides ? draftDocs[`${docType.id}_num`] : draftDocs[docType.id]?.documentNumber)) return true;
    if (docType.requiresTwoSides) {
      return !draftDocs[`${docType.id}_front`]?.fileUrl || !draftDocs[`${docType.id}_back`]?.fileUrl;
    }
    return !draftDocs[docType.id]?.fileUrl;
  });

  function handleSave(infoValues) {
    const docs = [];
    (documentCatalog || []).forEach((docType) => {
      if (docType.requiresTwoSides) {
        const docNumber = draftDocs[`${docType.id}_num`] || null;
        ['front', 'back'].forEach((side) => {
          const key = `${docType.id}_${side}`;
          docs.push({ documentTypeId: docType.id, side, documentNumber: docNumber, fileName: draftDocs[key]?.fileName || '', fileUrl: draftDocs[key]?.fileUrl || '', mimeType: draftDocs[key]?.mimeType || '', file: draftDocs[key]?.file || null });
        });
      } else {
        docs.push({ documentTypeId: docType.id, side: 'single', documentNumber: draftDocs[docType.id]?.documentNumber || null, fileName: draftDocs[docType.id]?.fileName || '', fileUrl: draftDocs[docType.id]?.fileUrl || '', mimeType: draftDocs[docType.id]?.mimeType || '', file: draftDocs[docType.id]?.file || null });
      }
    });
    onSubmit(vehicle.id, infoValues, { documents: docs });
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl my-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cập nhật thông tin xe</h3>
            <p className="text-sm text-amber-600">
              Sau khi lưu, xe sẽ cần admin phê duyệt lại trước khi hoạt động.
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            <X size={16} /> Đóng
          </button>
        </div>

        {!vehicle ? (
          <p className="text-sm text-slate-500">Không có dữ liệu xe.</p>
        ) : (
          <form onSubmit={handleSubmit(handleSave)} className="space-y-5">
            {/* Vehicle info section */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">Thông tin xe</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label-field">Loại xe</label>
                  <select className="input-field" {...register('vehicleType')}>
                    <option value="">-- Chọn loại xe --</option>
                    {(vehicleTypes || []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {errors.vehicleType && <p className="mt-1 text-xs text-rose-600">{errors.vehicleType.message}</p>}
                </div>

                <div>
                  <label className="label-field">Biển số</label>
                  <input className="input-field" {...register('plateNumber')} placeholder="Vd: 51A-12345" />
                  {errors.plateNumber && <p className="mt-1 text-xs text-rose-600">{errors.plateNumber.message}</p>}
                </div>

                <div>
                  <label className="label-field">Hãng xe</label>
                  <input className="input-field" {...register('brand')} placeholder="Toyota, Honda..." />
                  {errors.brand && <p className="mt-1 text-xs text-rose-600">{errors.brand.message}</p>}
                </div>

                <div>
                  <label className="label-field">Model</label>
                  <input className="input-field" {...register('model')} placeholder="Camry, City..." />
                  {errors.model && <p className="mt-1 text-xs text-rose-600">{errors.model.message}</p>}
                </div>

                <div>
                  <label className="label-field">Năm sản xuất</label>
                  <input className="input-field" type="number" {...register('productionYear')} />
                  {errors.productionYear && <p className="mt-1 text-xs text-rose-600">{errors.productionYear.message}</p>}
                </div>

                <div>
                  <label className="label-field">Màu xe</label>
                  <input className="input-field" {...register('color')} placeholder="Trắng, Đen..." />
                  {errors.color && <p className="mt-1 text-xs text-rose-600">{errors.color.message}</p>}
                </div>

                <div>
                  <label className="label-field">Số chỗ ngồi</label>
                  <input className="input-field" type="number" {...register('seats')} />
                  {errors.seats && <p className="mt-1 text-xs text-rose-600">{errors.seats.message}</p>}
                </div>

                <div>
                  <label className="label-field">Hộp số</label>
                  <select className="input-field" {...register('transmission')}>
                    <option value="auto">Tự động</option>
                    <option value="manual">Số sàn</option>
                  </select>
                </div>

                <div>
                  <label className="label-field">Nhiên liệu</label>
                  <select className="input-field" {...register('fuelType')}>
                    <option value="petrol">Xăng</option>
                    <option value="diesel">Dầu</option>
                    <option value="electric">Điện</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="label-field">Số km hiện tại</label>
                  <input className="input-field" type="number" {...register('odometerKm')} />
                  {errors.odometerKm && <p className="mt-1 text-xs text-rose-600">{errors.odometerKm.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label-field">Số khung VIN (tùy chọn)</label>
                  <input className="input-field" {...register('vin')} placeholder="Số khung xe" />
                  {errors.vin && <p className="mt-1 text-xs text-rose-600">{errors.vin.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label-field">Ghi chú</label>
                  <textarea className="input-field" rows={2} {...register('notes')} placeholder="Ghi chú thêm về xe..." />
                </div>
              </div>
            </div>

            {/* Document section */}
            {(documentCatalog || []).length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">Giấy tờ xe</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {(documentCatalog || []).map((docType) => {
                    if (docType.requiresTwoSides) {
                      const existingFront = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id && x.side === 'front');
                      const existingBack = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id && x.side === 'back');
                      const rejectedSide = [existingFront, existingBack].find((x) => x?.status === 'rejected');
                      return (
                        <div key={docType.id} className={`rounded-xl border p-3 md:col-span-2 ${rejectedSide ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                          <p className="text-sm font-semibold text-slate-700">
                            {docType.title} {docType.required ? <span className="text-rose-600">*</span> : null}
                            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Yêu cầu ảnh 2 mặt</span>
                          </p>
                          {rejectedSide?.reviewNote ? (
                            <p className="mt-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">
                              <span className="font-semibold">Lý do từ chối:</span> {rejectedSide.reviewNote}
                            </p>
                          ) : null}
                          {docType.requiresNumber ? (
                            <div className="mt-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {docType.documentNumberLabel || 'Số giấy tờ'} <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                className="input-field mt-1"
                                placeholder={docType.documentNumberLabel || 'Nhập số giấy tờ'}
                                value={draftDocs[`${docType.id}_num`] || ''}
                                onChange={(e) => setDraftDocs((prev) => ({ ...prev, [`${docType.id}_num`]: e.target.value }))}
                              />
                            </div>
                          ) : null}
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {[{ side: 'front', label: 'Mặt trước' }, { side: 'back', label: 'Mặt sau' }].map(({ side, label }) => {
                              const key = `${docType.id}_${side}`;
                              const doc = draftDocs[key] || {};
                              return (
                                <div key={side} className="rounded-md border border-dashed border-slate-300 bg-white p-2">
                                  <p className="mb-1 text-xs font-semibold text-slate-600">{label} <span className="text-rose-500">*</span></p>
                                  <input type="file" accept={docType.acceptedMimeTypes.join(',')} className="input-field p-2" onChange={(e) => setFile(key, e.target.files?.[0])} />
                                  <p className="mt-1 text-xs text-slate-500">{doc.fileName || 'Chưa có tệp'}</p>
                                  {doc.fileUrl ? (
                                    doc.mimeType === 'application/pdf' ? (
                                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-sky-700 hover:underline">Preview PDF</a>
                                    ) : (
                                      <img src={doc.fileUrl} alt={`${docType.title} ${label}`} className="mt-1 h-20 w-full rounded-md object-cover" />
                                    )
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    const doc = draftDocs[docType.id] || {};
                    const existingDoc = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id && x.side === 'single');
                    const isRejected = existingDoc?.status === 'rejected';
                    return (
                      <div key={docType.id} className={`rounded-xl border p-3 ${isRejected ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                        <p className="text-sm font-semibold text-slate-700">
                          {docType.title} {docType.required ? <span className="text-rose-600">*</span> : null}
                        </p>
                        {isRejected && existingDoc?.reviewNote ? (
                          <p className="mt-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">
                            <span className="font-semibold">Lý do từ chối:</span> {existingDoc.reviewNote}
                          </p>
                        ) : null}
                        {docType.requiresNumber ? (
                          <div className="mt-2">
                            <label className="text-xs font-semibold text-slate-600">
                              {docType.documentNumberLabel || 'Số giấy tờ'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              className="input-field mt-1"
                              placeholder={docType.documentNumberLabel || 'Nhập số giấy tờ'}
                              value={doc.documentNumber || ''}
                              onChange={(e) => setDraftDocs((prev) => ({ ...prev, [docType.id]: { ...prev[docType.id], documentNumber: e.target.value } }))}
                            />
                          </div>
                        ) : null}
                        <input
                          type="file"
                          accept={docType.acceptedMimeTypes.join(',')}
                          className="input-field mt-2 p-2"
                          onChange={(e) => setFile(docType.id, e.target.files?.[0])}
                        />
                        <p className="mt-1 text-xs text-slate-500">{doc.fileName || 'Chưa có tệp'}</p>
                        {doc.fileUrl ? (
                          doc.mimeType === 'application/pdf' ? (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline">Preview PDF</a>
                          ) : (
                            <img src={doc.fileUrl} alt={docType.title} className="mt-2 h-24 w-full rounded-md object-cover" />
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {requiredMissing ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Vẫn còn giấy tờ bắt buộc chưa được cập nhật.
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || requiredMissing}>
                {submitting ? 'Đang lưu...' : 'Lưu & Gửi duyệt'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
