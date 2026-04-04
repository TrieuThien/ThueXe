import { Download, Eye } from 'lucide-react';
import { formatDateTime } from '../../../utils/format';

export default function ContractList({ contracts, loading, onViewDetail }) {
  const rows = contracts?.items || [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-base font-bold text-slate-900">Danh sach hop dong</h4>
      {loading ? <p className="mt-2 text-sm text-slate-500">Đang tai hop dong...</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Chưa có hop dong lien quan.</p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rows.map((contract) => (
            <div key={contract.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{contract.contractCode}</p>
                <p className="text-sm text-slate-600">{contract.title}</p>
                <p className="text-xs text-slate-500">
                  {contract.signedAt ? `Ky luc: ${formatDateTime(contract.signedAt)}` : 'Chưa ky'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn" onClick={() => onViewDetail(contract.id)}>
                  <Eye size={14} />
                  chi tiết
                </button>
                {contract.fileUrl ? (
                  <a className="btn" href={contract.fileUrl} target="_blank" rel="noreferrer">
                    <Download size={14} />
                    Tai
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}


