import { FileText, UserCheck, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const stepConfigs = [
    { step: 1, icon: FileText, prefix: "workflow.step_1" },
    { step: 2, icon: UserCheck, prefix: "workflow.step_2" },
    { step: 3, icon: CheckCircle, prefix: "workflow.step_3" },
];

export default function WorkflowSection() {
    const { t } = useTranslation();

    return (
        <section id="quy-trinh" className="py-16 lg:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold mb-4">
                        {t("workflow.badge")}
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                        {t("workflow.title")}
                    </h2>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                        {t("workflow.description")}
                    </p>
                </div>

                {/* Steps */}
                <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
                    <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" />

                    {stepConfigs.map(({ step, icon: Icon, prefix }) => (
                        <div key={step} className="relative text-center group">
                            <div className="relative z-10 w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Icon className="w-7 h-7 text-white" />
                                <span className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 text-blue-900 rounded-full text-xs font-bold flex items-center justify-center shadow">
                                    {step}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{t(`${prefix}_title`)}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                                {t(`${prefix}_desc`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
