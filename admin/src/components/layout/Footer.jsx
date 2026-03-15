import { Car, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const quickLinkKeys = [
    { key: "link_about", href: "#gioi-thieu" },
    { key: "link_features", href: "#tinh-nang" },
    { key: "link_pricing", href: "#bang-gia" },
    { key: "link_faq", href: "#faq" },
];

const productLinkKeys = [
    { key: "product_booking", href: "#tinh-nang" },
    { key: "product_dispatch", href: "#tinh-nang" },
    { key: "product_admin", href: "#tinh-nang" },
    { key: "product_report", href: "#tinh-nang" },
];

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                                <Car className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">
                                Thuê<span className="text-amber-400">Xe</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed text-gray-400">
                            {t("footer.brand_desc")}
                        </p>
                    </div>

                    {/* Quick links */}
                    <div>
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                            {t("footer.explore")}
                        </h4>
                        <ul className="space-y-2.5">
                            {quickLinkKeys.map(({ key, href }) => (
                                <li key={key}>
                                    <a
                                        href={href}
                                        className="text-sm text-gray-400 hover:text-amber-400 transition-colors"
                                    >
                                        {t(`footer.${key}`)}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                            {t("footer.product")}
                        </h4>
                        <ul className="space-y-2.5">
                            {productLinkKeys.map(({ key, href }) => (
                                <li key={key}>
                                    <a
                                        href={href}
                                        className="text-sm text-gray-400 hover:text-amber-400 transition-colors"
                                    >
                                        {t(`footer.${key}`)}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                            {t("footer.contact")}
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                                <span className="text-sm text-gray-400">
                                    {t("footer.address")}
                                </span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="text-sm text-gray-400">1900 1234 56</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="text-sm text-gray-400">contact@thuexe.vn</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                        {t("footer.copyright", { year: new Date().getFullYear() })}
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                            {t("footer.terms")}
                        </a>
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                            {t("footer.privacy")}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
