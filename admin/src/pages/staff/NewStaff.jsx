import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, findCountryByCode } from "../../data/countries";
import { createStaff, getRoutes } from "../../services/staffService";
import {
    buildInternationalPhoneNumber,
    buildStaffFormData,
    mapApiValidationErrors,
    STAFF_ROLES,
    validateStaffForm,
} from "./staffFormUtils";

const initialForm = {
    firstname: "",
    lastname: "",
    route_id: "",
    country_code: DEFAULT_COUNTRY_CODE,
    phone: "",
    email: "",
    password: "",
    role: "biller",
    account_active: "1",
    address: "",
    photo_file: null,
};

export default function NewStaff() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });
    const [loadingRoutes, setLoadingRoutes] = useState(true);
    const [routesError, setRoutesError] = useState("");
    const [routeOptions, setRouteOptions] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const selectedCountry = useMemo(() => findCountryByCode(form.country_code), [form.country_code]);
    const previewUrl = useMemo(() => (form.photo_file ? URL.createObjectURL(form.photo_file) : ""), [form.photo_file]);
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
            setRoutesError(error?.response?.data?.message || "Khong the tai danh sach route.");
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

    function resetForm() {
        setForm(initialForm);
        setErrors({});
        setSubmitAttempted(false);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitAttempted(true);

        const nextErrors = validateStaffForm(form, { requirePassword: true });
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setSubmitMessage({ type: "error", text: "Vui long kiem tra lai du lieu truoc khi tao nhan vien." });
            return;
        }

        setSubmitting(true);
        setSubmitMessage({ type: "", text: "" });

        try {
            await createStaff(buildStaffFormData(form, { includePassword: true }));
            resetForm();
            setSubmitMessage({ type: "success", text: "Tao nhan vien thanh cong." });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};

            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }

            setSubmitMessage({ type: "error", text: data.message || "Khong the tao nhan vien." });
        } finally {
            setSubmitting(false);
        }
    }

    const hasErrors = submitAttempted && Object.keys(errors).some((key) => errors[key]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Staff create</p>
                    <h1 className="mt-2 text-3xl font-bold">Thêm mới nhân viên</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Tạo tài khoản nhân viên với role biller, dispatcher hoặc admin.</p>
                </div>
                <Link to="/admin/staff" className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                    Xem danh sách nhân viên
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Họ</label>
                            <input type="text" value={form.firstname} onChange={(event) => updateField("firstname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={64} />
                            {errors.firstname ? <p className="mt-2 text-sm text-red-600">{errors.firstname}</p> : null}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Tên</label>
                            <input type="text" value={form.lastname} onChange={(event) => updateField("lastname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={64} />
                            {errors.lastname ? <p className="mt-2 text-sm text-red-600">{errors.lastname}</p> : null}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Vai trò</label>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {STAFF_ROLES.map((role) => (
                                <label key={role.value} className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${form.role === role.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                                    <input type="radio" name="role" value={role.value} checked={form.role === role.value} onChange={(event) => updateField("role", event.target.value)} className="sr-only" />
                                    {role.label}
                                </label>
                            ))}
                        </div>
                        {errors.role ? <p className="mt-2 text-sm text-red-600">{errors.role}</p> : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Khu vực phụ trách</label>
                            <select value={form.route_id} onChange={(event) => updateField("route_id", event.target.value)} disabled={loadingRoutes || routeOptions.length === 0} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100">
                                <option value="">{loadingRoutes ? "Đang tải..." : "Chọn khu vực"}</option>
                                {routeOptions.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}
                            </select>
                            {routesError ? <p className="mt-2 text-sm text-red-600">{routesError}</p> : null}
                            {errors.route_id ? <p className="mt-2 text-sm text-red-600">{errors.route_id}</p> : null}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Địa chỉ</label>
                            <input type="text" value={form.address} onChange={(event) => updateField("address", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={255} />
                            {errors.address ? <p className="mt-2 text-sm text-red-600">{errors.address}</p> : null}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                            <div className="grid gap-3 xl:grid-cols-2">
                                <select value={form.country_code} onChange={(event) => updateField("country_code", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                    {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name} ({country.dialCode})</option>)}
                                </select>
                                <input type="text" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" inputMode="tel" maxLength={20} />
                            </div>
                            {normalizedPhonePreview ? <p className="mt-2 text-xs font-medium text-indigo-700">Số điện thoại lưu: {normalizedPhonePreview}</p> : null}
                            {errors.phone ? <p className="mt-2 text-sm text-red-600">{errors.phone}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={64} />
                            {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                        <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={128} />
                        {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password}</p> : null}
                    </div>

                    {hasErrors ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Vui lòng xử lý các lỗi trong biểu mẫu trước khi gửi.</div> : null}
                </section>

                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh đại diện</label>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-700">
                            <ImagePlus className="h-4 w-4" />
                            <span>Chọn ảnh</span>
                            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => updateField("photo_file", event.target.files?.[0] || null)} className="hidden" />
                        </label>
                        {errors.photo_file ? <p className="mt-2 text-sm text-red-600">{errors.photo_file}</p> : null}
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                        {previewUrl ? <img src={previewUrl} alt="Staff preview" className="h-72 w-full object-cover" /> : <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500"><ImagePlus className="h-8 w-8 text-slate-300" /><p>Chưa có ảnh xem trước.</p></div>}
                    </div>

                    {submitMessage.text ? (
                        <div className={`rounded-2xl px-4 py-3 text-sm ${submitMessage.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            <div className="flex items-start gap-2">
                                {submitMessage.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                                <span>{submitMessage.text}</span>
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={submitting || loadingRoutes} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? "Đang tạo..." : "Tạo nhân viên"}
                        </button>
                        <button type="button" onClick={() => { resetForm(); setSubmitMessage({ type: "", text: "" }); }} disabled={submitting} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
                            Reset biểu mẫu
                        </button>
                        <button type="button" onClick={loadRoutes} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
                            <RefreshCw className="h-4 w-4" /> Tải thêm khu vực
                        </button>
                    </div>
                </section>
            </form>
        </div>
    );
}
