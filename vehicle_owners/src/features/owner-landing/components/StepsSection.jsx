import { CheckCircle2 } from 'lucide-react';

export default function StepsSection({ t }) {
  return (
    <section id="steps" className="bg-slate-50 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {t.steps.badge}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 lg:text-4xl">{t.steps.title}</h2>
          <p className="mt-4 text-slate-600">{t.steps.description}</p>
        </div>

        <div className="relative mt-10">
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 lg:block" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {t.steps.items.map((step, index) => (
              <article key={step} className="relative rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-blue-700 text-sm font-bold text-white ring-8 ring-blue-50">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-semibold leading-relaxed text-slate-700">{step}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 size={12} />
                  {t.steps.readyTag}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
