import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, Menu, PanelLeftClose, User } from "lucide-react";
import reactLogo from "../../assets/react.svg";
import { logout } from "../../services/authService";
import { buildRolePath } from "../../config/roleRoutes";

function getDisplayName(user, fallback) {
    const firstname = user?.firstname?.trim?.() || "";
    const lastname = user?.lastname?.trim?.() || "";
    const fullName = `${firstname} ${lastname}`.trim();
    if (fullName) {
        return fullName;
    }
    return user?.email || user?.phone || fallback;
}

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

export default function Topbar({ currentUser, role, sidebarCollapsed, onToggleSidebar }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!dropdownRef.current?.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayName = getDisplayName(currentUser, t("layout.defaultUser"));
    const initials = getInitials(displayName) || "AD";
    const userRole = role || currentUser?.role || "admin";

    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    return (
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onToggleSidebar}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={sidebarCollapsed ? t("layout.openSidebar") : t("layout.collapseSidebar")}
                    >
                        {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </button>

                    <Link to={buildRolePath(userRole, "dashboard")} className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 shadow-sm">
                            <img src={reactLogo} alt="React logo" className="h-6 w-6" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-semibold text-slate-900">{t("layout.brandTitle")}</p>
                            <p className="text-xs text-slate-500">{t("layout.brandSubtitle")}</p>
                        </div>
                    </Link>
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setDropdownOpen((prev) => !prev)}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                            {initials}
                        </div>
                        <div className="hidden min-w-0 sm:block">
                            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                            <p className="truncate text-xs uppercase tracking-[0.2em] text-slate-500">{userRole}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${dropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="border-b border-slate-100 px-4 py-3">
                                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                                <p className="text-xs text-slate-500">{currentUser?.email || currentUser?.phone || t("layout.authenticated")}</p>
                            </div>

                            <div className="p-2">
                                <Link
                                    to={buildRolePath(userRole, "profile")}
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                    <User className="h-4 w-4" />
                                    {t("layout.profile")}
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t("layout.logout")}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
