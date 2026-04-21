import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    MapPin,
    Package,
    Plus,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import {
    createRentalPackage,
    fetchVehicleTypes,
    listRentalPackages,
    toggleRentalPackageActive,
    updateRentalPackage,
} from "../../services/rentalPackageService";
import CoverageMapEditor from "../../components/maps/CoverageMapEditor";

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABEL = { 1: "Thuê xe", 2: "Thuê tài xế", 3: "Xe + Tài xế" };

const COVERAGE_TYPE_LABEL = {
    polygon: "Đa giác",
    circle: "Hình tròn",
    rectangle: "Hình chữ nhật",
};

const EMPTY_FORM = {
    service_type: "1",
    type_id: "",
    package_name: "",
    duration_hours: "",
    duration_days: "",
    price: "",
    distance_limit_km: "",
    extra_km_fee: "",
    extra_hour_fee: "",
    deposit_amount: "",
    description: "",
    active: "1",
    // GIS fields
    is_geo_enabled: "1",
    coverage_type: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatVnd(value) {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

// ── PackageFormModal ──────────────────────────────────────────────────────────

function PackageFormModal({ initial, onClose, onSaved, vehicleTypes }) {
    const isEdit = Boolean(initial?.package_id);

    // Khởi tạo form state từ dữ liệu cũ (khi edit) hoặc EMPTY_FORM (khi tạo mới)
    const [form, setForm] = useState(() =>
        isEdit
            ? {
                  service_type: String(initial.service_type ?? 1),
                  type_id: initial.type_id === null ? "" : String(initial.type_id),
                  package_name: initial.package_name ?? "",
                  duration_hours: initial.duration_hours === null ? "" : String(initial.duration_hours),
                  duration_days: initial.duration_days === null ? "" : String(initial.duration_days),
                  price: String(initial.price ?? 0),
                  distance_limit_km: String(initial.distance_limit_km ?? 0),
                  extra_km_fee: String(initial.extra_km_fee ?? 0),
                  extra_hour_fee: String(initial.extra_hour_fee ?? 0),
                  deposit_amount: String(initial.deposit_amount ?? 0),
                  description: initial.description ?? "",
                  active: String(initial.active ?? 1),
                  is_geo_enabled: String(initial.is_geo_enabled ?? 1),
                  coverage_type: initial.coverage_type ?? "",
              }
            : { ...EMPTY_FORM }
    );

    // Dữ liệu GIS từ bản đồ (được CoverageMapEditor callback về)
    const [geoShape, setGeoShape] = useState(() =>
        isEdit
            ? {
                  geojson: initial.coverage_geojson || null,
                  center_lat: initial.center_lat ?? null,
                  center_lng: initial.center_lng ?? null,
                  radius_km: initial.radius_km ?? null,
              }
            : { geojson: null, center_lat: null, center_lng: null, radius_km: null }
    );

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // initialData ổn định để truyền vào CoverageMapEditor (tránh re-render vô tận)
    const mapInitialData = useMemo(
        () => ({
            geojson: initial?.coverage_geojson || null,
            center_lat: initial?.center_lat ?? null,
            center_lng: initial?.center_lng ?? null,
            radius_km: initial?.radius_km ?? null,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    function set(field) {
        return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }

    // Callback từ CoverageMapEditor
    const handleMapChange = useCallback((shapeData) => {
        setGeoShape(shapeData);
    }, []);

    // Validate + submit
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!form.package_name.trim()) { setError("Tên gói không được để trống."); return; }
        if (!form.price || Number(form.price) < 0) { setError("Giá phải >= 0."); return; }

        const isGeoEnabled = Number(form.is_geo_enabled);
        const coverageType = form.coverage_type || null;

        // Validate GIS nếu bật giới hạn vùng
        if (isGeoEnabled && coverageType) {
            if (coverageType === "circle") {
                if (geoShape.center_lat == null || geoShape.center_lng == null || !geoShape.radius_km) {
                    setError("Vui lòng vẽ vùng tròn trên bản đồ (tâm + bán kính).");
                    return;
                }
            } else if (coverageType === "polygon" || coverageType === "rectangle") {
                if (!geoShape.geojson) {
                    setError(`Vui lòng vẽ vùng ${COVERAGE_TYPE_LABEL[coverageType]} trên bản đồ.`);
                    return;
                }
            }
        }

        const data = {
            service_type: Number(form.service_type),
            type_id: form.type_id === "" ? null : Number(form.type_id),
            package_name: form.package_name.trim(),
            duration_hours: form.duration_hours === "" ? null : Number(form.duration_hours),
            duration_days: form.duration_days === "" ? null : Number(form.duration_days),
            price: Number(form.price),
            distance_limit_km: Number(form.distance_limit_km) || 0,
            extra_km_fee: Number(form.extra_km_fee) || 0,
            extra_hour_fee: Number(form.extra_hour_fee) || 0,
            deposit_amount: Number(form.deposit_amount) || 0,
            description: form.description.trim() || null,
            active: Number(form.active),
            // GIS
            is_geo_enabled: isGeoEnabled,
            coverage_type: isGeoEnabled ? coverageType : null,
            coverage_geojson: isGeoEnabled && coverageType !== "circle" ? geoShape.geojson : null,
            center_lat: isGeoEnabled && coverageType === "circle" ? geoShape.center_lat : null,
            center_lng: isGeoEnabled && coverageType === "circle" ? geoShape.center_lng : null,
            radius_km: isGeoEnabled && coverageType === "circle" ? geoShape.radius_km : null,
        };

        setSubmitting(true);
        try {
            if (isEdit) {
                await updateRentalPackage(initial.package_id, data);
            } else {
                await createRentalPackage(data);
            }
            onSaved();
        } catch (err) {
            setError(err?.response?.data?.message || "Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    const field = (label, key, type = "text", extra = {}) => (
        <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
            <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                {...extra}
            />
        </div>
    );

    const showMap = form.is_geo_enabled === "1" && Boolean(form.coverage_type);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
            <div className="w-full max-w-2xl rounded-[24px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="text-base font-semibold text-slate-900">
                        {isEdit ? `Sửa gói #${initial.package_id}` : "Tạo gói thuê mới"}
                    </h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* ── Thông tin cơ bản ───────────────────────────────── */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Loại dịch vụ</label>
                            <select
                                value={form.service_type}
                                onChange={set("service_type")}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            >
                                <option value="1">Thuê xe</option>
                                <option value="2">Thuê tài xế</option>
                                <option value="3">Xe + Tài xế</option>
                            </select>
                        </div>

                        {field("Tên gói *", "package_name")}

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Loại xe áp dụng</label>
                            <select
                                value={form.type_id}
                                onChange={set("type_id")}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            >
                                <option value="">Tất cả loại xe</option>
                                {(vehicleTypes || []).map((vt) => (
                                    <option key={vt.type_id} value={String(vt.type_id)}>
                                        {vt.type_name} ({vt.seat_count} chỗ)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {field("Thời lượng (giờ)", "duration_hours", "number", { min: 1 })}
                        {field("Thời lượng (ngày)", "duration_days", "number", { min: 1 })}
                        {field("Giá (VND) *", "price", "number", { min: 0 })}
                        {field("Giới hạn km", "distance_limit_km", "number", { min: 0 })}
                        {field("Phí km vượt (VND/km)", "extra_km_fee", "number", { min: 0 })}
                        {field("Phí giờ vượt (VND/giờ)", "extra_hour_fee", "number", { min: 0 })}
                        {field("Tiền đặt cọc (VND)", "deposit_amount", "number", { min: 0 })}

                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
                            <textarea
                                value={form.description}
                                onChange={set("description")}
                                rows={2}
                                maxLength={255}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái</label>
                            <select
                                value={form.active}
                                onChange={set("active")}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            >
                                <option value="1">Đang hoạt động</option>
                                <option value="0">Tạm dừng</option>
                            </select>
                        </div>
                    </div>

                    {/* ── Cấu hình khu vực áp dụng ──────────────────────── */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-semibold text-slate-800">Khu vực áp dụng</span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Giới hạn vùng</label>
                                <select
                                    value={form.is_geo_enabled}
                                    onChange={set("is_geo_enabled")}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                                >
                                    <option value="1">Có giới hạn vùng</option>
                                    <option value="0">Toàn quốc (không giới hạn)</option>
                                </select>
                            </div>

                            {form.is_geo_enabled === "1" && (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Loại vùng</label>
                                    <select
                                        value={form.coverage_type}
                                        onChange={(e) => {
                                            // Khi đổi loại vùng, reset shape cũ
                                            setGeoShape({ geojson: null, center_lat: null, center_lng: null, radius_km: null });
                                            set("coverage_type")(e);
                                        }}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                                    >
                                        <option value="">-- Chọn loại vùng --</option>
                                        <option value="polygon">Đa giác (Polygon)</option>
                                        <option value="circle">Hình tròn (Circle)</option>
                                        <option value="rectangle">Hình chữ nhật (Rectangle)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Thông tin tóm tắt shape hiện tại */}
                        {showMap && form.coverage_type === "circle" && geoShape.center_lat != null && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                                Tâm: ({geoShape.center_lat?.toFixed(5)}, {geoShape.center_lng?.toFixed(5)})
                                — Bán kính: {geoShape.radius_km} km
                            </div>
                        )}

                        {/* Bản đồ vẽ vùng */}
                        {showMap && (
                            <CoverageMapEditor
                                coverageType={form.coverage_type}
                                initialData={mapInitialData}
                                onChange={handleMapChange}
                            />
                        )}

                        {form.is_geo_enabled === "0" && (
                            <p className="text-xs text-slate-500">
                                Gói thuê sẽ hiển thị với tất cả người dùng, không phân biệt vị trí.
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Huỷ
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {submitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo gói"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── RentalPackagesPage ────────────────────────────────────────────────────────

export default function RentalPackagesPage() {
    const [items, setItems] = useState([]);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [modal, setModal] = useState(null); // null | { mode: "create" | "edit", data?: package }

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState({ search: "", service_type: "", active: "" });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });

    const query = useMemo(
        () => ({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
            service_type: filters.service_type,
            active: filters.active,
        }),
        [filters, pagination.page, pagination.limit]
    );

    useEffect(() => {
        fetchVehicleTypes().then(setVehicleTypes).catch(() => {});
    }, []);

    async function loadData() {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await listRentalPackages(query);
            setItems(data.items || []);
            setPagination((prev) => ({ ...prev, totalPages: 1 }));
        } catch (err) {
            setErrorMessage(err?.response?.data?.message || "Không tải được danh sách gói thuê.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, [query]);

    async function handleToggleActive(pkg) {
        const next = Number(pkg.active) === 1 ? 0 : 1;
        setActionId(pkg.package_id);
        try {
            await toggleRentalPackageActive(pkg.package_id, next);
            setItems((prev) =>
                prev.map((p) => (p.package_id === pkg.package_id ? { ...p, active: next } : p))
            );
        } catch (err) {
            setErrorMessage(err?.response?.data?.message || "Không cập nhật được trạng thái.");
        } finally {
            setActionId(null);
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-300">
                        <Package className="mr-1.5 inline-block h-3.5 w-3.5" />Rental Packages
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Quản lý gói thuê chuẩn</h1>
                    <p className="mt-1 text-sm text-slate-300">
                        Gói thuê xe · Gói thuê tài xế · Khu vực áp dụng
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                    >
                        <RefreshCw className="h-4 w-4" /> Tải lại
                    </button>
                    <button
                        type="button"
                        onClick={() => setModal({ mode: "create" })}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                    >
                        <Plus className="h-4 w-4" /> Tạo gói mới
                    </button>
                </div>
            </div>

            {/* Filters */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setPagination((p) => ({ ...p, page: 1 }));
                    setFilters((f) => ({ ...f, search: searchInput.trim() }));
                }}
                className="rounded-3xl border border-slate-200 bg-white p-3 sm:p-4"
            >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <input
                        type="text"
                        placeholder="Tìm theo tên gói..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="min-h-11 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                    <select
                        value={filters.service_type}
                        onChange={(e) => { setPagination((p) => ({ ...p, page: 1 })); setFilters((f) => ({ ...f, service_type: e.target.value })); }}
                        className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">Tất cả dịch vụ</option>
                        <option value="1">Thuê xe</option>
                        <option value="2">Thuê tài xế</option>
                        <option value="3">Xe + Tài xế</option>
                    </select>
                    <select
                        value={filters.active}
                        onChange={(e) => { setPagination((p) => ({ ...p, page: 1 })); setFilters((f) => ({ ...f, active: e.target.value })); }}
                        className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="1">Đang hoạt động</option>
                        <option value="0">Tạm dừng</option>
                    </select>
                    <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                        <Search className="h-4 w-4" /> Tìm
                    </button>
                </div>
            </form>

            {errorMessage ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
            ) : null}

            {/* Table */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {loading ? (
                    <div className="flex min-h-56 items-center justify-center text-slate-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải...
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có gói thuê nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">ID</th>
                                    <th className="px-5 py-3">Tên gói</th>
                                    <th className="px-5 py-3">Dịch vụ</th>
                                    <th className="px-5 py-3">Loại xe</th>
                                    <th className="px-5 py-3">Thời lượng</th>
                                    <th className="px-5 py-3">Giá (VND)</th>
                                    <th className="px-5 py-3">Đặt cọc</th>
                                    <th className="px-5 py-3">Km giới hạn</th>
                                    <th className="px-5 py-3">Vùng áp dụng</th>
                                    <th className="px-5 py-3">Trạng thái</th>
                                    <th className="px-5 py-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((pkg) => {
                                    const isActive = Number(pkg.active) === 1;
                                    const isActing = actionId === pkg.package_id;
                                    const duration = [
                                        pkg.duration_hours ? `${pkg.duration_hours}h` : null,
                                        pkg.duration_days ? `${pkg.duration_days}d` : null,
                                    ].filter(Boolean).join(" / ") || "--";

                                    // Badge vùng áp dụng
                                    let geoLabel = "--";
                                    let geoBadgeClass = "bg-slate-100 text-slate-500";
                                    if (!pkg.is_geo_enabled) {
                                        geoLabel = "Toàn quốc";
                                        geoBadgeClass = "bg-sky-100 text-sky-700";
                                    } else if (pkg.coverage_type) {
                                        geoLabel = COVERAGE_TYPE_LABEL[pkg.coverage_type] ?? pkg.coverage_type;
                                        geoBadgeClass = "bg-blue-100 text-blue-700";
                                        if (pkg.coverage_type === "circle" && pkg.radius_km) {
                                            geoLabel += ` (${pkg.radius_km} km)`;
                                        }
                                    }

                                    return (
                                        <tr key={pkg.package_id} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-3 text-sm font-semibold text-slate-800">#{pkg.package_id}</td>
                                            <td className="px-5 py-3 text-sm text-slate-800">{pkg.package_name}</td>
                                            <td className="px-5 py-3">
                                                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                                                    {SERVICE_TYPE_LABEL[pkg.service_type] ?? pkg.service_type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500">
                                                {pkg.type_id == null
                                                    ? <span className="italic text-slate-400">Tất cả</span>
                                                    : (vehicleTypes.find((vt) => vt.type_id === pkg.type_id)?.type_name ?? `#${pkg.type_id}`)}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-700">{duration}</td>
                                            <td className="px-5 py-3 text-sm font-medium text-slate-800">{formatVnd(pkg.price)}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600">{formatVnd(pkg.deposit_amount)}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600">{pkg.distance_limit_km} km</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${geoBadgeClass}`}>
                                                    {pkg.coverage_type && <MapPin className="h-3 w-3" />}
                                                    {geoLabel}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                    {isActive ? "Hoạt động" : "Tạm dừng"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setModal({ mode: "edit", data: pkg })}
                                                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isActing}
                                                        onClick={() => handleToggleActive(pkg)}
                                                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${isActive ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                                                    >
                                                        {isActing ? "..." : isActive ? "Tạm dừng" : "Kích hoạt"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
                    <p className="text-slate-500">
                        Tổng: <span className="font-semibold text-slate-900">{items.length}</span> gói
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            className="inline-flex min-h-9 items-center rounded-xl border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            className="inline-flex min-h-9 items-center rounded-xl border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Modal create/edit */}
            {modal ? (
                <PackageFormModal
                    initial={modal.mode === "edit" ? modal.data : null}
                    vehicleTypes={vehicleTypes}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); loadData(); }}
                />
            ) : null}
        </div>
    );
}
