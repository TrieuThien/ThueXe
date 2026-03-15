import { Link } from "react-router-dom";
import {
    ArrowRight,
    Zap,
    LayoutDashboard,
    BarChart3,
    Car,
    Users,
    MapPin,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const badgeIcons = [Zap, LayoutDashboard, BarChart3];
const badgeKeys = ["hero.badge_dispatch", "hero.badge_manage", "hero.badge_report"];

export default function HeroSection() {
    const { t } = useTranslation();
    return (
        <section
            id="gioi-thieu"
            className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white pt-28 pb-16 lg:pt-36 lg:pb-24"
        >
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-100/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left – Copy */}
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-6">
                            <Car className="w-3.5 h-3.5" />
                            {t("hero.badge")}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-tight text-gray-900">
                            {t("hero.title_pre")}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-blue-600">
                                {t("hero.title_highlight")}
                            </span>
                            {t("hero.title_post")}
                        </h1>

                        <p className="mt-5 text-lg text-gray-600 leading-relaxed">
                            {t("hero.description")}
                        </p>

                        {/* CTA */}
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-md hover:shadow-lg transition-all"
                            >
                                {t("hero.cta_login")}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href="#tinh-nang"
                                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-blue-900 bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 rounded-lg transition-all"
                            >
                                {t("hero.cta_features")}
                            </a>
                        </div>

                        {/* Badges */}
                        <div className="mt-8 flex flex-wrap gap-3">
                            {badgeKeys.map((key, idx) => {
                                const Icon = badgeIcons[idx];
                                return (
                                    <span
                                        key={key}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-full text-xs font-medium text-gray-600 shadow-sm"
                                    >
                                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                                        {t(key)}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right – Dashboard mockup */}
                    <div className="relative">
                        {/* Main card */}
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 lg:p-6">
                            {/* Header bar mockup */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="h-2.5 w-32 bg-gray-100 rounded-full" />
                            </div>

                            {/* Stat mini cards */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    {
                                        icon: Car,
                                        labelKey: "hero.mock_active_vehicles",
                                        value: "24",
                                        color: "text-blue-600 bg-blue-50",
                                    },
                                    {
                                        icon: Users,
                                        labelKey: "hero.mock_drivers_online",
                                        value: "18",
                                        color: "text-green-600 bg-green-50",
                                    },
                                    {
                                        icon: MapPin,
                                        labelKey: "hero.mock_trips_today",
                                        value: "47",
                                        color: "text-amber-600 bg-amber-50",
                                    },
                                ].map((card) => (
                                    <div
                                        key={card.labelKey}
                                        className="bg-gray-50 rounded-xl p-3 text-center"
                                    >
                                        <div
                                            className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center mx-auto mb-2`}
                                        >
                                            <card.icon className="w-4 h-4" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {card.value}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            {t(card.labelKey)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Fake table rows */}
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg"
                                    >
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-2 bg-gray-200 rounded-full w-3/4" />
                                            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                                        </div>
                                        <div
                                            className={`px-2 py-1 rounded text-[10px] font-medium ${i % 2 === 0
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {i % 2 === 0 ? t("hero.mock_completed") : t("hero.mock_in_progress")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Floating accent card */}
                        <div className="absolute -bottom-4 -left-4 bg-gradient-to-br from-blue-900 to-blue-800 text-white rounded-xl p-4 shadow-xl hidden sm:block">
                            <p className="text-2xl font-bold">98%</p>
                            <p className="text-xs text-blue-200 mt-0.5">{t("hero.mock_dispatch_rate")}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
