import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { createCustomer, getRoutes } from "../../services/customerService";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, findCountryByCode } from "../../data/countries";

const initialForm = {
    firstname: "",
    lastname: "",
    route_id: "",
    country_code: DEFAULT_COUNTRY_CODE,
    phone: "",
    email: "",
    password: "",
    activation_pin: "",
    account_activation: false,
    photo_file: null,
};

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const internationalPhoneRegex = /^\+\d{8,15}$/;

function sanitizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeNationalPhoneNumber(rawPhone, country) {
    let digits = sanitizePhoneDigits(rawPhone);
    const dialDigits = sanitizePhoneDigits(country?.dialCode || "");

    if (!digits) {
        return "";
    }

    if (dialDigits && digits.startsWith(dialDigits)) {
        digits = digits.slice(dialDigits.length);
    }

    if (digits.startsWith("0")) {
        digits = digits.replace(/^0+/, "");
    }

    return digits;
}

function buildInternationalPhoneNumber(rawPhone, country) {
    const nationalNumber = normalizeNationalPhoneNumber(rawPhone, country);
    return nationalNumber ? `${country.dialCode}${nationalNumber}` : "";
}

function validateCustomerForm(form) {
    const errors = {};
    const firstname = form.firstname.trim();
    const lastname = form.lastname.trim();
    const routeId = String(form.route_id || "").trim();
    const selectedCountry = findCountryByCode(form.country_code);
    const phone = normalizeNationalPhoneNumber(form.phone, selectedCountry);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);
    const email = form.email.trim();
    const password = String(form.password || "");
    const imageFile = form.photo_file;

    if (firstname.length < 2 || firstname.length > 64) {
        errors.firstname = "Họ phải có từ 2 đến 64 ký tự.";
    }

    if (lastname.length < 2 || lastname.length > 64) {
        errors.lastname = "Tên phải có từ 2 đến 64 ký tự.";
    }

    if (!routeId) {
        errors.route_id = "Vui lòng chọn khu vực hoặc thành phố.";
    }

    if (!selectedCountry) {
        errors.country_code = "Vui lòng chọn quốc gia.";
    }

    if (phone.length < 4 || phone.length > 14 || !internationalPhoneRegex.test(fullPhone)) {
        errors.phone = "Số điện thoại không hợp lệ. Hãy chọn quốc gia và nhập đúng số thuê bao.";
    }

    if (!email) {
        errors.email = "Email là bắt buộc.";
    } else if (email.length > 64 || !emailRegex.test(email)) {
        errors.email = "Email không đúng định dạng hoặc vượt quá 64 ký tự.";
    }

    if (password.length < 10) {
        errors.password = "Password phải có ít nhất 10 ký tự.";
    }

    if (imageFile) {
        if (!allowedImageTypes.includes(imageFile.type)) {
            errors.photo_file = "Ảnh phải là jpeg, png, webp hoặc gif.";
        } else if (imageFile.size > 2 * 1024 * 1024) {
            errors.photo_file = "Dung lượng ảnh không được vượt quá 2MB.";
        }
    }

    return errors;
}

function mapApiValidationErrors(details = []) {
    const mappedErrors = {};

    details.forEach((item) => {
        const field = item?.path;
        const message = item?.msg;

        if (field && message && !mappedErrors[field]) {
            mappedErrors[field] = message;
        }
    });

    return mappedErrors;
}

function buildCustomerFormData(form) {
    const formData = new FormData();
    const selectedCountry = findCountryByCode(form.country_code);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);

    if (form.photo_file) {
        formData.append("photo_file", form.photo_file);
    }

    formData.append("firstname", form.firstname.trim());
    formData.append("lastname", form.lastname.trim());
    formData.append("route_id", form.route_id);
    formData.append("phone", fullPhone);
    formData.append("country", selectedCountry.name);
    formData.append("country_code", selectedCountry.code);
    formData.append("country_dial_code", selectedCountry.dialCode);
    formData.append("email", form.email.trim());
    formData.append("password", form.password);
    formData.append("activation_pin", form.activation_pin.trim());

    const activationFlag = form.account_activation ? "1" : "0";
    formData.append("is_activated", activationFlag);
    formData.append("account_active", activationFlag);

    return formData;
}

