export const ROUTE_SCOPE_OPTIONS = [
    { value: 0, label: "Nội thành" },
    { value: 1, label: "Liên tỉnh" },
];

export const DIST_UNIT_OPTIONS = [
    { value: 0, label: "KM" },
    { value: 1, label: "Miles" },
];

export const ZONE_FARE_TYPE_OPTIONS = [
    { value: 1, label: "Nhân hệ số" },
    { value: 2, label: "Cộng thêm tiền" },
];

export const WEEKDAY_OPTIONS = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 0, label: "Chủ nhật" },
];

export const DEFAULT_ROUTE_FORM = {
    r_title: "",
    c_name: "",
    pickup_city_id: "",
    pick_name: "",
    drop_name: "",
    r_scope: 0,
    lng: "",
    lat: "",
    pick_lng: "",
    pick_lat: "",
    drop_lng: "",
    drop_lat: "",
    city_bound_coords: "",
    dist_unit: 0,
    city_currency_id: "",
};

export const DEFAULT_FARE_FIELDS = [
    { key: "pickup_cost", label: "Phí đón", min: 0, step: "0.01" },
    { key: "drop_off_cost", label: "Phí trả", min: 0, step: "0.01" },
    { key: "cost_per_km", label: "Giá/KM", min: 0, step: "0.01" },
    { key: "cost_per_minute", label: "Giá/phút", min: 0, step: "0.01" },
    { key: "wait_time", label: "Thời gian chờ miễn phí (phút)", min: 0, step: "1" },
    { key: "wait_cost_per_minute", label: "Phí chờ/phút", min: 0, step: "0.01" },
    { key: "cancel_cost", label: "Phí hủy", min: 0, step: "0.01" },
    { key: "init_distance", label: "Quãng đường đầu (KM)", min: 0, step: "0.1" },
];

export const NIGHT_FARE_FIELDS = [
    { key: "npickup_cost", label: "Phí đón ban đêm", min: 0, step: "0.01" },
    { key: "ndrop_off_cost", label: "Phí trả ban đêm", min: 0, step: "0.01" },
    { key: "ncost_per_km", label: "Giá/KM ban đêm", min: 0, step: "0.01" },
    { key: "ncost_per_minute", label: "Giá/phút ban đêm", min: 0, step: "0.01" },
    { key: "nwait_time", label: "Thời gian chờ miễn phí đêm", min: 0, step: "1" },
    { key: "nwait_cost_per_minute", label: "Phí chờ đêm/phút", min: 0, step: "0.01" },
    { key: "ncancel_cost", label: "Phí hủy ban đêm", min: 0, step: "0.01" },
    { key: "init_distance_n", label: "Quãng đường đầu đêm (KM)", min: 0, step: "0.1" },
    { key: "nhr_cph", label: "Giá theo giờ đêm", min: 0, step: "0.01" },
    { key: "nhr_dist", label: "Khoảng cách giờ đêm (KM)", min: 0, step: "0.1" },
];

export const PEAK_HOUR_FIELDS = [
    { key: "hr_cph", label: "Giá theo giờ", min: 0, step: "0.01" },
    { key: "hr_dist", label: "Khoảng cách theo giờ (KM)", min: 0, step: "0.1" },
    { key: "pp_charge_value", label: "Giá trị phụ phí giờ cao điểm", min: 0, step: "0.01" },
];

const NUMERIC_FIELD_KEYS = [
    ...DEFAULT_FARE_FIELDS,
    ...NIGHT_FARE_FIELDS,
    ...PEAK_HOUR_FIELDS,
].map((item) => item.key);

