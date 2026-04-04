import { formatCurrency, formatDateTime } from '../../../utils/format';

const directionClass = {
  credit: 'text-emerald-700',
  debit: 'text-rose-700',
};

const statusClass = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-sky-200 bg-sky-50 text-sky-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function PaymentHistoryTable({ data, loading, onPageChange }) {
  const rows = data?.items || [];

  return (
    <section className="space-y-2">
      <h4 className="text-base font-bold text-slate-900">Lịch sử giao dịch/thanh toán</h4>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Mã giao dịch</th>
              <th className="px-3 py-2 font-semibold">Loại giao dịch</th>
              <th className="px-3 py-2 font-semibold">Số tiền</th>
              <th className="px-3 py-2 font-semibold">Chiều giao dịch</th>
              <th className="px-3 py-2 font-semibold">Trạng thái</th>
              <th className="px-3 py-2 font-semibold">Thời gian</th>
              <th className="px-3 py-2 font-semibold">Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Đang tải lịch sử giao dịch...
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Chưa có lịch sử giao dịch.
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.transactionCode}</td>
                  <td className="px-3 py-2 text-slate-700">{item.transactionType}</td>
                  <td className={`px-3 py-2 font-semibold ${directionClass[item.direction] || 'text-slate-800'}`}>
                    {item.direction === 'credit' ? '+' : '-'} {formatCurrency(item.amount)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{item.direction}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        statusClass[item.status] || statusClass.pending
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(item.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-700">{item.description}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Trang {data?.page || 1}/{data?.totalPages || 1} - Tổng {data?.total || 0} giao dịch
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => onPageChange(Math.max(1, (data?.page || 1) - 1))}
            disabled={(data?.page || 1) <= 1}
          >
            Trước
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onPageChange(Math.min(data?.totalPages || 1, (data?.page || 1) + 1))}
            disabled={(data?.page || 1) >= (data?.totalPages || 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}


