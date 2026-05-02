import { useState } from 'react';

const PAYMENT_METHODS = [
  { value: 'sepay',  label: 'SePay (QR/Ngân hàng)', badge: 'bg-blue-100 text-blue-700' },
  { value: 'momo',   label: 'MoMo', badge: 'bg-pink-100 text-pink-700' },
  { value: 'banking', label: 'Nạp tiền (Giả lập)', badge: 'bg-yellow-100 text-yellow-700' },
];

export default function TopupWalletForm({ submitting, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('sepay');
  const [error, setError] = useState('');

  const submit = () => {
    const numberAmount = Number(amount);
    setError('');

    if (!numberAmount || numberAmount <= 0) {
      setError('Vui lòng nhập số tiền nạp hợp lệ.');
      return;
    }

    onSubmit({ amount: numberAmount, method });
    setAmount('');
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-base font-bold text-slate-900">Nạp tiền vào ví</h4>
      <p className="mt-1 text-sm text-slate-500">Tạo giao dịch nạp tiền vào ví Chủ xe qua cổng thanh toán.</p>
      <div className="mt-3 space-y-3">
        <input
          className="input-field"
          type="number"
          min={0}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Nhập số tiền nạp vào ví"
        />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">Chọn phương thức</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setMethod(pm.value)}
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all',
                  method === pm.value
                    ? `${pm.badge} border-current`
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'Đang tạo thanh toán...' : 'Nạp tiền'}
        </button>
      </div>
    </article>
  );
}


