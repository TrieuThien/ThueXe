import { Mail, Phone, Shield } from "lucide-react";
import { useOutletContext } from "react-router-dom";

export default function AdminProfilePage() {
    const { currentUser, role } = useOutletContext();
    const fullname = `${currentUser?.firstname || ""} ${currentUser?.lastname || ""}`.trim();

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                    Hồ sơ tài khoản
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                    {fullname || "Authenticated User"}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Thông tin tài khoản đang đăng nhập trong khu vực {role}.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                        <Shield className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-slate-500">Role</p>
                    <p className="mt-2 text-lg font-semibold capitalize text-slate-900">
                        {currentUser?.role || role}
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <Mail className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="mt-2 break-all text-lg font-semibold text-slate-900">
                        {currentUser?.email || "Chua cap nhat"}
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700">
                        <Phone className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                        {currentUser?.phone || "Chua cap nhat"}
                    </p>
                </div>
            </div>
        </div>
    );
}
