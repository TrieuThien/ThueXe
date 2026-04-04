import { useState } from 'react';
import { formatCurrency } from '../../../utils/format';

export default function WithdrawalRequestForm({ wallet, submitting, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const numberAmount = Number(amount);
    setError('');

    if (!numberAmount || numberAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    if (numberAmount < (wallet?.minimumWithdrawal || 0)) {
      setError(`Số tiền rút tối thiểu là ${formatCurrency(wallet?.minimumWithdrawal || 0)}.`);
      return;
    }
    if (numberAmount > (wallet?.availableBalance || 0)) {
      setError('Số dư khả dụng không đủ.');
      return;
    }

    onSubmit({ amount: numberAmount });
    setAmount('');
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-base font-bold text-slate-900">Yêu cầu rút tiền</h4>
      <p className="mt-1 text-sm text-slate-500">
        Số dư khả dụng: <span className="font-semibold">{formatCurrency(wallet?.availableBalance || 0)}</span>
      </p>
      <div className="mt-3 space-y-2">
        <input
          className="input-field"
          type="number"
          min={0}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Nhập số tiền muốn rút"
        />
        <p className="text-xs text-slate-500">
          Tài khoản nhận: {wallet?.defaultBankAccount?.bankName} - {wallet?.defaultBankAccount?.bankAccountNumber}
        </p>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={submitting}>
          {submitting ? 'Đang tạo yêu cầu...' : 'Gửi yêu cầu rút tiền'}
        </button>
      </div>
    </article>
  );
}


