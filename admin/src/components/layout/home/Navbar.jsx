import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Car, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const navKeys = [
    { key: "navbar.about", href: "#gioi-thieu" },
    { key: "navbar.features", href: "#tinh-nang" },
    { key: "navbar.workflow", href: "#quy-trinh" },
    { key: "navbar.pricing", href: "#bang-gia" },
    { key: "navbar.faq", href: "#faq" },
];

export default function Navbar() {
    const { t, i18n } = useTranslation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const location = useLocation();
    const isHome = location.pathname === "/";
    const currentLang = i18n.language;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
        setLangOpen(false);
    }, [location]);

    const switchLang = (lng) => {
        i18n.changeLanguage(lng);
        setLangOpen(false);
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? "bg-white/95 backdrop-blur-md shadow-md"
                : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-base text-lg">
                <div className="flex items-center justify-between h-16 lg:h-18">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Car className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold lg:text-3xl text-gray-900">
                            Thuê<span className="text-amber-500">Xe</span>
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden lg:flex items-center gap-1">
                        {isHome &&
                            navKeys.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="px-3 py-2 font-medium text-gray-700 hover:text-blue-900 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    {t(link.key)}
                                </a>
                            ))}
                        <Link
                            to="/login"
                            className="px-3 py-2 font-medium text-gray-700 hover:text-blue-900 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            {t("navbar.login")}
                        </Link>

                        {/* Language Switcher */}
                        <div className="relative ml-1">
                            <button
                                onClick={() => setLangOpen(!langOpen)}
                                className="flex items-center gap-1.5 px-2.5 py-2 font-medium text-gray-600 hover:text-blue-900 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <Globe className="w-4 h-4" />
                                {currentLang === "vi" ? "VI" : "EN"}
                            </button>
                            {langOpen && (
                                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                                    <button
                                        onClick={() => switchLang("vi")}
                                        className={`w-full text-left px-3 py-2 transition-colors ${currentLang === "vi" ? "text-blue-700 bg-blue-50 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                                    >
                                        🇻🇳 Tiếng Việt
                                    </button>
                                    <button
                                        onClick={() => switchLang("en")}
                                        className={`w-full text-left px-3 py-2 transition-colors ${currentLang === "en" ? "text-blue-700 bg-blue-50 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                                    >
                                        🇺🇸 English
                                    </button>
                                </div>
                            )}
                        </div>

                        <Link
                            to="/login"
                            className="ml-2 px-5 py-2.5 font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-sm hover:shadow-md transition-all"
                        >
                            {t("navbar.cta")}
                        </Link>
                    </div>

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <div
                className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-104 opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-1 shadow-lg">
                    {isHome &&
                        navKeys.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="block px-3 py-2.5 text-center text-md font-medium text-gray-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                {t(link.key)}
                            </a>
                        ))}
                    <Link
                        to="/login"
                        className="block px-3 py-2.5 text-center text-md font-medium text-gray-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        {t("navbar.login")}
                    </Link>
                    {/* Mobile language switch */}
                    <div className="flex gap-2 px-3 py-2 justify-center">
                        <button
                            onClick={() => switchLang("vi")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${currentLang === "vi" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                        >
                            🇻🇳 VI
                        </button>
                        <button
                            onClick={() => switchLang("en")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${currentLang === "en" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
                        >
                            🇺🇸 EN
                        </button>
                    </div>
                    <Link
                        to="/login"
                        className="block mt-2 text-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg"
                    >
                        {t("navbar.cta")}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
