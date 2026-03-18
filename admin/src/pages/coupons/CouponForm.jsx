import {
    DISCOUNT_TYPE_OPTIONS,
    STATUS_OPTIONS,
    VISIBILITY_OPTIONS,
} from "./couponFormUtils";

function FieldError({ error }) {
    if (!error) return null;
    return <p className="mt-1 text-xs text-red-600">{error}</p>;
}

function CheckboxRide({ ride, checked, onToggle }) {
    return (
        <label
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${checked ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"
                }`}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onToggle(ride.id, event.target.checked)}
                className="mt-1 h-4 w-4"
            />
            <span>
                <span className="block text-sm font-semibold text-slate-800">{ride.ride_type}</span>
                <span className="text-xs text-slate-500">{ride.ride_desc || "Không có mô tả"}</span>
            </span>
        </label>
    );
}

export default function CouponForm({
    form,
    errors,
    cities,
    rides,
    submitting,
    submitLabel,
    onChange,
    onToggleRide,
    onSubmit,
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Thông tin mã giảm giá</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mã giảm giá</label>
                        <input
                            type="text"
                            value={form.coupon_code}
                            onChange={(event) => onChange("coupon_code", event.target.value.toUpperCase())}
                            placeholder="VD: THUEXE10"
                            maxLength={15}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.coupon_code} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề khuyến mãi</label>
                        <input
                            type="text"
                            value={form.coupon_title}
                            onChange={(event) => onChange("coupon_title", event.target.value)}
                            placeholder="Giảm giá cuối tuần"
                            maxLength={255}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Thành phố / route</label>
                        <select
                            value={form.city}
                            onChange={(event) => onChange("city", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            <option value="">Chọn thành phố</option>
                            {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.r_title}
                                </option>
                            ))}
                        </select>
                        <FieldError error={errors.city} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Hiển thị mã</label>
                        <select
                            value={form.visibility}
                            onChange={(event) => onChange("visibility", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {VISIBILITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Loại giảm giá</label>
                        <select
                            value={form.discount_type}
                            onChange={(event) => onChange("discount_type", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {DISCOUNT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái</label>
                        <select
                            value={form.status}
                            onChange={(event) => onChange("status", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Điều kiện áp dụng</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giá trị giảm</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.discount_value}
                            onChange={(event) => onChange("discount_value", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.discount_value} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giá trị đơn tối thiểu</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.min_fare}
                            onChange={(event) => onChange("min_fare", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.min_fare} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giảm tối đa</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.max_discount_amount}
                            onChange={(event) => onChange("max_discount_amount", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.max_discount_amount} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giới hạn tổng lượt dùng</label>
                        <input
                            type="number"
                            min={0}
                            step="1"
                            value={form.limit_count}
                            onChange={(event) => onChange("limit_count", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.limit_count} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giới hạn mỗi người dùng</label>
                        <input
                            type="number"
                            min={0}
                            step="1"
                            value={form.user_limit_count}
                            onChange={(event) => onChange("user_limit_count", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.user_limit_count} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
                        <input
                            type="datetime-local"
                            value={form.active_date}
                            onChange={(event) => onChange("active_date", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.active_date} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ngày hết hạn</label>
                        <input
                            type="datetime-local"
                            value={form.expiry_date}
                            onChange={(event) => onChange("expiry_date", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.expiry_date} />
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Danh sách loại xe áp dụng</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Không chọn xe nào nghĩa là áp dụng cho tất cả loại xe.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rides.map((ride) => (
                        <CheckboxRide
                            key={ride.id}
                            ride={ride}
                            checked={Array.isArray(form.vehicles) ? form.vehicles.includes(Number(ride.id)) : false}
                            onToggle={onToggleRide}
                        />
                    ))}
                </div>
            </section>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? "Đang lưu..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

