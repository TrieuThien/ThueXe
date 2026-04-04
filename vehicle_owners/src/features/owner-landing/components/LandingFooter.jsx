import { Link } from 'react-router-dom';
import { Car, Mail, MapPin, Phone } from 'lucide-react';

export default function LandingFooter({ t }) {
  const mapTarget = ['benefits', 'steps', 'features', 'cta'];

  const onScrollTo = (target) => {
    const nođể = document.getElementById(target);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="mt-10 bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <Car size={18} />
              </span>
              <p className="text-xl font-bold">{t.brand.name}</p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{t.footer.description}</p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wiđể text-white">{t.footer.quickLinksTitle}</p>
            <div className="flex flex-col gap-2">
              {t.footer.quickLinks.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onScrollTo(mapTarget[index])}
                  className="w-fit text-sm text-slate-300 transition hover:text-amber-400"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wiđể text-white">{t.footer.accountTitle}</p>
            <div className="flex flex-col gap-2">
              <Link to="/owner/login" className="w-fit text-sm text-slate-300 transition hover:text-amber-400">
                {t.actions.login}
              </Link>
              <Link to="/owner/register" className="w-fit text-sm text-slate-300 transition hover:text-amber-400">
                {t.actions.register}
              </Link>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wiđể text-white">{t.footer.contactTitle}</p>
            <div className="space-y-2 text-sm text-slate-300">
              <p className="inline-flex items-center gap-2"><MapPin size={14} className="text-amber-400" /> {t.footer.contactAddress}</p>
              <p className="inline-flex items-center gap-2"><Phone size={14} className="text-amber-400" /> {t.footer.contactPhone}</p>
              <p className="inline-flex items-center gap-2"><Mail size={14} className="text-amber-400" /> {t.footer.contactEmail}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-400">
          {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
}

