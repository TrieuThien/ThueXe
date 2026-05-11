const SERVICE_TYPE_LABEL = {
    1: "Thuê xe",
    2: "Thuê tài xế",
    3: "Xe + tài xế",
};

const SERVICE_TYPE_CLASS = {
    1: "bg-emerald-100 text-emerald-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL = {
    scheduled: "Đã lên lịch",
    pending: "Chờ xử lý",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
};

const STATUS_CLASS = {
    scheduled: "bg-yellow-100 text-yellow-700",
    pending: "bg-orange-100 text-orange-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
};

function formatCurrency(amount) {
    if (!amount && amount !== 0) return "—";
    return Number(amount).toLocaleString("vi-VN") + "đ";
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function RentalBookingTable({ items, loading, onAssign, onStatusChange, busyId, pagination, onPageChange }) {
    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Đang tải danh sách đơn thuê...
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Mã đơn</th>
                            <th className="px-4 py-3">Loại dịch vụ</th>
                            <th className="px-4 py-3">Khách hàng</th>
                            <th className="px-4 py-3">Tài xế</th>
                            <th className="px-4 py-3">Phương tiện</th>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3 text-right">Giá</th>
                            <th className="px-4 py-3">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                                    Không có đơn thuê nào.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const isBusy = busyId === item.rental_id;
                                const canAssign = item.status === "pending" || item.status === "scheduled";
                                return (
                                    <tr
                                        key={item.rental_id}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs text-slate-600">
                                                {item.rental_booking_code || `#${item.rental_id}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SERVICE_TYPE_CLASS[item.service_type] || "bg-slate-100 text-slate-600"}`}>
                                                {SERVICE_TYPE_LABEL[item.service_type] || `Type ${item.service_type}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-800">{item.customer_name || "—"}</p>
                                            <p className="text-xs text-slate-400">{item.customer_phone || ""}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {item.driver_name || <span className="text-slate-400">Chưa gán</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {item.vehicle_plate || item.vehicle_name || <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <p>{formatDate(item.start_date)}</p>
                                            {item.end_date && (
                                                <p className="text-xs text-slate-400">→ {formatDate(item.end_date)}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[item.status] || "bg-slate-100 text-slate-600"}`}>
                                                {STATUS_LABEL[item.status] || item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                                            {formatCurrency(item.total_price)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {canAssign && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onAssign(item)}
                                                        disabled={isBusy}
                                                        className="rounded-lg border border-indigo-300 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                                    >
                                                        {isBusy ? "..." : "Gán"}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onStatusChange(item)}
                                                    disabled={isBusy}
                                                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    {isBusy ? "..." : "Cập nhật trạng thái"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <p className="text-xs text-slate-500">
                        Trang {pagination.page} / {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                            Trước
                        </button>
                        <button
                            type="button"
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
