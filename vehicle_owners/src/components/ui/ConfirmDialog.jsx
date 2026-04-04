export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Xac nhan',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  loading,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xu ly...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

