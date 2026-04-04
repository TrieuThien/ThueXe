import { Link, useLocation } from 'react-router-dom';
import { BREADCRUMB_LABELS } from '../../constants/routes';

const toLabel = (segment) => BREADCRUMB_LABELS[segment] || segment;

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        const to = `/${parts.slice(0, index + 1).join('/')}`;

        return (
          <span key={to} className="inline-flex items-center gap-1.5">
            {isLast ? (
              <span className="font-semibold text-slate-700">{toLabel(part)}</span>
            ) : (
              <Link className="text-sky-700 hover:underline" to={to}>
                {toLabel(part)}
              </Link>
            )}
            {!isLast && <span className="text-slate-400">/</span>}
          </span>
        );
      })}
    </div>
  );
}