function parseJsonArray(rawValue) {
    if (!rawValue) return [];

    if (Array.isArray(rawValue)) {
        return rawValue;
    }

    try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseAltCars(rawValue) {
    if (!rawValue) return [];

    if (Array.isArray(rawValue)) {
        return rawValue.map((value) => String(value));
    }

    return String(rawValue)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

export function buildDefaultTariffRow(rideId) {
    return {
        id: null,
        ride_id: rideId,
        pickup_cost: "0",
        drop_off_cost: "0",
        cost_per_km: "0",
        cost_per_minute: "0",
        wait_time: "0",
        wait_cost_per_minute: "0",
        cancel_cost: "0",
        init_distance: "1",
        npickup_cost: "0",
        ndrop_off_cost: "0",
        ncost_per_km: "0",
        ncost_per_minute: "0",
        nwait_time: "0",
        nwait_cost_per_minute: "0",
        ncancel_cost: "0",
        init_distance_n: "1",
        cfare_enabled: false,
        rshare_enabled: false,
        hr_enabled: false,
        hr_cph: "0",
        hr_dist: "1",
        nhr_cph: "0",
        nhr_dist: "1",
        pp_enabled: false,
        pp_start: "",
        pp_end: "",
        pp_active_days: [],
        pp_charge_type: "0",
        pp_charge_value: "0",
        alt_cars: [],
    };
}

export function hydrateTariffRow(row) {
    const base = buildDefaultTariffRow(row.ride_id);

    return {
        ...base,
        ...row,
        id: row.id || null,
        ride_id: Number(row.ride_id),
        cfare_enabled: Number(row.cfare_enabled) === 1,
        rshare_enabled: Number(row.rshare_enabled) === 1,
        hr_enabled: Number(row.hr_enabled) === 1,
        pp_enabled: Number(row.pp_enabled) === 1,
        pp_start: row.pp_start === null || row.pp_start === undefined ? "" : String(row.pp_start),
        pp_end: row.pp_end === null || row.pp_end === undefined ? "" : String(row.pp_end),
        pp_charge_type: row.pp_charge_type === undefined ? "0" : String(row.pp_charge_type),
        pp_active_days: parseJsonArray(row.pp_active_days)
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
        alt_cars: parseAltCars(row.alt_cars),
    };
}

export function validateTariffForm(routeForm, selectedRideIds, tariffRowsByRide) {
    const errors = {
        route: {},
        tariffs: {},
    };

    if (!routeForm.r_title.trim()) {
        errors.route.r_title = "Tên cước phí là bắt buộc.";
    }

    if (!routeForm.city_currency_id) {
        errors.route.city_currency_id = "Vui lòng chọn tiền tệ.";
    }

    if (Number(routeForm.r_scope) === 0) {
        if (!routeForm.c_name.trim()) {
            errors.route.c_name = "Tên thành phố là bắt buộc.";
        }

        if (!routeForm.city_bound_coords) {
            errors.route.city_bound_coords = "Bạn cần vẽ polygon khu vực thành phố.";
        }

        if (!routeForm.lat || !routeForm.lng) {
            errors.route.lng = "Bạn cần chọn tâm thành phố trên bản đồ.";
        }
    } else {
        if (!routeForm.pickup_city_id) {
            errors.route.pickup_city_id = "Vui lòng chọn thành phố đón.";
        }
        if (!routeForm.pick_name.trim()) {
            errors.route.pick_name = "Tên điểm đón là bắt buộc.";
        }
        if (!routeForm.drop_name.trim()) {
            errors.route.drop_name = "Tên điểm trả là bắt buộc.";
        }
        if (!routeForm.pick_lat || !routeForm.pick_lng || !routeForm.drop_lat || !routeForm.drop_lng) {
            errors.route.pick_lng = "Bạn cần chọn điểm đón/trả trên bản đồ.";
        }
    }

    if (!selectedRideIds.length) {
        errors.tariffs._global = "Bạn phải chọn ít nhất 1 loại xe.";
    }

    selectedRideIds.forEach((rideId) => {
        const row = tariffRowsByRide[rideId];

        if (!row) {
            errors.tariffs[rideId] = { _global: "Thiếu dữ liệu cước phí cho xe đã chọn." };
            return;
        }

        const rowErrors = {};

        NUMERIC_FIELD_KEYS.forEach((key) => {
            const numeric = Number(row[key]);
            if (!Number.isFinite(numeric) || numeric < 0) {
                rowErrors[key] = "Giá trị phải là số >= 0.";
            }
        });

        const start = row.pp_start === "" ? null : Number(row.pp_start);
        const end = row.pp_end === "" ? null : Number(row.pp_end);

        if (start !== null && (!Number.isInteger(start) || start < 0 || start > 23)) {
            rowErrors.pp_start = "Giờ bắt đầu phải từ 0-23.";
        }

        if (end !== null && (!Number.isInteger(end) || end < 0 || end > 23)) {
            rowErrors.pp_end = "Giờ kết thúc phải từ 0-23.";
        }

        if (!["0", "1", 0, 1].includes(row.pp_charge_type)) {
            rowErrors.pp_charge_type = "Kiểu phụ phí cao điểm không hợp lệ.";
        }

        if (row.pp_enabled && (!Array.isArray(row.pp_active_days) || row.pp_active_days.length === 0)) {
            rowErrors.pp_active_days = "Vui lòng chọn ít nhất 1 ngày áp dụng giờ cao điểm.";
        }

        if (Array.isArray(row.alt_cars) && row.alt_cars.includes(String(rideId))) {
            rowErrors.alt_cars = "Xe thay thế không được bao gồm chính nó.";
        }

        if (Object.keys(rowErrors).length) {
            errors.tariffs[rideId] = rowErrors;
        }
    });

    return errors;
}

export function hasTariffErrors(errors) {
    if (!errors) return false;
    if (Object.keys(errors.route || {}).length > 0) return true;
    if ((errors.tariffs && errors.tariffs._global) || Object.keys(errors.tariffs || {}).length > 0)
        return true;
    return false;
}

export function buildTariffSubmitPayload(routeForm, selectedRideIds, tariffRowsByRide) {
    return {
        route: {
            r_title: routeForm.r_title.trim(),
            c_name: routeForm.c_name.trim(),
            pickup_city_id: routeForm.pickup_city_id ? Number(routeForm.pickup_city_id) : 0,
            pick_name: routeForm.pick_name.trim(),
            drop_name: routeForm.drop_name.trim(),
            r_scope: Number(routeForm.r_scope),
            lng: routeForm.lng ? String(routeForm.lng) : "",
            lat: routeForm.lat ? String(routeForm.lat) : "",
            pick_lng: routeForm.pick_lng ? String(routeForm.pick_lng) : "",
            pick_lat: routeForm.pick_lat ? String(routeForm.pick_lat) : "",
            drop_lng: routeForm.drop_lng ? String(routeForm.drop_lng) : "",
            drop_lat: routeForm.drop_lat ? String(routeForm.drop_lat) : "",
            city_bound_coords: routeForm.city_bound_coords || "",
            dist_unit: Number(routeForm.dist_unit),
            city_currency_id: Number(routeForm.city_currency_id),
        },
        tariffs: selectedRideIds.map((rideId) => {
            const row = tariffRowsByRide[rideId];

            return {
                id: row.id || undefined,
                ride_id: Number(rideId),
                pickup_cost: Number(row.pickup_cost || 0),
                drop_off_cost: Number(row.drop_off_cost || 0),
                cost_per_km: Number(row.cost_per_km || 0),
                cost_per_minute: Number(row.cost_per_minute || 0),
                wait_time: Number(row.wait_time || 0),
                wait_cost_per_minute: Number(row.wait_cost_per_minute || 0),
                cancel_cost: Number(row.cancel_cost || 0),
                init_distance: Number(row.init_distance || 0),
                npickup_cost: Number(row.npickup_cost || 0),
                ndrop_off_cost: Number(row.ndrop_off_cost || 0),
                ncost_per_km: Number(row.ncost_per_km || 0),
                ncost_per_minute: Number(row.ncost_per_minute || 0),
                nwait_time: Number(row.nwait_time || 0),
                nwait_cost_per_minute: Number(row.nwait_cost_per_minute || 0),
                ncancel_cost: Number(row.ncancel_cost || 0),
                init_distance_n: Number(row.init_distance_n || 0),
                cfare_enabled: row.cfare_enabled ? 1 : 0,
                rshare_enabled: row.rshare_enabled ? 1 : 0,
                hr_enabled: row.hr_enabled ? 1 : 0,
                hr_cph: Number(row.hr_cph || 0),
                hr_dist: Number(row.hr_dist || 0),
                nhr_cph: Number(row.nhr_cph || 0),
                nhr_dist: Number(row.nhr_dist || 0),
                pp_enabled: row.pp_enabled ? 1 : 0,
                pp_start: row.pp_start === "" ? null : Number(row.pp_start),
                pp_end: row.pp_end === "" ? null : Number(row.pp_end),
                pp_active_days: JSON.stringify(
                    Array.isArray(row.pp_active_days)
                        ? row.pp_active_days.map((value) => Number(value)).filter((value) => Number.isInteger(value))
                        : []
                ),
                pp_charge_type: Number(row.pp_charge_type || 0),
                pp_charge_value: Number(row.pp_charge_value || 0),
                alt_cars: Array.isArray(row.alt_cars) && row.alt_cars.length
                    ? row.alt_cars.map((value) => String(value).trim()).filter(Boolean).join(",")
                    : null,
            };
        }),
    };
}

export function parseRouteFormFromDetail(route) {
    return {
        r_title: route?.r_title || "",
        c_name: route?.c_name || "",
        pickup_city_id: route?.pickup_city_id ? String(route.pickup_city_id) : "",
        pick_name: route?.pick_name || "",
        drop_name: route?.drop_name || "",
        r_scope: Number(route?.r_scope || 0),
        lng: route?.lng || "",
        lat: route?.lat || "",
        pick_lng: route?.pick_lng || "",
        pick_lat: route?.pick_lat || "",
        drop_lng: route?.drop_lng || "",
        drop_lat: route?.drop_lat || "",
        city_bound_coords: route?.city_bound_coords || "",
        dist_unit: Number(route?.dist_unit || 0),
        city_currency_id: route?.city_currency_id ? String(route.city_currency_id) : "",
    };
}
