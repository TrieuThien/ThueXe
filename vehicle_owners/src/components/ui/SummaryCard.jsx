export default function SummaryCard({ title, value, subtitle, tone = 'default' }) {
  const toneClass = {
    positive: 'border-emerald-300',
    warning: 'border-amber-300',
    info: 'border-sky-300',
    default: 'border-sky-100',
  };

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${toneClass[tone] || toneClass.default}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </article>
  );
}
