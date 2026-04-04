import { formatCurrency, formatDateTime } from '../../../utils/format';

const withdrawalStatusClass = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-sky-200 bg-sky-50 text-sky-700',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function WalletBalanceCard({ wallet, withdrawalRequests }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-base font-bold text-slate-900">Số dư ví và tài khoản nhận tiền</h4>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold">Số dư hiện tại:</span> {formatCurrency(wallet?.currentBalance || 0)}
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold">Số dư khả dụng:</span> {formatCurrency(wallet?.availableBalance || 0)}
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold">Chờ rút tiền:</span> {formatCurrency(wallet?.pendingWithdrawal || 0)}
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold">Đang xử lý:</span> {formatCurrency(wallet?.processingWithdrawal || 0)}
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-2">
          <span className="font-semibold">Ngân hàng:</span> {wallet?.defaultBankAccount?.bankName} -{' '}
          {wallet?.defaultBankAccount?.bankAccountNumber}
        </p>
      </div>

      <div className="mt-4">
        <h5 className="text-sm font-bold text-slate-800">Yêu cầu rút tiền gần đây</h5>
        <div className="mt-2 space-y-2">
          {(withdrawalRequests?.items || []).slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
              <p className="font-semibold text-slate-800">{item.requestCode}</p>
              <p className="text-slate-700">{formatCurrency(item.amount)}</p>
              <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  withdrawalStatusClass[item.status] || withdrawalStatusClass.pending
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
          {(withdrawalRequests?.items || []).length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có yêu cầu rút tiền.</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}


