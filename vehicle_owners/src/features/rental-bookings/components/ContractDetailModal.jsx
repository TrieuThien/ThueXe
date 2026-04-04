import { X } from 'lucide-react';
import { formatDateTime } from '../../../utils/format';

export default function ContractDetailModal({ open, contract, loading, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-bold text-slate-900">chi tiết hop dong</h4>
          <button type="button" className="btn" onClick={onClose}>
            <X size={16} />
            Dong
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Đang tai chi tiết hop dong...</p> : null}
        {!loading && !contract ? <p className="text-sm text-slate-500">Không co dữ liệu hop dong.</p> : null}
        {!loading && contract ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold text-slate-700">Mã hop dong:</span> {contract.contractCode}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Tieu de:</span> {contract.title}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Trạng thái:</span> {contract.status}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Ngay ky:</span>{' '}
              {contract.signedAt ? formatDateTime(contract.signedAt) : 'Chưa ky'}
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-700">Tom tat noi dung</p>
              <p className="mt-1 text-slate-600">{contract.contentPreview || 'Không cơ bản tom tat.'}</p>
            </div>
            {contract.fileUrl ? (
              <a className="btn btn-primary" href={contract.fileUrl} target="_blank" rel="noreferrer">
                Xem/Tai hop dong
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}


