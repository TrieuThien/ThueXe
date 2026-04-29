import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { OWNER_ROUTES } from '../../../constants/routes';

const vehicleSchema = z.object({
  vehicleType: z.string().min(1, 'Vui lòng chọn Loại xe.'),
  brand: z.string().trim().min(1, 'Vui lòng nhập hãng xe.'),
  model: z.string().trim().min(1, 'Vui lòng nhập model.'),
  productionYear: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().trim().min(1, 'Vui lòng nhập mẫu xe.'),
  plateNumber: z.string().trim().min(6, 'Vui lòng nhập biển số hợp lệ.'),
  vin: z.string().trim().min(10, 'Số khung (VIN) không hợp lệ.'),
  seats: z.coerce.number().min(2, 'Số chỗ phải >= 2.'),
  transmission: z.string().min(1, 'Vui lòng chọn hộp số.'),
  fuelType: z.string().min(1, 'Vui lòng chọn nhiên liệu.'),
  odometerKm: z.coerce.number().min(0, 'Số km không hợp lệ.'),
  notes: z.string().optional(),
});

const defaultValues = {
  vehicleType: '',
  brand: '',
  model: '',
  productionYear: new Date().getFullYear(),
  color: '',
  plateNumber: '',
  vin: '',
  seats: 5,
  transmission: 'auto',
  fuelType: 'petrol',
  odometerKm: 0,
  notes: '',
};

const buildPreviewUrl = (file) => {
  if (!file) {
    return '';
  }
  return URL.createObjectURL(file);
};

