import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export default function LandingHeader({ t, language, onLanguageChange }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onScrollTo = (target) => {
    const nođể = document.getElementById(target);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileOpen(false);
    }
  };

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 shadow-lg shadow-blue-100/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/owner" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 text-white shadow-md">
            <Car size={18} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-slate-900">{t.brand.name}</p>
            <p className="text-[11px] text-slate-500">{t.brand.tagline}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {t.nav.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => onScrollTo(item.target)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher language={language} onChange={onLanguageChange} label={t.actions.switchLabel} />
          <Link to="/owner/login" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900 transition hover:border-blue-200 hover:bg-blue-100">
            {t.actions.login}
          </Link>
          <Link to="/owner/register" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:from-amber-600 hover:to-amber-700">
            {t.actions.register}
          </Link>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {t.nav.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => onScrollTo(item.target)}
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LanguageSwitcher language={language} onChange={onLanguageChange} label={t.actions.switchLabel} />
            <Link to="/owner/login" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900">
              {t.actions.login}
            </Link>
            <Link to="/owner/register" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-white">
              {t.actions.register}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

