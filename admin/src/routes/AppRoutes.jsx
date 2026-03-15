import { Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Placeholder routes for post-login redirect */}
            <Route
                path="/dispatcher/dashboard"
                element={<DashboardPlaceholder role="Dispatcher" />}
            />
            <Route
                path="/admin/dashboard"
                element={<DashboardPlaceholder role="Admin" />}
            />
        </Routes>
    );
}

function DashboardPlaceholder({ role }) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">
                        {role.charAt(0)}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {t("dashboard.title", { role })}
                </h1>
                <p className="text-gray-500 mb-6">
                    {t("dashboard.success", { role })}
                </p>
                <a
                    href="/"
                    className="inline-flex px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all"
                >
                    {t("dashboard.back_home")}
                </a>
            </div>
        </div>
    );
}
