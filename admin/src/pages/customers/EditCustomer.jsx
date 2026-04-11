import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, findCountryByCode } from "../../data/countries";
import {
    getCustomerDetail,
    getRoutes,
    updateCustomerActivationStatus,
    updateCustomerPersonalInfo,
} from "../../services/customerService";
import {
    buildInternationalPhoneNumber,
    mapApiValidationErrors,
    normalizeNationalPhoneNumber,
    validateCustomerPersonalForm,
} from "./customerFormUtils";
import { buildCustomerDetailPath } from "./customerNavigation";

const initialForm = {
    firstname: "",
    lastname: "",
    route_id: "",
    account_active: "1",
    is_activated: "0",
    country_code: DEFAULT_COUNTRY_CODE,
    phone: "",
    email: "",
    address: "",
    photo_file: null,
};

function buildPersonalInfoFormData(form) {
    const formData = new FormData();
    const selectedCountry = findCountryByCode(form.country_code);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);

    if (form.photo_file) {
        formData.append("photo_file", form.photo_file);
    }

    formData.append("firstname", form.firstname.trim());
    formData.append("lastname", form.lastname.trim());
    formData.append("route_id", form.route_id);
    formData.append("account_active", form.account_active);
    formData.append("phone", fullPhone);
    formData.append("country", selectedCountry.name);
    formData.append("country_code", selectedCountry.code);
    formData.append("country_dial_code", selectedCountry.dialCode);
    formData.append("email", form.email.trim());
    formData.append("address", form.address.trim());

    return formData;
}

