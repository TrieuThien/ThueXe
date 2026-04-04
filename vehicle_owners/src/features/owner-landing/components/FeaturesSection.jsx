import {
  CalendarClock,
  CarFront,
  CarTaxiFront,
  MapPinned,
  ShieldAlert,
  WalletCards,
  CheckCircle,
} from 'lucide-react';

const icons = [CarFront, MapPinned, CalendarClock, CarTaxiFront, ShieldAlert, WalletCards];

export default function FeaturesSection({ t }) {
  return (
    <section id="features" className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            {t.features.badge}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 lg:text-4xl">{t.features.title}</h2>
          <p className="mt-4 text-slate-600">{t.features.description}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {t.features.items.map((item, index) => {
            const Icon = icons[index] || CarFront;
            return (
              <article key={item} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={20} />
                  </div>
                  <CheckCircle size={16} className="text-emerald-500" />
                </div>
                <p className="mt-4 text-base font-bold text-slate-900">{item}</p>
                <p className="mt-2 text-sm text-slate-500">{t.features.cardHint}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
