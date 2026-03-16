import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, ClipboardList, MapPinned } from "lucide-react";

const stats = [
    {
        label: "Yeu cau moi",
        value: "24",
        note: "Can xu ly trong ca truc hien tai",
        icon: ClipboardList,
    },
    {
        label: "Lich hen sap toi",
        value: "9",
        note: "Dang cho xep tai xe va xac nhan",
        icon: CalendarClock,
    },
];

export default function DispatcherDashboardPage() {
    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-800 px-6 py-8 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">
                    Dispatcher dashboard
                </p>
                <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                    Khu vực dành cho nhân viên điều phối
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
                    Tập trung vào tiếp nhận yêu cầu, phân công chuyến và theo dõi tiến trình vận
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        to="/dispatcher/booking/dispatch"
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        Mở màn hình điều phối
                    </Link>
                    <Link
                        to="/dispatcher/map-tracking"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        Theo dõi bản đồ
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
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
                            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                                <Icon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">{note}</p>
                    </article>
                ))}

                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Giám sát trực tiếp
                            </p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">3</p>
                        </div>
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                            <MapPinned className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-600">
                        Chuyến đang cần theo dõi sát để đảm bảo đúng giờ.
                    </p>
                </article>
            </section>
        </div>
    );
}
