import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const faqCount = 6;

export default function FAQSection() {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

    return (
        <section id="faq" className="py-16 lg:py-24 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold mb-4">
                        {t("faq.badge")}
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                        {t("faq.title")}
                    </h2>
                    <p className="mt-4 text-gray-600">
                        {t("faq.description")}
                    </p>
                </div>

                {/* Accordion */}
                <div className="space-y-3">
                    {Array.from({ length: faqCount }, (_, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div
                                key={i}
                                className={`border rounded-xl transition-all duration-300 ${isOpen
                                    ? "border-blue-200 bg-blue-50/40 shadow-sm"
                                    : "border-gray-100 bg-white hover:border-gray-200"
                                    }`}
                            >
                                <button
                                    onClick={() => toggle(i)}
                                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                                >
                                    <span
                                        className={`text-sm font-semibold ${isOpen ? "text-blue-900" : "text-gray-800"}`}
                                    >
                                        {t(`faq.q${i + 1}`)}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-600" : ""}`}
                                    />
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}
                                >
                                    <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                                        {t(`faq.a${i + 1}`)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
