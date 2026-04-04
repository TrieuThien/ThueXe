import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, CircleDollarSign, Clock3, ShieldCheck, TrendingUp } from 'lucide-react';

const statIcons = [CircleDollarSign, Clock3, ShieldCheck];

export default function HeroSection({ t }) {
  return (
    <section className="relative overflow-hidden pt-16 lg:pt-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:pb-20">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <TrendingUp size={14} />
            {t.hero.badge}
          </p>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-[3.15rem]">
            {t.hero.title}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-slate-600">{t.hero.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/owner/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800">
              {t.actions.login}
            </Link>
            <Link to="/owner/register" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:from-amber-600 hover:to-amber-700">
              {t.actions.register}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {t.hero.stats.map((item, index) => {
              const Icon = statIcons[index] || ShieldCheck;
              return (
                <article key={item.label} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon size={16} />
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl shadow-blue-900/10 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="h-2.5 w-28 rounded-full bg-slate-100" />
            </div>

            <h3 className="text-base font-bold text-slate-900">{t.hero.viSửalTitle}</h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {t.hero.viSửalRows.map((row) => (
                <div
                  key={row.label}
                  className={`rounded-xl border px-3 py-3 ${
                    row.tone === 'positive'
                      ? 'border-emerald-200 bg-emerald-50'
                      : row.tone === 'info'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <p className="text-[11px] font-medium text-slate-600">{row.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
                    {item % 2 === 0 ? <CalendarCheck2 size={14} /> : <Clock3 size={14} />}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-3/4 rounded-full bg-slate-200" />
                    <div className="mt-1.5 h-2 w-1/2 rounded-full bg-slate-100" />
                  </div>
                  <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${item % 2 === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item % 2 === 0 ? t.hero.mockStatusDone : t.hero.mockStatusInProgress}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -bottom-4 -left-4 hidden rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 px-4 py-3 text-white shadow-xl sm:block">
            <p className="text-xl font-bold">98%</p>
            <p className="text-xs text-blue-200">{t.hero.mockSatisfaction}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

