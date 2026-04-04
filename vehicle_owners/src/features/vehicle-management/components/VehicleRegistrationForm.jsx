import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const vehicleSchema = z.object({
  vehicleType: z.string().min(1, 'Vui lòng chọn Loại xe.'),
  brand: z.string().trim().min(1, 'Vui lòng nhập hãng xe.'),
  model: z.string().trim().min(1, 'Vui lòng nhập model.'),
  productionYear: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().trim().min(1, 'Vui lòng nhập màu xe.'),
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
  transmission: 'automatic',
  fuelType: 'gasoline',
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

  const requiredMissing = useMemo(
    () =>
      (documentCatalog || []).some(
        (docType) => docType.required && !documentFiles[docType.id]?.file,
      ),
    [documentCatalog, documentFiles],
  );

  const updateFile = (docTypeId, file) => {
    setDocumentFiles((prev) => ({
      ...prev,
      [docTypeId]: {
        file,
        previewUrl: buildPreviewUrl(file),
      },
    }));
  };

  const submitForm = (values) => {
    const docs = (documentCatalog || []).map((docType) => {
      const fileObj = documentFiles[docType.id];
      const file = fileObj?.file;
      return {
        documentTypeId: docType.id,
        fileName: file?.name || '',
        fileUrl: file
          ? file.type === 'application/pdf'
            ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            : `https://placehold.co/600x400.png?text=${encodeURIComponent(file.name)}`
          : '',
        mimeType: file?.type || '',
        file,
      };
    });

    onSubmit({
      ...values,
      plateNumber: values.plateNumber.toUpperCase(),
      vin: values.vin.toUpperCase(),
      documents: docs,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Đăng ký xe mới</h3>
      <p className="mt-1 text-sm text-slate-500">Nhập thông tin xe và tải lên giấy tờ cần thiết để gửi duyệt.</p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit(submitForm)}>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-bold text-slate-800">Thông tin cơ bản</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="form-label">Loại xe</span>
              <select className="input-field" {...register('vehicleType')}>
                <option value="">Chọn loại xe</option>
                {(vehicleTypes || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errors.vehicleType ? <span className="error-text">{errors.vehicleType.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Hãng xe</span>
              <input className="input-field" {...register('brand')} />
              {errors.brand ? <span className="error-text">{errors.brand.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Model</span>
              <input className="input-field" {...register('model')} />
              {errors.model ? <span className="error-text">{errors.model.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Năm sản xuất</span>
              <input className="input-field" type="number" {...register('productionYear')} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Mẫu xe</span>
              <input className="input-field" {...register('color')} />
              {errors.color ? <span className="error-text">{errors.color.message}</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Biển số</span>
              <input className="input-field" {...register('plateNumber')} />
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
                <option value="automatic">Tự động</option>
                <option value="manual">Số sàn</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="form-label">Nhiên liệu</span>
              <select className="input-field" {...register('fuelType')}>
                <option value="gasoline">Xăng</option>
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
          <h4 className="text-sm font-bold text-slate-800">Giấy tờ xe</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {(documentCatalog || []).map((docType) => (
              <label key={docType.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-700">
                  {docType.name} {docType.required ? <span className="text-rose-600">*</span> : null}
                </p>
                <input
                  className="input-field mt-2 p-2"
                  type="file"
                  accept={docType.acceptedMimeTypes.join(',')}
                  onChange={(event) => updateFile(docType.id, event.target.files?.[0])}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {documentFiles[docType.id]?.file?.name || 'Chưa chọn tep'}
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
                      alt={docType.name}
                      className="mt-2 h-24 w-full rounded-md object-cover"
                    />
                  )
                ) : null}
              </label>
            ))}
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
            }}
          >
            Làm mới form
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || requiredMissing}>
            {submitting ? 'Đang gửi yêu cầu đăng ký...' : 'Đăng ký xe'}
          </button>
        </div>
      </form>
    </section>
  );
}



