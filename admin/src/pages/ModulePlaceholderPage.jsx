import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
    buildRolePath,
    getBasePathByRole,
    getRoleLeafRoutes,
} from "../config/roleRoutes";

function formatTitle(pathname, role) {
    const basePath = getBasePathByRole(role);
    const currentPath = pathname.replace(`${basePath}/`, "");
    const matchedRoute = getRoleLeafRoutes(role).find((item) => item.path === currentPath);

    return matchedRoute?.label || currentPath;
}

export default function ModulePlaceholderPage({ role }) {
    const { pathname } = useLocation();
    const title = useMemo(() => formatTitle(pathname, role), [pathname, role]);

    return (
        <div className="flex min-h-[360px] items-center justify-center">
            <div className="max-w-2xl rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
                    {role} module
                </p>
                <h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                    Chức năng này đã được tách route riêng cho role {role}. Bạn có thể triển khai nội dung ở đây hoặc xóa file này nếu không cần thiết.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to={buildRolePath(role, "dashboard")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Về dashboard
                    </Link>
                    <Link
                        to={buildRolePath(role, "profile")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
                    >
                        Xem hồ sơ
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