export default function NewCustomer() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });
    const [loadingRoutes, setLoadingRoutes] = useState(true);
    const [routesError, setRoutesError] = useState("");
    const [routeOptions, setRouteOptions] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const selectedCountry = useMemo(() => findCountryByCode(form.country_code), [form.country_code]);
    const previewUrl = useMemo(
        () => (form.photo_file ? URL.createObjectURL(form.photo_file) : ""),
        [form.photo_file]
    );
    const normalizedPhonePreview = useMemo(
        () => buildInternationalPhoneNumber(form.phone, selectedCountry),
        [form.phone, selectedCountry]
    );

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    async function loadRoutes() {
        setLoadingRoutes(true);
        setRoutesError("");

        try {
            const items = await getRoutes();
            setRouteOptions(items);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                "Không tải được danh sách khu vực. Vui lòng thử lại.";
            setRoutesError(message);
        } finally {
            setLoadingRoutes(false);
        }
    }

    useEffect(() => {
        loadRoutes();
    }, []);

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setSubmitMessage({ type: "", text: "" });
    }

    function handleImageChange(event) {
        const file = event.target.files?.[0] || null;
        updateField("photo_file", file);
    }

    function resetForm() {
        setForm(initialForm);
        setErrors({});
        setSubmitAttempted(false);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitAttempted(true);

        const nextErrors = validateCustomerForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setSubmitMessage({
                type: "error",
                text: "Vui lòng kiểm tra lại dữ liệu trước khi tạo khách hàng.",
            });
            return;
        }

        setSubmitting(true);
        setSubmitMessage({ type: "", text: "" });

        try {
            await createCustomer(buildCustomerFormData(form));
            resetForm();
            setSubmitMessage({
                type: "success",
                text: "Tạo mới khách hàng thành công.",
            });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};

            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }

            setSubmitMessage({
                type: "error",
                text: data.message || "Không thể tạo khách hàng. Vui lòng thử lại.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    const hasErrors = submitAttempted && Object.keys(errors).some((key) => errors[key]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">
                        Customer create
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">Thêm mới khách hàng</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Tạo hồ sơ khách hàng mới, upload ảnh đại diện và kích hoạt tài khoản ngay
                        trong giao diện admin.
                    </p>
                </div>
                <Link
                    to="/admin/customers"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                    Xem danh sách khách hàng
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Họ</label>
                            <input
                                type="text"
                                value={form.firstname}
                                onChange={(event) => updateField("firstname", event.target.value)}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                placeholder="Nguyễn"
                                maxLength={64}
                            />
                            {errors.firstname ? (
                                <p className="mt-2 text-sm text-red-600">{errors.firstname}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Tên</label>
                            <input
                                type="text"
                                value={form.lastname}
                                onChange={(event) => updateField("lastname", event.target.value)}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                placeholder="Văn A"
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
                            <div className="space-y-2">
                                <select
                                    value={form.route_id}
                                    onChange={(event) => updateField("route_id", event.target.value)}
                                    disabled={loadingRoutes || routeOptions.length === 0}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {loadingRoutes ? "Đang tải khu vực..." : "Chọn khu vực"}
                                    </option>
                                    {routeOptions.map((route) => (
                                        <option key={route.id} value={route.id}>
                                            {route.r_title}
                                        </option>
                                    ))}
                                </select>

                                {routesError ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <div className="space-y-2">
                                                <p>{routesError}</p>
                                                <button
                                                    type="button"
                                                    onClick={loadRoutes}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    Thử lại
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            {errors.route_id ? (
                                <p className="mt-2 text-sm text-red-600">{errors.route_id}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Số điện thoại
                            </label>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
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
                            <p className="mt-2 text-xs text-slate-500">
                                Chọn quốc gia rồi nhập số thuê bao, không nhập lại mã {selectedCountry.dialCode}.
                                Hệ thống sẽ tự chuẩn hóa trước khi gửi lên server.
                            </p>
                            {normalizedPhonePreview ? (
                                <p className="mt-2 text-xs font-medium text-cyan-700">
                                    Số sẽ lưu: {normalizedPhonePreview}
                                </p>
                            ) : null}
                            {errors.country_code ? (
                                <p className="mt-2 text-sm text-red-600">{errors.country_code}</p>
                            ) : null}
                            {errors.phone ? (
                                <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(event) => updateField("email", event.target.value)}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                placeholder="customer@example.com"
                                maxLength={64}
                            />
                            {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(event) => updateField("password", event.target.value)}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                placeholder="Ít nhất 10 ký tự"
                                maxLength={128}
                            />
                            {errors.password ? (
                                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Mã kích hoạt
                            </label>
                            <input
                                type="text"
                                value={form.activation_pin}
                                onChange={(event) => updateField("activation_pin", event.target.value)}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                                placeholder="Để trống nếu chưa dùng"
                                maxLength={32}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Kích hoạt tài khoản
                            </label>
                            <label className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:self-start">
                                <input
                                    type="checkbox"
                                    checked={form.account_activation}
                                    onChange={(event) =>
                                        updateField("account_activation", event.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300"
                                />
                                Kích hoạt ngay khi tạo
                            </label>
                        </div>
                    </div>

                    {hasErrors ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            Vui lòng xử lý các lỗi trong biểu mẫu trước khi gửi.
                        </div>
                    ) : null}
                </section>

                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Ảnh đại diện
                        </label>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700">
                            <ImagePlus className="h-4 w-4" />
                            <span>Chọn ảnh</span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                        <p className="mt-2 text-xs text-slate-500">
                            Hỗ trợ jpeg, png, webp, gif. Tối đa 2MB. Ảnh là tùy chọn.
                        </p>
                        {errors.photo_file ? (
                            <p className="mt-2 text-sm text-red-600">{errors.photo_file}</p>
                        ) : null}
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Customer preview"
                                className="h-72 w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                                <ImagePlus className="h-8 w-8 text-slate-300" />
                                <p>Chưa có ảnh xem trước. Chọn ảnh để kiểm tra trước khi tạo khách hàng.</p>
                            </div>
                        )}
                    </div>

                    {submitMessage.text ? (
                        <div
                            className={`rounded-2xl px-4 py-3 text-sm ${
                                submitMessage.type === "success"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                {submitMessage.type === "success" ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                ) : (
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                )}
                                <span>{submitMessage.text}</span>
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={submitting || loadingRoutes}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? "Đang tạo khách hàng..." : "Tạo khách hàng"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setSubmitMessage({ type: "", text: "" });
                            }}
                            disabled={submitting}
                            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Reset form
                        </button>
                    </div>
                </section>
            </form>
        </div>
    );
}
