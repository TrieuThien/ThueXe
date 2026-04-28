const SERVICE_TYPE_OPTIONS = [
    { value: "", label: "Tất cả loại dịch vụ" },
    { value: "1", label: "Thuê xe" },
    { value: "2", label: "Thuê tài xế" },
    { value: "3", label: "Xe + tài xế" },
];

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "scheduled", label: "Đã lên lịch" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "in_progress", label: "Đang thực hiện" },
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
];

export default function RentalBookingFilters({ filters, onChange, onApply, onReset, disabled }) {
    return (
        <form
            onSubmit={onApply}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <input
                    type="text"
                    placeholder="Tìm tên KH, SĐT, mã đơn..."
                    value={filters.search}
                    onChange={(e) => onChange("search", e.target.value)}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
                <select
                    value={filters.serviceType}
                    onChange={(e) => onChange("serviceType", e.target.value)}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                >
                    {SERVICE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <select
                    value={filters.status}
                    onChange={(e) => onChange("status", e.target.value)}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onChange("dateFrom", e.target.value)}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
                <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onChange("dateTo", e.target.value)}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
            </div>
            <div className="mt-3 flex gap-2">
                <button
                    type="submit"
                    disabled={disabled}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    Áp dụng
                </button>
                <button
                    type="button"
                    onClick={onReset}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    Đặt lại
                </button>
            </div>
        </form>
    );
}
