import { STATUS_LABELS, STATUS_VARIANTS } from '../../constants/ownerStatus';

const variantClass = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  Đanger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  neutral: 'bg-slate-200 text-slate-700',
};

export default function StatusBadge({ status }) {
  const variant = STATUS_VARIANTS[status] || 'neutral';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${variantClass[variant]}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

