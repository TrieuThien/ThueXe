import { Link } from "react-router-dom";
import { BOOKING_STATUS_BADGE, getStatusLabel } from "../../types/bookingTypes";

function formatDateTime(value) {
    if (!value) return "--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function BookingTable({ items, role, onAssign, onStatusChange, busyId, detailPathBase }) {
    if (!items.length) {
        return (
            <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Không có booking phù hợp.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                        <th className="px-4 py-3">Booking</th>
                        <th className="px-4 py-3">Khách hàng</th>
                        <th className="px-4 py-3">Lộ trình</th>
                        <th className="px-4 py-3">Tài xế</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Ngày tạo</th>
                        <th className="px-4 py-3">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">#{item.id}</p>
                                <p className="text-xs text-slate-500">{item.b_uuid || "--"}</p>
                            </td>
                            <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">{item.user_name || `User #${item.user_id}`}</p>
                                <p className="text-xs text-slate-500">{item.user_phone || "--"}</p>
                            </td>
                            <td className="px-4 py-3">
                                <p>{item.pickup_address}</p>
                                <p className="text-xs text-slate-500">to {item.dropoff_address}</p>
                            </td>
                            <td className="px-4 py-3">
                                <p>{item.driver_name || "Chưa gán"}</p>
                                <p className="text-xs text-slate-500">{item.driver_phone || "--"}</p>
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${BOOKING_STATUS_BADGE[item.status] || "bg-slate-100 text-slate-700"}`}
                                >
                                    {item.status_label || getStatusLabel(item.status)}
                                </span>
                            </td>
                            <td className="px-4 py-3">{formatDateTime(item.date_created)}</td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        to={`${detailPathBase}/${item.id}`}
                                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Xem
                                    </Link>
                                    {role !== "passenger" ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onAssign(item)}
                                                disabled={busyId === item.id}
                                                className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Gán tài xế
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onStatusChange(item)}
                                                disabled={busyId === item.id}
                                                className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Cập nhật trạng thái
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
