import { Car, Zap, Eye, BarChart3, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const featureConfigs = [
    { key: "feat_1", icon: Zap },
    { key: "feat_2", icon: Eye },
    { key: "feat_3", icon: BarChart3 },
    { key: "feat_4", icon: ShieldCheck },
];

export default function AuthShowcase() {
    const { t } = useTranslation();

    return (
        <div className="relative h-full flex flex-col justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 rounded-2xl p-8 lg:p-12 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-700/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                        <Car className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">
                        Thuê<span className="text-amber-400">Xe</span>
                    </span>
                </div>

                <h3 className="text-2xl lg:text-3xl font-bold text-white leading-snug mb-3">
                    {t("showcase.title_line1")}
                    <br />
                    {t("showcase.title_line2")}
                </h3>
                <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-sm">
                    {t("showcase.description")}
                </p>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {featureConfigs.map(({ key, icon: Icon }) => (
                        <div
                            key={key}
                            className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/12 transition-colors"
                        >
                            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center mb-2.5">
                                <Icon className="w-4 h-4 text-amber-400" />
                            </div>
                            <h4 className="text-sm font-semibold text-white mb-1">
                                {t(`showcase.${key}_title`)}
                            </h4>
                            <p className="text-xs text-blue-300 leading-relaxed">
                                {t(`showcase.${key}_desc`)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Trust note */}
                <div className="mt-10 pt-6 border-t border-white/10">
                    <p className="text-xs text-blue-300">
                        {t("showcase.trust")}{" "}
                        <span className="text-white font-semibold">{t("showcase.trust_count")}</span>{" "}
                        {t("showcase.trust_suffix")}
                    </p>
                </div>
            </div>
        </div>
    );
}
