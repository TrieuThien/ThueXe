import { ClipboardList, Truck, Settings, BarChart3, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const groupConfigs = [
    { icon: ClipboardList, prefix: "features.group_1", featureCount: 5 },
    { icon: Truck, prefix: "features.group_2", featureCount: 5 },
    { icon: Settings, prefix: "features.group_3", featureCount: 5 },
    { icon: BarChart3, prefix: "features.group_4", featureCount: 5 },
];

export default function FeaturesSection() {
    const { t } = useTranslation();

    return (
        <section id="tinh-nang" className="py-16 lg:py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-4">
                        {t("features.badge")}
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                        {t("features.title")}
                    </h2>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                        {t("features.description")}
                    </p>
                </div>

                {/* Feature cards */}
                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {groupConfigs.map(({ icon: Icon, prefix, featureCount }) => (
                        <div
                            key={prefix}
                            className="group bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 hover:shadow-xl hover:border-blue-100 transition-all duration-300"
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{t(`${prefix}_title`)}</h3>
                                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                                        {t(`${prefix}_desc`)}
                                    </p>
                                </div>
                            </div>
                            <ul className="space-y-2.5 mt-5 pl-1">
                                {Array.from({ length: featureCount }, (_, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                        <span className="text-sm text-gray-600">{t(`${prefix}_f${i + 1}`)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
