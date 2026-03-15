import { Link } from "react-router-dom";
import { Car, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import LoginForm from "../components/auth/LoginForm";
import AuthShowcase from "../components/auth/AuthShowcase";

export default function LoginPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left – form side */}
            <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
                <div className="w-full max-w-md mx-auto">
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-10">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Car className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">
                                Thuê<span className="text-amber-500">Xe</span>
                            </span>
                        </Link>
                        <Link
                            to="/"
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t("auth.back_home")}
                        </Link>
                    </div>

                    {/* Login Form */}
                    <LoginForm />

                    {/* Footer note */}
                    <p className="mt-8 text-center text-xs text-gray-400">
                        {t("auth.copyright", { year: new Date().getFullYear() })}
                    </p>
                </div>
            </div>

            {/* Right – showcase (hidden on mobile) */}
            <div className="hidden lg:block lg:w-[48%] xl:w-[45%] p-4">
                <AuthShowcase />
            </div>
        </div>
    );
}
