import { useMemo } from "react";
import RouteMapEditor from "../../components/maps/RouteMapEditor";
import CityAutocompleteInput from "../../components/maps/CityAutocompleteInput";
import {
    DEFAULT_FARE_FIELDS,
    DIST_UNIT_OPTIONS,
    NIGHT_FARE_FIELDS,
    PEAK_HOUR_FIELDS,
    ROUTE_SCOPE_OPTIONS,
    WEEKDAY_OPTIONS,
} from "./tariffFormUtils";

function FieldError({ error }) {
    if (!error) return null;
    return <p className="mt-1 text-xs text-red-600">{error}</p>;
}

function NumericField({ label, value, min, step, onChange, error }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
            <input
                type="number"
                min={min}
                step={step}
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
            <FieldError error={error} />
        </div>
    );
}

export default function TariffForm({
    routeForm,
    routeErrors,
    rides,
    currencies,
    cityRoutes,
    selectedRideIds,
    tariffRowsByRide,
    tariffErrors,
    onRouteChange,
    onToggleRide,
    onTariffChange,
    onSubmit,
    submitLabel,
    submitting,
}) {
    const selectedRides = useMemo(
        () => rides.filter((ride) => selectedRideIds.includes(ride.id)),
        [rides, selectedRideIds]
    );

    const scope = Number(routeForm.r_scope) === 0 ? "city" : "state";

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Thông tin tuyến / cước phí</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tên cước phí (bắt buộc là duy nhất)</label>
                        <input
                            type="text"
                            value={routeForm.r_title}
                            onChange={(event) => onRouteChange("r_title", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={routeErrors.r_title} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Loại phạm vi</label>
                        <select
                            value={routeForm.r_scope}
                            onChange={(event) => onRouteChange("r_scope", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {ROUTE_SCOPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {scope === "city" ? (
                        <>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tên thành phố</label>
                                <CityAutocompleteInput
                                    value={routeForm.c_name}
                                    onChange={(nextValue) => onRouteChange("c_name", nextValue)}
                                    onCitySelect={(city) => {
                                        if (city?.name) onRouteChange("c_name", city.name);
                                        if (city?.lat !== undefined && city?.lng !== undefined) {
                                            onRouteChange("lat", String(city.lat));
                                            onRouteChange("lng", String(city.lng));
                                        }
                                    }}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                                <FieldError error={routeErrors.c_name} />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tọa độ trung tâm</label>
                                <input
                                    type="text"
                                    value={`${routeForm.lat || "--"}, ${routeForm.lng || "--"}`}
                                    disabled
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-600"
                                />
                                <FieldError error={routeErrors.lng} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Thành phố đón</label>
                                <select
                                    value={routeForm.pickup_city_id}
                                    onChange={(event) => onRouteChange("pickup_city_id", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                >
                                    <option value="">Chọn thành phố</option>
                                    {cityRoutes.map((route) => (
                                        <option key={route.id} value={route.id}>
                                            {route.r_title}
                                        </option>
                                    ))}
                                </select>
                                <FieldError error={routeErrors.pickup_city_id} />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tên điểm đón</label>
                                <input
                                    type="text"
                                    value={routeForm.pick_name}
                                    onChange={(event) => onRouteChange("pick_name", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                                <FieldError error={routeErrors.pick_name} />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tên điểm trả</label>
                                <input
                                    type="text"
                                    value={routeForm.drop_name}
                                    onChange={(event) => onRouteChange("drop_name", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                                <FieldError error={routeErrors.drop_name} />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tọa độ đón/trả</label>
                                <input
                                    type="text"
                                    value={`Đón: ${routeForm.pick_lat || "--"}, ${routeForm.pick_lng || "--"} | Trả: ${routeForm.drop_lat || "--"}, ${routeForm.drop_lng || "--"}`}
                                    disabled
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-600"
                                />
                                <FieldError error={routeErrors.pick_lng} />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Đơn vị khoảng cách</label>
                        <select
                            value={routeForm.dist_unit}
                            onChange={(event) => onRouteChange("dist_unit", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {DIST_UNIT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tiền tệ</label>
                        <select
                            value={routeForm.city_currency_id}
                            onChange={(event) => onRouteChange("city_currency_id", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            <option value="">Chọn tiền tệ</option>
                            {currencies.map((currency) => (
                                <option key={currency.id} value={currency.id}>
                                    {currency.name} ({currency.iso_code}) - {currency.symbol}
                                </option>
                            ))}
                        </select>
                        <FieldError error={routeErrors.city_currency_id} />
                    </div>
                </div>

                <div className="mt-5">
                    <RouteMapEditor scope={scope} value={routeForm} onChange={onRouteChange} />
                    <FieldError error={routeErrors.city_bound_coords} />
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Chọn loại xe áp dụng</h2>
                <p className="mt-1 text-sm text-slate-500">Chọn một hoặc nhiều xe để nhập cước chi tiết.</p>
                {tariffErrors._global ? <p className="mt-2 text-sm text-red-600">{tariffErrors._global}</p> : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rides.map((ride) => {
                        const checked = selectedRideIds.includes(ride.id);

                        return (
                            <label
                                key={ride.id}
                                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                                    checked ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => onToggleRide(ride.id, event.target.checked)}
                                    className="mt-1 h-4 w-4"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-slate-800">{ride.ride_type}</span>
                                    <span className="text-xs text-slate-500">{ride.ride_desc}</span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </section>

            {selectedRides.map((ride) => {
                const row = tariffRowsByRide[ride.id];
                const rowErrors = tariffErrors[ride.id] || {};

                if (!row) return null;

                return (
                    <section key={ride.id} className="rounded-3xl border border-slate-200 bg-white p-5 space-y-6">
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <h3 className="text-lg font-bold text-slate-900">Cấu hình cước cho xe: {ride.ride_type}</h3>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                Ride #{ride.id}
                            </span>
                        </div>

                        <article className="rounded-2xl border border-slate-200 p-4">
                            <h4 className="text-base font-bold text-slate-900">Phí mặc định</h4>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {DEFAULT_FARE_FIELDS.map((field) => (
                                    <NumericField
                                        key={`${ride.id}-${field.key}`}
                                        label={field.label}
                                        value={row[field.key]}
                                        min={field.min}
                                        step={field.step}
                                        onChange={(event) => onTariffChange(ride.id, field.key, event.target.value)}
                                        error={rowErrors[field.key]}
                                    />
                                ))}
                            </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200 p-4">
                            <h4 className="text-base font-bold text-slate-900">Phí ban đêm</h4>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {NIGHT_FARE_FIELDS.map((field) => (
                                    <NumericField
                                        key={`${ride.id}-${field.key}`}
                                        label={field.label}
                                        value={row[field.key]}
                                        min={field.min}
                                        step={field.step}
                                        onChange={(event) => onTariffChange(ride.id, field.key, event.target.value)}
                                        error={rowErrors[field.key]}
                                    />
                                ))}
                            </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200 p-4">
                            <h4 className="text-base font-bold text-slate-900">Phí giờ cao điểm</h4>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {PEAK_HOUR_FIELDS.map((field) => (
                                    <NumericField
                                        key={`${ride.id}-${field.key}`}
                                        label={field.label}
                                        value={row[field.key]}
                                        min={field.min}
                                        step={field.step}
                                        onChange={(event) => onTariffChange(ride.id, field.key, event.target.value)}
                                        error={rowErrors[field.key]}
                                    />
                                ))}

                                <NumericField
                                    label="Giờ bắt đầu cao điểm (0-23)"
                                    value={row.pp_start}
                                    min={0}
                                    step="1"
                                    onChange={(event) => onTariffChange(ride.id, "pp_start", event.target.value)}
                                    error={rowErrors.pp_start}
                                />

                                <NumericField
                                    label="Giờ kết thúc cao điểm (0-23)"
                                    value={row.pp_end}
                                    min={0}
                                    step="1"
                                    onChange={(event) => onTariffChange(ride.id, "pp_end", event.target.value)}
                                    error={rowErrors.pp_end}
                                />

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Kiểu phụ phí cao điểm</label>
                                    <select
                                        value={row.pp_charge_type}
                                        onChange={(event) => onTariffChange(ride.id, "pp_charge_type", event.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                    >
                                        <option value="0">Cộng thêm tiền</option>
                                        <option value="1">Nhân hệ số</option>
                                    </select>
                                    <FieldError error={rowErrors.pp_charge_type} />
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="mb-2 text-sm font-semibold text-slate-700">Ngày áp dụng giờ cao điểm</p>
                                <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                                    {WEEKDAY_OPTIONS.map((day) => {
                                        const checked = Array.isArray(row.pp_active_days)
                                            ? row.pp_active_days.includes(day.value)
                                            : false;

                                        return (
                                            <label
                                                key={`${ride.id}-weekday-${day.value}`}
                                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                                    checked
                                                        ? "border-blue-300 bg-blue-50 text-blue-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-700"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(event) => {
                                                        const currentDays = Array.isArray(row.pp_active_days)
                                                            ? row.pp_active_days
                                                            : [];
                                                        const nextDays = event.target.checked
                                                            ? [...new Set([...currentDays, day.value])]
                                                            : currentDays.filter((item) => item !== day.value);
                                                        onTariffChange(ride.id, "pp_active_days", nextDays);
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                                {day.label}
                                            </label>
                                        );
                                    })}
                                </div>
                                <FieldError error={rowErrors.pp_active_days} />
                            </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200 p-4 space-y-4">
                            <h4 className="text-base font-bold text-slate-900">Tùy chọn nâng cao</h4>

                            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <span className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={row.cfare_enabled}
                                        onChange={(event) => onTariffChange(ride.id, "cfare_enabled", event.target.checked)}
                                        className="mt-1 h-4 w-4"
                                    />
                                    <span>
                                        <span className="block font-semibold text-slate-900">Bật tính cước theo quãng đường thực</span>
                                        <span className="mt-1 block text-xs text-slate-600">
                                            Khi được bật, cước phí chuyến đi sẽ được tính toán dựa trên tổng quãng đường thực tế đã đi và thời gian di chuyển được ghi lại bởi đồng hồ đo quãng đường trên ứng dụng dành cho tài xế. Tắt chức năng này để sử dụng cước phí ước tính cố định được tính toán dựa trên thời gian và quãng đường chuyến đi do API của Google Maps cung cấp.
                                        </span>
                                    </span>
                                </span>
                            </label>

                            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <span className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={row.rshare_enabled}
                                        onChange={(event) => onTariffChange(ride.id, "rshare_enabled", event.target.checked)}
                                        className="mt-1 h-4 w-4"
                                    />
                                    <span>
                                        <span className="block font-semibold text-slate-900">Bật tính năng đi chung xe</span>
                                        <span className="mt-1 block text-xs text-slate-600">
                                            Dịch vụ đi chung xe cho phép nhiều người đi từ các địa điểm khác nhau đến các điểm đến khác nhau cùng chia sẻ một chuyến đi và tiết kiệm chi phí.
                                        </span>
                                    </span>
                                </span>
                            </label>

                            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <span className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={row.hr_enabled}
                                        onChange={(event) => onTariffChange(ride.id, "hr_enabled", event.target.checked)}
                                        className="mt-1 h-4 w-4"
                                    />
                                    <span>
                                        <span className="block font-semibold text-slate-900">Bật giá theo giờ / khoảng cách</span>
                                        <span className="mt-1 block text-xs text-slate-600">
                                            Việc kích hoạt mức giá theo giờ cho phép khách hàng được thanh toán theo giờ trên Quick-Rides cho phương tiện này. Đặt chi phí mỗi giờ và cũng đặt khoảng cách tính bằng KM. Khi khách hàng di chuyển trong một khoảng thời gian hoặc quãng đường nhỏ hơn giá trị bạn đặt, họ sẽ bị tính phí theo số tiền bạn đặt; đây là mức tối thiểu. Nếu họ di chuyển với thời gian hoặc khoảng cách lớn hơn thì họ sẽ bị tính phí theo giá trị này với chi phí tương đương bổ sung theo phân số của một giờ (phút) nếu không tăng thêm cả giờ.
                                        </span>
                                    </span>
                                </span>
                            </label>

                            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <span className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={row.pp_enabled}
                                        onChange={(event) => onTariffChange(ride.id, "pp_enabled", event.target.checked)}
                                        className="mt-1 h-4 w-4"
                                    />
                                    <span>
                                        <span className="block font-semibold text-slate-900">Bật giờ cao điểm</span>
                                        <span className="mt-1 block text-xs text-slate-600">
                                            Nếu bật, hệ thống sẽ áp dụng mức giá giờ cao điểm theo cấu hình ở phần trên.
                                        </span>
                                    </span>
                                </span>
                            </label>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-900">Xe thay thế</p>
                                <p className="mt-1 text-xs text-slate-600">
                                    Khi người đặt chọn loại phương tiện này và nó không có sẵn, những tài xế sử dụng bất kỳ phương tiện thay thế nào mà bạn chọn sẽ được phân bổ chuyến đi nếu có.
                                </p>
                                {rides.length <= 1 ? (
                                    <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-slate-600">
                                        Không có loại xe nào khác để chọn làm phương tiện thay thế.
                                    </p>
                                ) : null}
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {rides
                                        .filter((optionRide) => optionRide.id !== ride.id)
                                        .map((optionRide) => {
                                            const checked = Array.isArray(row.alt_cars)
                                                ? row.alt_cars.includes(String(optionRide.id))
                                                : false;

                                            return (
                                                <label
                                                    key={`${ride.id}-alt-${optionRide.id}`}
                                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                                        checked
                                                            ? "border-blue-300 bg-blue-50 text-blue-700"
                                                            : "border-slate-200 bg-white text-slate-700"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) => {
                                                            const currentAltCars = Array.isArray(row.alt_cars)
                                                                ? row.alt_cars
                                                                : [];
                                                            const nextAltCars = event.target.checked
                                                                ? [...new Set([...currentAltCars, String(optionRide.id)])]
                                                                : currentAltCars.filter(
                                                                      (item) => item !== String(optionRide.id)
                                                                  );
                                                            onTariffChange(ride.id, "alt_cars", nextAltCars);
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                    {optionRide.ride_type}
                                                </label>
                                            );
                                        })}
                                </div>
                                <FieldError error={rowErrors.alt_cars} />
                            </div>
                        </article>
                    </section>
                );
            })}

            <div className="flex justify-end gap-3">
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
