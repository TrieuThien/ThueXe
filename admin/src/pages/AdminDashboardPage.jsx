import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, UserPlus, Users } from "lucide-react";

const stats = [
    {
        label: "Nhân viên đang hoạt động",
        value: "128",
        note: "Tăng 12% so với tháng trước",
        icon: Users,
    },
    {
        label: "Yêu cầu đang xử lý",
        value: "16",
        note: "4 yêu cầu cần ưu tiên trong hôm nay",
        icon: BadgeCheck,
    },
];

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 px-6 py-8 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">
                    Admin dashboard
                </p>
                <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                    Trung tâm điều phối dành cho quản trị viên
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
                    Theo dõi vận hành, quản lý tài khoản nội bộ và truy cập nhanh tới
                    các tác vụ quản trị quan trọng.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        to="/admin/staff/create"
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        <UserPlus className="h-4 w-4" />
                        Tạo tài khoản nhân viên
                    </Link>
                    <Link
                        to="/admin/profile"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        Xem hồ sơ
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                {stats.map(({ icon: Icon, label, note, value }) => (
                    <article
                        key={label}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{label}</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
                            </div>
                            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                                <Icon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">{note}</p>
                    </article>
                ))}
            </section>
        </div>
    );
}
