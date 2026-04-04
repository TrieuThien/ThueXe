export default function EmptyState({ title = 'Chưa có dữ liệu', message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="text-base font-bold text-slate-700">{title}</p>
      {message ? <p className="mt-2 text-sm text-slate-500">{message}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}


