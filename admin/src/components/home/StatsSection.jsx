import { Car, Building2, ShieldCheck, Headphones } from "lucide-react";
import { useTranslation } from "react-i18next";

const statsConfig = [
    { icon: Car, value: "10.000+", key: "stats.bookings" },
    { icon: Building2, value: "500+", key: "stats.companies" },
    { icon: ShieldCheck, value: "99.9%", key: "stats.uptime" },
    { icon: Headphones, value: "24/7", key: "stats.support" },
];

export default function StatsSection() {
    const { t } = useTranslation();

    return (
        <section className="py-14 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
                    {statsConfig.map(({ icon: Icon, value, key }) => (
                        <div
                            key={key}
                            className="group bg-gray-50 hover:bg-gradient-to-br hover:from-blue-900 hover:to-blue-800 rounded-2xl p-6 lg:p-8 text-center transition-all duration-300 hover:shadow-lg cursor-default"
                        >
                            <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 group-hover:bg-white/15 rounded-xl flex items-center justify-center transition-colors duration-300">
                                <Icon className="w-6 h-6 text-blue-700 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <p className="text-3xl lg:text-4xl font-extrabold text-gray-900 group-hover:text-white transition-colors duration-300">
                                {value}
                            </p>
                            <p className="mt-1.5 text-sm text-gray-500 group-hover:text-blue-200 transition-colors duration-300">
                                {t(key)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
