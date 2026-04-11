import ZonePolygonEditor from "../../components/maps/ZonePolygonEditor";
import { ZONE_FARE_TYPE_OPTIONS } from "../tariffs/tariffFormUtils";

function FieldError({ error }) {
    if (!error) return null;
    return <p className="mt-1 text-xs text-red-600">{error}</p>;
}

export default function ZoneForm({
    form,
    errors,
    cityRoutes,
    onChange,
    onSubmit,
    submitLabel,
    submitting,
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Thông tin vùng</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tên vùng</label>
                        <input
                            type="text"
                            placeholder="Ví dụ: Trung tâm TP. HCM"
                            value={form.title}
                            onChange={(event) => onChange("title", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
                        />
                        <FieldError error={errors.title} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Khu vực áp dụng</label>
                        <select
                            value={form.city_id}
                            onChange={(event) => onChange("city_id", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-cyan-500"
                        >
                            <option value="">Chọn thành phố</option>
                            {cityRoutes.map((route) => (
                                <option key={route.id} value={route.id}>
                                    {route.r_title}
                                </option>
                            ))}
                        </select>
                        <FieldError error={errors.city_id} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Kiểu tăng giá</label>
                        <select
                            value={form.zone_fare_type}
                            onChange={(event) => onChange("zone_fare_type", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-cyan-500"
                        >
                            {ZONE_FARE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError error={errors.zone_fare_type} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giá trị tăng</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.zone_fare_value}
                            onChange={(event) => onChange("zone_fare_value", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
                        />
                        <FieldError error={errors.zone_fare_value} />
                    </div>
                </div>

                <div className="mt-5">
                    <ZonePolygonEditor
                        value={form.zone_bound_coords}
                        onChange={(polygonValue) => onChange("zone_bound_coords", polygonValue)}
                    />
                    <FieldError error={errors.zone_bound_coords} />
                </div>
            </section>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? "Đang lưu..." : submitLabel}
                </button>
            </div>
        </form>
    );
}
