import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { buildRolePath, getBasePathByRole, getRoleLeafRoutes } from "../config/roleRoutes";

function formatTitle(pathname, role) {
    const basePath = getBasePathByRole(role);
    const currentPath = pathname.replace(`${basePath}/`, "");
    const matchedRoute = getRoleLeafRoutes(role).find((item) => item.path === currentPath);
    return matchedRoute?.label || currentPath;
}

export default function ModulePlaceholderPage({ role }) {
    const location = useLocation();
    const { pathname, search, state } = location;
    const title = useMemo(() => formatTitle(pathname, role), [pathname, role]);

    const contextData = useMemo(() => {
        const basePath = getBasePathByRole(role);
        const currentPath = pathname.replace(`${basePath}/`, "");
        const searchParams = new URLSearchParams(search);
        const prefillCustomer = state?.prefillCustomer || null;

        if (currentPath === "booking/create") {
            return {
                type: "booking_create",
                customerName: prefillCustomer?.full_name || searchParams.get("customer_name"),
                customerPhone: prefillCustomer?.phone || searchParams.get("customer_phone"),
                customerEmail: prefillCustomer?.email || searchParams.get("customer_email"),
                routeName: prefillCustomer?.route_name || searchParams.get("route_name"),
            };
        }

        if (currentPath === "bookings") {
            return {
                type: "booking_history",
                customerName: searchParams.get("customer_name"),
                customerPhone: searchParams.get("customer_phone"),
            };
        }

        return null;
    }, [pathname, role, search, state]);

    return (
        <div className="flex min-h-[360px] items-center justify-center">
            <div className="max-w-2xl rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">{role} module</p>
                <h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                    Chức năng này hiện chưa có màn riêng trong codebase. Dữ liệu điều hướng vẫn được giữ lại để bạn tiếp tục hoàn thiện module mà không mất context.
                </p>

                {contextData ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">
                            {contextData.type === "booking_create"
                                ? "Dữ liệu đã truyền sang màn tạo booking"
                                : "Bộ lọc đã truyền sang màn lịch sử booking"}
                        </p>
                        <div className="mt-3 space-y-2">
                            <p>Khách hàng: <span className="font-medium">{contextData.customerName || "--"}</span></p>
                            <p>Số điện thoại: <span className="font-medium">{contextData.customerPhone || "--"}</span></p>
                            {contextData.type === "booking_create" ? (
                                <>
                                    <p>Email: <span className="font-medium">{contextData.customerEmail || "--"}</span></p>
                                    <p>Khu vực: <span className="font-medium">{contextData.routeName || "--"}</span></p>
                                </>
                            ) : null}
                        </div>
                    </div>
                ) : null}

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
