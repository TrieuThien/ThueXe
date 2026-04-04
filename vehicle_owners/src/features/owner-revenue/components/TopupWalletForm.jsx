import { useState } from 'react';

export default function TopupWalletForm({ submitting, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('VNPay');
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
      <p className="mt-1 text-sm text-slate-500">Mô phỏng flow Tạo payment để nạp tiền nhanh vào ví Chủ xe.</p>
      <div className="mt-3 space-y-2">
        <input
          className="input-field"
          type="number"
          min={0}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Nhập số tiền nạp vào ví"
        />
        <select className="input-field" value={method} onChange={(event) => setMethod(event.target.value)}>
          <option value="VNPay">VNPay</option>
          <option value="Momo">Momo</option>
          <option value="BankTransfer">Chuyển khoản</option>
        </select>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'Đang tạo thanh toán...' : 'Tạo giao dịch nạp tiền'}
        </button>
      </div>
    </article>
  );
}


