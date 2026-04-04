import { CalendarDays, FileCheck2, FileText, ImageIcon, UploadCloud } from 'lucide-react';
import { useEffect, useMemo } from 'react';

const formatSize = (bytes = 0) => {
  if (!bytes) {
    return '0 MB';
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const toAcceptValue = (mimeTypes = []) => mimeTypes.join(',');

export default function DocumentUploadCard({
  documentType,
  value,
  disabled,
  onChange,
  onFileError,
}) {
  const previewUrl = useMemo(() => {
    if (value?.file) {
      return URL.createObjectURL(value.file);
    }
    return value?.fileUrl || '';
  }, [value?.file, value?.fileUrl]);

  useEffect(() => {
    return () => {
      if (value?.file && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, value?.file]);

  const isImagePreview =
    (value?.file && value.file.type.startsWith('image/')) ||
    (!value?.file && String(value?.mimeType || '').startsWith('image/'));
  const isPdfPreview =
    (value?.file && value.file.type === 'application/pdf') ||
    (!value?.file && value?.mimeType === 'application/pdf');

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const mimeAccepted = documentType.acceptedMimeTypes.includes(file.type);
    if (!mimeAccepted) {
      onFileError(`${documentType.title}: Định dạng file không hợp lệ.`);
      return;
    }

    const maxBytes = documentType.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      onFileError(`${documentType.title}: Dung lượng tối đa ${documentType.maxSizeMB}MB.`);
      return;
    }

    onChange(documentType.id, { file });
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 md:text-base">{documentType.title}</h3>
          <p className="mt-1 text-xs text-slate-600 md:text-sm">{documentType.description}</p>
        </div>
        {documentType.required ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
            Bắt buộc
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="form-label inline-flex items-center gap-1.5">
            <FileText size={14} />
            Số giấy tờ {documentType.requiresNumber ? '*' : '(nếu có)'}
          </span>
          <input
            className="input-field"
            value={value?.documentNumber || ''}
            disabled={disabled}
            onChange={(event) => onChange(documentType.id, { documentNumber: event.target.value })}
            placeholder="Nhập số giấy tờ"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="form-label inline-flex items-center gap-1.5">
            <CalendarDays size={14} />
            Ngày hết hạn {documentType.requiresExpiryDate ? '*' : '(nếu có)'}
          </span>
          <input
            className="input-field"
            type="date"
            value={value?.expiryDate || ''}
            disabled={disabled}
            onChange={(event) => onChange(documentType.id, { expiryDate: event.target.value })}
          />
        </label>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
          <UploadCloud size={16} />
          {disabled ? 'Hồ sơ đã khóa chỉ chỉnh sửa' : 'Tải lên ảnh/scan giấy tờ'}
          <input
            type="file"
            className="hidden"
            accept={toAcceptValue(documentType.acceptedMimeTypes)}
            disabled={disabled}
            onChange={handleFileChange}
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Hồ sơ: JPG, PNG, PDF. Dung lượng tối đa {documentType.maxSizeMB}MB.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Tập hiện tại: <span className="font-semibold">{value?.file?.name || value?.fileName || 'Chưa tải lên'}</span>
          {value?.file?.size || value?.fileSize ? (
            <span className="ml-1">({formatSize(value?.file?.size || value?.fileSize)})</span>
          ) : null}
        </p>
      </div>

      {previewUrl ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Xem trước</p>
          {isImagePreview ? (
            <img src={previewUrl} alt={documentType.title} className="max-h-44 w-full rounded-lg object-cover" />
          ) : null}
          {isPdfPreview ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FileCheck2 size={16} />
              Xem file PDF
            </a>
          ) : null}
          {!isImagePreview && !isPdfPreview ? (
            <p className="inline-flex items-center gap-2 text-sm text-slate-700">
              <ImageIcon size={16} />
              Không thể xem trước định dạng này.
            </p>
          ) : null}
        </div>
      ) : null}

      {value?.adminNote ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Ghi chú của quản trị viên: {value.adminNote}
        </p>
      ) : null}
    </article>
  );
}

