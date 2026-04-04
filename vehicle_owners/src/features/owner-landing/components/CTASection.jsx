import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CTASection({ t }) {
  return (
    <section id="cta" className="py-6 lg:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-8 text-white shadow-2xl lg:p-10">
          <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-60 w-60 rounded-full bg-amber-300/10 blur-2xl" />

          <div className="relative max-w-3xl">
            <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">{t.cta.title}</h2>
            <p className="mt-4 text-blue-100">{t.cta.description}</p>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            <Link
              to="/owner/register"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-amber-600"
            >
              {t.actions.register}
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/owner/login"
              className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              {t.actions.login}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
