import { ChartColumnIncreasing, ClipboardList, Landmark, ShieldCheck, Wallet } from 'lucide-react';

const icons = [ChartColumnIncreasing, ClipboardList, Wallet, ShieldCheck, Landmark];

export default function BenefitsSection({ t }) {
  return (
    <section id="benefits" className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            {t.benefits.badge}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 lg:text-4xl">{t.benefits.title}</h2>
          <p className="mt-4 text-slate-600">{t.benefits.description}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {t.benefits.items.map((item, index) => {
            const Icon = icons[index] || ShieldCheck;
            return (
              <article key={item.title} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-100/40">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 text-white">
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
