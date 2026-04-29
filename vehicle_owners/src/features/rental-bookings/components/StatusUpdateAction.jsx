import { useMemo, useState } from 'react';
import { RENTAL_ORDER_STATUS_LABELS } from '../constants';

const bookingStatusTransitions = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['in_progress', 'canceled'],
  in_progress: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

export default function StatusUpdateAction({ booking, loading, onSubmit }) {
  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');

  const nextOptions = useMemo(
    () => (booking ? bookingStatusTransitions[booking.orderStatus] || [] : []),
    [booking],
  );

  if (!booking) {
    return null;
  }

  if (nextOptions.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Đơn ở trạng thái cuối, Không thể cập nhật thêm.
      </p>
    );
  }

  const submit = () => {
    if (!nextStatus) {
      return;
    }
    onSubmit({
      nextStatus,
      note: note.trim(),
      cancelNote: nextStatus === 'canceled' ? note.trim() : '',
    });
    setNextStatus('');
    setNote('');
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-base font-bold text-slate-900">Cập nhật trạng thái đơn</h4>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <select className="input-field" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
          <option value="">Chọn trạng thái mới</option>
          {nextOptions.map((status) => (
            <option key={status} value={status}>
              {RENTAL_ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input
          className="input-field"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={nextStatus === 'canceled' ? 'Nhập ghi chú hủy (bắt buộc)' : 'Ghi chú cập nhật (nếu có)'}
        />
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!nextStatus || loading}>
          {loading ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      </div>
    </article>
  );
}



