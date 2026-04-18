import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function VehicleDocumentsModal({
  open,
  vehicle,
  documentCatalog,
  loading,
  onClose,
  onSubmit,
  submitting,
}) {
  const [draftDocs, setDraftDocs] = useState({});
  const objectUrlsRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!vehicle || !open) {
      return;
    }

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

  if (!open) {
    return null;
  }

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
      [key]: {
        ...prev[key],
        file,
        fileName: file?.name || prev[key]?.fileName || '',
        fileUrl: file ? previewUrl : prev[key]?.fileUrl || '',
        mimeType: file?.type || prev[key]?.mimeType || '',
      },
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

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Cập nhật giấy tờ xe</h3>
          <button type="button" className="btn" onClick={onClose}>
            <X size={16} />
            Đóng
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Đang tai Hồ sơ giấy tờ...</p> : null}
        {!loading && !vehicle ? <p className="text-sm text-slate-500">Không tim thay thông tin xe.</p> : null}
        {!loading && vehicle ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Xe: <span className="font-semibold text-slate-900">{vehicle.plateNumber}</span>
            </p>

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
                              <input type="file" accept={docType.acceptedMimeTypes.join(',')} className="input-field p-2" onChange={(event) => setFile(key, event.target.files?.[0])} />
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
                      onChange={(event) => setFile(docType.id, event.target.files?.[0])}
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
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Vẫn còn giấy tờ bắt buộc chưa được cập nhật.
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn" onClick={onClose}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting || requiredMissing}
                onClick={() => {
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
                  onSubmit(vehicle.id, { documents: docs });
                }}
              >
                {submitting ? 'Đang Cập nhật...' : 'Lưu giấy tờ'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