export default function VehicleRegistrationForm({
  vehicleTypes,
  documentCatalog,
  submitting,
  duplicatePlateError,
  isVerified = true,
  onSubmit,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues,
  });

  const [documentFiles, setDocumentFiles] = useState({});
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState('');

  const requiredMissing = useMemo(
    () =>
      (documentCatalog || []).some((docType) => {
        if (!docType.required) return false;
        if (docType.requiresTwoSides) {
          return !documentFiles[`${docType.id}_front`]?.file || !documentFiles[`${docType.id}_back`]?.file;
        }
        return !documentFiles[docType.id]?.file;
      }),
    [documentCatalog, documentFiles],
  );

  const updateFile = (key, file) => {
    setDocumentFiles((prev) => ({
      ...prev,
      [key]: {
        file,
        previewUrl: buildPreviewUrl(file),
      },
    }));
  };

  const submitForm = (values) => {
    const docs = [];
    (documentCatalog || []).forEach((docType) => {
      if (docType.requiresTwoSides) {
        const frontFile = documentFiles[`${docType.id}_front`]?.file || null;
        const backFile = documentFiles[`${docType.id}_back`]?.file || null;
        docs.push({
          documentTypeId: docType.id,
          side: 'front',
          fileName: frontFile?.name || '',
          fileUrl: frontFile ? URL.createObjectURL(frontFile) : '',
          mimeType: frontFile?.type || '',
          file: frontFile,
        });
        docs.push({
          documentTypeId: docType.id,
          side: 'back',
          fileName: backFile?.name || '',
          fileUrl: backFile ? URL.createObjectURL(backFile) : '',
          mimeType: backFile?.type || '',
          file: backFile,
        });
      } else {
        const file = documentFiles[docType.id]?.file || null;
        docs.push({
          documentTypeId: docType.id,
          side: 'single',
          fileName: file?.name || '',
          fileUrl: file ? URL.createObjectURL(file) : '',
          mimeType: file?.type || '',
          file,
        });
      }
    });

    onSubmit({
      ...values,
      plateNumber: values.plateNumber.toUpperCase(),
      vin: values.vin.toUpperCase(),
      documents: docs,
      vehiclePhoto,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Đăng ký xe mới</h3>
      <p className="mt-1 text-sm text-slate-500">Nhập thông tin xe và tải lên giấy tờ cần thiết để gửi duyệt.</p>

      {!isVerified && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">
            Tài khoản chưa được xác minh — Bạn cần hoàn tất xác minh tài khoản trước khi đăng ký xe.
          </p>
          <Link className="btn btn-primary shrink-0" to={OWNER_ROUTES.ACCOUNT_VERIFICATION}>
            Xác minh ngay
          </Link>
        </div>
      )}

      <form className="mt-4 space-y-4" onSubmit={handleSubmit(submitForm)}>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-bold text-slate-800">Thông tin cơ bản</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="form-label">Loại xe</span>
              <select className="input-field" {...register('vehicleType')}>
                <option value="">Chọn loại xe</option>
                {(vehicleTypes || []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.vehicleType ? <span className="error-text">{errors.vehicleType.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Nhãn hiệu (Brand)</span>
              <input className="input-field" {...register('brand')} />
              {errors.brand ? <span className="error-text">{errors.brand.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Số loại (Model code)</span>
              <input className="input-field" {...register('model')} />
              {errors.model ? <span className="error-text">{errors.model.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Năm sản xuất</span>
              <input className="input-field" type="number" {...register('productionYear')} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Màu xe</span>
              <input className="input-field" {...register('color')} placeholder='Ví dụ: MPV 7 chỗ hạng B đa dụng'/>
              {errors.color ? <span className="error-text">{errors.color.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Biển số</span>
              <input className="input-field" {...register('plateNumber')} placeholder='51H-123.45'/>
              {errors.plateNumber ? <span className="error-text">{errors.plateNumber.message}</span> : null}
            </label>
          </div>
          {duplicatePlateError ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {duplicatePlateError}
            </p>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-bold text-slate-800">Thông số kỹ thuật</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="form-label">Số khung (VIN)</span>
              <input className="input-field" {...register('vin')} />
              {errors.vin ? <span className="error-text">{errors.vin.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Số chỗ</span>
              <input className="input-field" type="number" {...register('seats')} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Hộp số</span>
              <select className="input-field" {...register('transmission')}>
                <option value="auto">Tự động</option>
                <option value="manual">Số sàn</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Nhiên liệu</span>
              <select className="input-field" {...register('fuelType')}>
                <option value="petrol">Xăng</option>
                <option value="diesel">Dầu</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Điện</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Số km đã đi</span>
              <input className="input-field" type="number" {...register('odometerKm')} />
            </label>
            <label className="flex flex-col gap-1 md:col-span-3">
              <span className="form-label">Ghi chú</span>
              <textarea rows={2} className="input-field resize-y" {...register('notes')} />
            </label>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-bold text-slate-800">Ảnh xe</h4>
          <p className="mt-1 text-xs text-slate-500">Tải lên ảnh đại diện của xe (JPG, PNG, WebP, tối đa 5MB).</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1">
              <input
                className="input-field p-2"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setVehiclePhoto(file);
                  setVehiclePhotoPreview(file ? URL.createObjectURL(file) : '');
                }}
              />
              {vehiclePhoto && (
                <p className="mt-1 text-xs text-slate-500">{vehiclePhoto.name}</p>
              )}
            </div>
            {vehiclePhotoPreview && (
              <img
                src={vehiclePhotoPreview}
                alt="Ảnh xe xem trước"
                className="h-32 w-48 rounded-lg border border-slate-200 object-cover"
              />
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-bold text-slate-800">Giấy tờ xe</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {(documentCatalog || []).map((docType) => {
              if (docType.requiresTwoSides) {
                return (
                  <div key={docType.id} className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                    <p className="text-sm font-semibold text-slate-700">
                      {docType.title} {docType.required ? <span className="text-rose-600">*</span> : null}
                      <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Yêu cầu ảnh 2 mặt</span>
                    </p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {[
                        { side: 'front', label: 'Mặt trước' },
                        { side: 'back', label: 'Mặt sau' },
                      ].map(({ side, label }) => {
                        const key = `${docType.id}_${side}`;
                        const fileObj = documentFiles[key];
                        return (
                          <div key={side} className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2">
                            <p className="mb-1 text-xs font-semibold text-slate-600">{label} <span className="text-rose-500">*</span></p>
                            <input
                              className="input-field p-2"
                              type="file"
                              accept={docType.acceptedMimeTypes.join(',')}
                              onChange={(event) => updateFile(key, event.target.files?.[0])}
                            />
                            <p className="mt-1 text-xs text-slate-500">{fileObj?.file?.name || 'Chưa chọn tệp'}</p>
                            {fileObj?.previewUrl ? (
                              fileObj.file.type === 'application/pdf' ? (
                                <a className="mt-1 inline-block text-xs font-semibold text-sky-700 hover:underline" href={fileObj.previewUrl} target="_blank" rel="noreferrer">Xem trước PDF</a>
                              ) : (
                                <img src={fileObj.previewUrl} alt={`${docType.title} ${label}`} className="mt-1 h-20 w-full rounded-md object-cover" />
                              )
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <label key={docType.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {docType.title} {docType.required ? <span className="text-rose-600">*</span> : null}
                  </p>
                  <input
                    className="input-field mt-2 p-2"
                    type="file"
                    accept={docType.acceptedMimeTypes.join(',')}
                    onChange={(event) => updateFile(docType.id, event.target.files?.[0])}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {documentFiles[docType.id]?.file?.name || 'Chưa chọn tệp'}
                  </p>
                  {documentFiles[docType.id]?.previewUrl ? (
                    documentFiles[docType.id].file.type === 'application/pdf' ? (
                      <a
                        className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline"
                        href={documentFiles[docType.id].previewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem trước PDF
                      </a>
                    ) : (
                      <img
                        src={documentFiles[docType.id].previewUrl}
                        alt={docType.title}
                        className="mt-2 h-24 w-full rounded-md object-cover"
                      />
                    )
                  ) : null}
                </label>
              );
            })}
          </div>
          {requiredMissing ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Bạn cần tải giấy tờ trước khi gửi hồ sơ đăng ký xe.
            </p>
          ) : null}
        </article>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset(defaultValues);
              setDocumentFiles({});
              setVehiclePhoto(null);
              setVehiclePhotoPreview('');
            }}
          >
            Làm mới form
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || requiredMissing || !isVerified}>
            {submitting ? 'Đang gửi yêu cầu đăng ký...' : 'Đăng ký xe'}
          </button>
        </div>
      </form>
    </section>
  );
}



