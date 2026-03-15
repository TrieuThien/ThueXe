import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import RoleSelector from "./RoleSelector";

export default function LoginForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState("dispatcher");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!email.trim()) newErrors.email = t("auth.error_email");
        if (!password.trim()) newErrors.password = t("auth.error_password");
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (selectedRole === "dispatcher") {
                navigate("/dispatcher/dashboard");
            } else {
                navigate("/admin/dashboard");
            }
        }, 1500);
    };

    return (
        <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                    {t("auth.title")}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    {t("auth.subtitle")}
                </p>
            </div>

            {/* Role Selector */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("auth.role_label")}
                </label>
                <RoleSelector
                    selectedRole={selectedRole}
                    onSelectRole={setSelectedRole}
                />
                <p className="mt-2.5 text-xs text-gray-500 leading-relaxed">
                    {t(`auth.${selectedRole}_desc`)}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        {t("auth.email_label")}
                    </label>
                    <input
                        id="email"
                        type="text"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        placeholder={t("auth.email_placeholder")}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${errors.email
                            ? "border-red-400 focus:ring-red-300"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                            }`}
                    />
                    {errors.email && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        {t("auth.password_label")}
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password)
                                    setErrors((prev) => ({ ...prev, password: "" }));
                            }}
                            placeholder={t("auth.password_placeholder")}
                            className={`w-full px-4 py-2.5 pr-10 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${errors.password
                                ? "border-red-400 focus:ring-red-300"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
                    )}
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{t("auth.remember")}</span>
                    </label>
                    <a
                        href="#"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        {t("auth.forgot")}
                    </a>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("auth.logging_in")}
                        </>
                    ) : (
                        t("auth.login_as", { role: t(`auth.${selectedRole}_label`) })
                    )}
                </button>
            </form>
        </div>
    );
}
