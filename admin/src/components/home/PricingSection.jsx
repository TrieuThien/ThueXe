import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const planConfigs = [
    { prefix: "pricing.basic", featureCount: 6, highlighted: false },
    { prefix: "pricing.standard", featureCount: 7, highlighted: true },
    { prefix: "pricing.enterprise", featureCount: 8, highlighted: false },
];

export default function PricingSection() {
    const { t } = useTranslation();

    return (
        <section id="bang-gia" className="py-16 lg:py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-4">
                        {t("pricing.badge")}
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                        {t("pricing.title")}
                    </h2>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                        {t("pricing.description")}
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                    {planConfigs.map(({ prefix, featureCount, highlighted }) => {
                        const price = t(`${prefix}_price`);
                        const isContact = prefix === "pricing.enterprise";

                        return (
                            <div
                                key={prefix}
                                className={`relative flex flex-col bg-white rounded-2xl border p-6 lg:p-8 transition-all duration-300 hover:shadow-xl ${highlighted
                                    ? "border-blue-600 shadow-lg ring-1 ring-blue-600 scale-[1.02]"
                                    : "border-gray-100 hover:border-blue-100"
                                    }`}
                            >
                                {highlighted && (
                                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-full shadow">
                                        {t("pricing.popular_badge")}
                                    </span>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">{t(`${prefix}_name`)}</h3>
                                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                                        {t(`${prefix}_desc`)}
                                    </p>
                                </div>

                                <div className="mb-6">
                                    {!isContact ? (
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-extrabold text-gray-900">{price}</span>
                                            <span className="text-sm text-gray-500">{t("pricing.currency")}/{t("pricing.period")}</span>
                                        </div>
                                    ) : (
                                        <span className="text-4xl font-extrabold text-gray-900">{price}</span>
                                    )}
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {Array.from({ length: featureCount }, (_, i) => (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlighted ? "text-blue-600" : "text-green-500"}`} />
                                            <span className="text-sm text-gray-600">{t(`${prefix}_f${i + 1}`)}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${highlighted
                                        ? "bg-gradient-to-r from-blue-900 to-blue-700 text-white hover:from-blue-800 hover:to-blue-600 shadow-md hover:shadow-lg"
                                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                        }`}
                                >
                                    {t("pricing.cta")}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
