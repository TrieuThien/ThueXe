import { Search } from "lucide-react";
import { BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, PAYMENT_TYPE_OPTIONS } from "../../types/bookingTypes";

export default function BookingFilters({ filters, onChange, onApply, onReset, disabled = false }) {
    return (
        <form onSubmit={onApply} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <input value={filters.booking_code} onChange={(event) => onChange("booking_code", event.target.value)} placeholder="Mã đặt xe" className="rounded-xl border border-slate-300 px-3 py-2" />
                <input value={filters.customer_name} onChange={(event) => onChange("customer_name", event.target.value)} placeholder="Tên khách hàng" className="rounded-xl border border-slate-300 px-3 py-2" />
                <input value={filters.customer_phone} onChange={(event) => onChange("customer_phone", event.target.value)} placeholder="SĐT khách hàng" className="rounded-xl border border-slate-300 px-3 py-2" />
                <input value={filters.driver_keyword} onChange={(event) => onChange("driver_keyword", event.target.value)} placeholder="Tên/Mã tài xế" className="rounded-xl border border-slate-300 px-3 py-2" />
                <input value={filters.search} onChange={(event) => onChange("search", event.target.value)} placeholder="Từ khóa" className="rounded-xl border border-slate-300 px-3 py-2" />

                <select value={filters.booking_type} onChange={(event) => onChange("booking_type", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                    <option value="">Loại đặt xe</option>
                    {BOOKING_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <select value={filters.status} onChange={(event) => onChange("status", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                    <option value="">Trạng thái</option>
                    {BOOKING_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <select value={filters.payment_type} onChange={(event) => onChange("payment_type", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                    <option value="">Phương thức thanh toán</option>
                    {PAYMENT_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <input type="date" value={filters.booking_date} onChange={(event) => onChange("booking_date", event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" />
                <select value={filters.limit} onChange={(event) => onChange("limit", Number(event.target.value))} className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                    {[10, 15, 20, 50].map((size) => <option key={size} value={size}>{size} dòng/trang</option>)}
                </select>
            </div>

            <div className="mt-4 flex items-center gap-2">
                <button type="submit" disabled={disabled} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
                    <Search className="h-4 w-4" />
                    Áp dụng lọc
                </button>
                <button type="button" onClick={onReset} disabled={disabled} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                    Đặt lại
                </button>
            </div>
        </form>
    );
}
