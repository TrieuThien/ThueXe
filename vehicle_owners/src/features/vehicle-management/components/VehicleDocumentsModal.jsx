import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!vehicle || !open) {
      return;
    }

    const initial = {};
    (documentCatalog || []).forEach((docType) => {
      const existing = (vehicle.documents || []).find((x) => x.documentTypeId === docType.id);
      initial[docType.id] = {
        file: null,
        fileName: existing?.fileName || '',
        fileUrl: existing?.fileUrl || '',
        mimeType: existing?.mimeType || '',
      };
    });
    setDraftDocs(initial);
  }, [vehicle, open, documentCatalog]);

  if (!open) {
    return null;
  }

  const setFile = (docTypeId, file) => {
    setDraftDocs((prev) => ({
      ...prev,
      [docTypeId]: {
        ...prev[docTypeId],
        file,
        fileName: file?.name || prev[docTypeId]?.fileName || '',
        fileUrl: file
          ? file.type === 'application/pdf'
            ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            : `https://placehold.co/600x400.png?text=${encodeURIComponent(file.name)}`
          : prev[docTypeId]?.fileUrl || '',
        mimeType: file?.type || prev[docTypeId]?.mimeType || '',
      },
    }));
  };

  const requiredMissing = (documentCatalog || []).some((docType) => {
    if (!docType.required) {
      return false;
    }
    const item = draftDocs[docType.id];
    return !item?.fileUrl;
  });

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Cập nhật giấy tờ xe</h3>
          <button type="button" className="btn" onClick={onClose}>
            <X size={16} />
            Dong
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
                const doc = draftDocs[docType.id] || {};
                return (
                  <label key={docType.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {docType.name} {docType.required ? <span className="text-rose-600">*</span> : null}
                    </p>
                    <input
                      type="file"
                      accept={docType.acceptedMimeTypes.join(',')}
                      className="input-field mt-2 p-2"
                      onChange={(event) => setFile(docType.id, event.target.files?.[0])}
                    />
                    <p className="mt-1 text-xs text-slate-500">{doc.fileName || 'Chưa có tep'}</p>
                    {doc.fileUrl ? (
                      doc.mimeType === 'application/pdf' ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline"
                        >
                          Preview PDF
                        </a>
                      ) : (
                        <img src={doc.fileUrl} alt={docType.name} className="mt-2 h-24 w-full rounded-md object-cover" />
                      )
                    ) : null}
                  </label>
                );
              })}
            </div>

            {requiredMissing ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Van con giấy tờ bat buoc Chưa duoc Cập nhật.
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
                  const docs = (documentCatalog || []).map((docType) => ({
                    documentTypeId: docType.id,
                    fileName: draftDocs[docType.id]?.fileName || '',
                    fileUrl: draftDocs[docType.id]?.fileUrl || '',
                    mimeType: draftDocs[docType.id]?.mimeType || '',
                    file: draftDocs[docType.id]?.file || null,
                  }));

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


