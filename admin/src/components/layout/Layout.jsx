import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getMe } from "../../services/authService";
import { getDefaultPathForRole } from "../../config/roleRoutes";

export default function Layout({ allowedRole }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }

        return window.innerWidth < 1024;
    });
    const [authLoading, setAuthLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        const syncSidebar = () => {
            if (window.innerWidth < 1024) {
                setSidebarCollapsed(true);
            }
        };

        window.addEventListener("resize", syncSidebar);

        return () => {
            window.removeEventListener("resize", syncSidebar);
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        getMe()
            .then((response) => {
                if (!mounted) {
                    return;
                }

                setCurrentUser(response?.user || null);
                setAuthLoading(false);
            })
            .catch(() => {
                if (!mounted) {
                    return;
                }

                setAuthError(true);
                setAuthLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading admin workspace...</span>
                </div>
            </div>
        );
    }

    if (authError || !currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRole && currentUser.role !== allowedRole) {
        return <Navigate to={getDefaultPathForRole(currentUser.role)} replace />;
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <Topbar
                currentUser={currentUser}
                role={allowedRole || currentUser.role}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
            />
            <Sidebar
                collapsed={sidebarCollapsed}
                role={allowedRole || currentUser.role}
            />

            <main
                className="min-h-screen px-4 pb-6 pt-[88px] transition-all duration-300 sm:px-6"
                style={{
                    marginLeft: sidebarCollapsed ? "5rem" : "clamp(14rem, 10vw, 16rem)",
                }}
            >
                <div className="min-h-[calc(100vh-104px)] rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <Outlet context={{ currentUser, authLoading, role: allowedRole || currentUser.role }} />
                </div>
            </main>
        </div>
    );
}