export default function EditCustomer() {
    const { userId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [form, setForm] = useState(initialForm);
    const [customer, setCustomer] = useState(null);
    const [routeOptions, setRouteOptions] = useState([]);
    const [routesLoading, setRoutesLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });
    const [pageError, setPageError] = useState("");

    const selectedCountry = useMemo(() => findCountryByCode(form.country_code), [form.country_code]);
    const previewUrl = useMemo(() => {
        if (form.photo_file) {
            return URL.createObjectURL(form.photo_file);
        }

        return customer?.photo_file || "";
    }, [form.photo_file, customer?.photo_file]);
    const normalizedPhonePreview = useMemo(
        () => buildInternationalPhoneNumber(form.phone, selectedCountry),
        [form.phone, selectedCountry]
    );

    useEffect(() => {
        if (!form.photo_file || !previewUrl.startsWith("blob:")) {
            return undefined;
        }

        return () => {
            URL.revokeObjectURL(previewUrl);
        };
    }, [form.photo_file, previewUrl]);

    async function loadPage() {
        setLoading(true);
        setRoutesLoading(true);
        setPageError("");

        try {
            const [detailData, routesData] = await Promise.all([
                getCustomerDetail(userId),
                getRoutes(),
            ]);
            const nextCustomer = detailData?.customer || null;
            const nextCountry = findCountryByCode(nextCustomer?.country_code || DEFAULT_COUNTRY_CODE);

            setCustomer(nextCustomer);
            setRouteOptions(routesData);
            setForm({
                firstname: nextCustomer?.firstname || "",
                lastname: nextCustomer?.lastname || "",
                route_id: nextCustomer?.route_id ? String(nextCustomer.route_id) : "",
                account_active: String(Number(nextCustomer?.account_active) === 1 ? 1 : 0),
                is_activated: String(Number(nextCustomer?.is_activated) === 1 ? 1 : 0),
                country_code: nextCountry.code,
                phone: normalizeNationalPhoneNumber(nextCustomer?.phone, nextCountry),
                email: nextCustomer?.email || "",
                address: nextCustomer?.address || "",
                photo_file: null,
            });
        } catch (error) {
            setPageError(
                error?.response?.data?.message ||
                "Không tải được thông tin khách hàng để chỉnh sửa. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
            setRoutesLoading(false);
        }
    }

    useEffect(() => {
        loadPage();
    }, [userId]);

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setMessage({ type: "", text: "" });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = validateCustomerPersonalForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setMessage({
                type: "error",
                text: "Vui lòng kiểm tra lại thông tin cá nhân trước khi cập nhật.",
            });
            return;
        }

        setSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            const response = await updateCustomerPersonalInfo(userId, buildPersonalInfoFormData(form));
            const shouldUpdateActivation =
                Number(customer?.is_activated) !== Number(form.is_activated);
            const activationResponse = shouldUpdateActivation
                ? await updateCustomerActivationStatus(userId, {
                    user_id: Number(userId),
                    is_activated: Number(form.is_activated) === 1 ? 1 : 0,
                })
                : null;
            const updatedCustomer = activationResponse?.customer || response?.customer || null;
            const updatedCountry = findCountryByCode(
                updatedCustomer?.country_code || form.country_code || DEFAULT_COUNTRY_CODE
            );

            setCustomer(updatedCustomer);
            setForm((prev) => ({
                ...prev,
                firstname: updatedCustomer?.firstname || prev.firstname,
                lastname: updatedCustomer?.lastname || prev.lastname,
                route_id: updatedCustomer?.route_id ? String(updatedCustomer.route_id) : "",
                account_active: String(Number(updatedCustomer?.account_active) === 1 ? 1 : 0),
                is_activated: String(Number(updatedCustomer?.is_activated) === 1 ? 1 : 0),
                country_code: updatedCountry.code,
                phone: normalizeNationalPhoneNumber(updatedCustomer?.phone, updatedCountry),
                email: updatedCustomer?.email || prev.email,
                address: updatedCustomer?.address || "",
                photo_file: null,
            }));
            setMessage({
                type: "success",
                text: "Đã cập nhật thông tin cá nhân khách hàng.",
            });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};

            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }

            setMessage({
                type: "error",
                text: data.message || "Không thể cập nhật thông tin khách hàng. Vui lòng thử lại.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">
                        Customer edit
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">Sửa thông tin cá nhân khách hàng</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Cập nhật hồ sơ cá nhân mà không làm thay đổi dữ liệu booking, review,
                        transactions hay documents.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to={buildCustomerDetailPath(role, userId)}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        Xem chi tiết
                    </Link>
                    <button
                        type="button"
                        onClick={loadPage}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tải lại
                    </button>
                </div>
            </div>

            {pageError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{pageError}</span>
                    </div>
                </div>
            ) : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Đang tải hồ sơ khách hàng...</span>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Họ
                                </label>
                                <input
                                    type="text"
                                    value={form.firstname}
                                    onChange={(event) => updateField("firstname", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                    maxLength={64}
                                />
                                {errors.firstname ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.firstname}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Tên
                                </label>
                                <input
                                    type="text"
                                    value={form.lastname}
                                    onChange={(event) => updateField("lastname", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                    maxLength={64}
                                />
                                {errors.lastname ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.lastname}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Khu vực / thành phố
                                </label>
                                <select
                                    value={form.route_id}
                                    onChange={(event) => updateField("route_id", event.target.value)}
                                    disabled={routesLoading}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {routesLoading ? "Đang tải khu vực..." : "Chọn khu vực"}
                                    </option>
                                    {routeOptions.map((route) => (
                                        <option key={route.id} value={route.id}>
                                            {route.r_title}
                                        </option>
                                    ))}
                                </select>
                                {errors.route_id ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.route_id}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Trạng thái tài khoản
                                </label>
                                <select
                                    value={form.account_active}
                                    onChange={(event) => updateField("account_active", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"
                                >
                                    <option value="1">Đang hoạt động</option>
                                    <option value="0">Đang khóa</option>
                                </select>
                                {errors.account_active ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.account_active}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Trang thai kich hoat
                                </label>
                                <select
                                    value={form.is_activated}
                                    onChange={(event) => updateField("is_activated", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"
                                >
                                    <option value="1">Da kich hoat</option>
                                    <option value="0">Chua kich hoat</option>
                                </select>
                                {errors.is_activated ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.is_activated}</p>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Địa chỉ
                            </label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(event) => updateField("address", event.target.value)}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                maxLength={255}
                            />
                            {errors.address ? (
                                <p className="mt-2 text-sm text-red-600">{errors.address}</p>
                            ) : null}
                        </div>



                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Số điện thoại
                                </label>
                                <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
                                    <select
                                        value={form.country_code}
                                        onChange={(event) => updateField("country_code", event.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"
                                    >
                                        {COUNTRIES.map((country) => (
                                            <option key={country.code} value={country.code}>
                                                {country.flag} {country.name} ({country.dialCode})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={(event) => updateField("phone", event.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                        placeholder={selectedCountry.phonePlaceholder}
                                        inputMode="tel"
                                        maxLength={20}
                                    />
                                </div>
                                {normalizedPhonePreview ? (
                                    <p className="mt-2 text-xs font-medium text-cyan-700">
                                        Số sẽ lưu: {normalizedPhonePreview}
                                    </p>
                                ) : null}
                                {errors.phone ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                                ) : null}
                            </div>

                            {/* Email */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => updateField("email", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                    maxLength={64}
                                />
                                {errors.email ? (
                                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                                ) : null}
                            </div>

                        </div>
                    </section>

                    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Ảnh đại diện
                            </label>
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700">
                                <ImagePlus className="h-4 w-4" />
                                <span>Chọn ảnh mới</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={(event) =>
                                        updateField("photo_file", event.target.files?.[0] || null)
                                    }
                                    className="hidden"
                                />
                            </label>
                            <p className="mt-2 text-xs text-slate-500">
                                Nếu không chọn ảnh mới, hệ thống sẽ giữ nguyên ảnh hiện tại.
                            </p>
                            {errors.photo_file ? (
                                <p className="mt-2 text-sm text-red-600">{errors.photo_file}</p>
                            ) : null}
                        </div>

                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt={customer?.full_name || "Customer preview"}
                                    className="h-72 w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                                    <ImagePlus className="h-8 w-8 text-slate-300" />
                                    <p>Khách hàng này chưa có ảnh đại diện.</p>
                                </div>
                            )}
                        </div>

                        {message.text ? (
                            <div
                                className={`rounded-2xl px-4 py-3 text-sm ${message.type === "success"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    {message.type === "success" ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    )}
                                    <span>{message.text}</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {submitting ? "Đang cập nhật..." : "Cập nhật thông tin"}
                            </button>
                            <Link
                                to={buildCustomerDetailPath(role, userId)}
                                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                                Hủy
                            </Link>
                        </div>
                    </section>
                </form>
            )}
        </div>
    );
}
