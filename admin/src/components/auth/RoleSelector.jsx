import { Truck, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const roles = [
    { key: "dispatcher", icon: Truck },
    { key: "admin", icon: Lock },
];

export default function RoleSelector({ selectedRole, onSelectRole }) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 gap-3">
            {roles.map(({ key: roleKey, icon: Icon }) => {
                const isActive = selectedRole === roleKey;

                return (
                    <button
                        key={roleKey}
                        type="button"
                        onClick={() => onSelectRole(roleKey)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${isActive
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        {isActive && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full" />
                        )}

                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-500"
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                        </div>

                        <span
                            className={`text-sm font-semibold ${isActive ? "text-blue-900" : "text-gray-700"}`}
                        >
                            {t(`auth.${roleKey}_label`)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
