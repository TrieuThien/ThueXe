import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw, ShieldX } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, findCountryByCode } from "../../data/countries";
import {
    deleteStaffAccount,
    getRoutes,
    getStaffDetail,
    updateStaffPersonalInfo,
} from "../../services/staffService";
import {
    buildInternationalPhoneNumber,
    buildStaffFormData,
    mapApiValidationErrors,
    normalizeNationalPhoneNumber,
    STAFF_ROLES,
    validateAdminPasswordConfirm,
    validateStaffForm,
} from "./staffFormUtils";
import { buildStaffDetailPath } from "./staffNavigation";

const initialForm = {
    firstname: "",
    lastname: "",
    route_id: "",
    account_active: "1",
    role: "dispatcher",
    country_code: DEFAULT_COUNTRY_CODE,
    phone: "",
    email: "",
    address: "",
    photo_file: null,
};

function ModalShell({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đóng</button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}

export default function EditStaff() {
    const { userId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [form, setForm] = useState(initialForm);
    const [staff, setStaff] = useState(null);
    const [routeOptions, setRouteOptions] = useState([]);
    const [routesLoading, setRoutesLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });
    const [pageError, setPageError] = useState("");
    const [deleteModal, setDeleteModal] = useState({ open: false, password: "", loading: false, error: "" });

    const selectedCountry = useMemo(() => findCountryByCode(form.country_code), [form.country_code]);
    const previewUrl = useMemo(() => {
        if (form.photo_file) {
            return URL.createObjectURL(form.photo_file);
        }

        return staff?.photo_file || "";
    }, [form.photo_file, staff?.photo_file]);
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
            const [detailData, routesData] = await Promise.all([getStaffDetail(userId), getRoutes()]);
            const nextStaff = detailData?.staff || null;
            const nextCountry = findCountryByCode(nextStaff?.country_code || DEFAULT_COUNTRY_CODE);

            setStaff(nextStaff);
            setRouteOptions(routesData);
            setForm({
                firstname: nextStaff?.firstname || "",
                lastname: nextStaff?.lastname || "",
                route_id: nextStaff?.route_id ? String(nextStaff.route_id) : "",
                account_active: String(Number(nextStaff?.account_active) === 1 ? 1 : 0),
                role: nextStaff?.role || "dispatcher",
                country_code: nextCountry.code,
                phone: normalizeNationalPhoneNumber(nextStaff?.phone, nextCountry),
                email: nextStaff?.email || "",
                address: nextStaff?.address || "",
                photo_file: null,
            });
        } catch (error) {
            setPageError(error?.response?.data?.message || "Khong tai duoc thong tin nhan vien.");
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

        const nextErrors = validateStaffForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setMessage({ type: "error", text: "Vui lòng kiểm tra lại thông tin trước khi cập nhật." });
            return;
        }

        setSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            const response = await updateStaffPersonalInfo(userId, buildStaffFormData(form));
            const updatedStaff = response?.staff || null;
            const updatedCountry = findCountryByCode(updatedStaff?.country_code || form.country_code || DEFAULT_COUNTRY_CODE);

            setStaff(updatedStaff);
            setForm((prev) => ({
                ...prev,
                firstname: updatedStaff?.firstname || prev.firstname,
                lastname: updatedStaff?.lastname || prev.lastname,
                route_id: updatedStaff?.route_id ? String(updatedStaff.route_id) : "",
                account_active: String(Number(updatedStaff?.account_active) === 1 ? 1 : 0),
                role: updatedStaff?.role || prev.role,
                country_code: updatedCountry.code,
                phone: normalizeNationalPhoneNumber(updatedStaff?.phone, updatedCountry),
                email: updatedStaff?.email || prev.email,
                address: updatedStaff?.address || "",
                photo_file: null,
            }));
            setMessage({ type: "success", text: "Đã cập nhật thông tin nhân viên." });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};

            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }

            setMessage({ type: "error", text: data.message || "Không thể cập nhật thông tin nhân viên." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSoftDelete() {
        const passwordError = validateAdminPasswordConfirm(deleteModal.password);
        if (passwordError) {
            setDeleteModal((prev) => ({ ...prev, error: passwordError }));
            return;
        }

        setDeleteModal((prev) => ({ ...prev, loading: true, error: "" }));
        try {
            await deleteStaffAccount(userId, { admin_password: deleteModal.password });
            setDeleteModal({ open: false, password: "", loading: false, error: "" });
            setMessage({ type: "success", text: "Đã xóa mềm tài khoản nhân viên." });
            await loadPage();
        } catch (error) {
            setDeleteModal((prev) => ({
                ...prev,
                loading: false,
                error: error?.response?.data?.message || "Không thể xóa mềm tài khoản nhân viên.",
            }));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Staff edit</p>
                    <h1 className="mt-2 text-3xl font-bold">Sửa thông tin nhân viên</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Cập nhật thông tin nhân viên.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link to={buildStaffDetailPath(role, userId)} className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Xem chi tiết</Link>
                    <button type="button" onClick={loadPage} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"><RefreshCw className="h-4 w-4" />Tải lại</button>
                </div>
            </div>

            {pageError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{pageError}</span></div></div> : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm"><div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /><span>Đang tải hồ sơ nhân viên...</span></div></div>
            ) : (
                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Ho</label>
                                <input type="text" value={form.firstname} onChange={(event) => updateField("firstname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={64} />
                                {errors.firstname ? <p className="mt-2 text-sm text-red-600">{errors.firstname}</p> : null}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Ten</label>
                                <input type="text" value={form.lastname} onChange={(event) => updateField("lastname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={64} />
                                {errors.lastname ? <p className="mt-2 text-sm text-red-600">{errors.lastname}</p> : null}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Vai tro</label>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {STAFF_ROLES.map((item) => (
                                    <label key={item.value} className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${form.role === item.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                                        <input type="radio" className="sr-only" name="role" value={item.value} checked={form.role === item.value} onChange={(event) => updateField("role", event.target.value)} />
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                            {errors.role ? <p className="mt-2 text-sm text-red-600">{errors.role}</p> : null}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Thành phố hoạt động</label>
                                <select value={form.route_id} onChange={(event) => updateField("route_id", event.target.value)} disabled={routesLoading} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100">
                                    <option value="">{routesLoading ? "Đang tải route..." : "Chọn thành phố"}</option>
                                    {routeOptions.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}
                                </select>
                                {errors.route_id ? <p className="mt-2 text-sm text-red-600">{errors.route_id}</p> : null}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái tài khoản</label>
                                <select value={form.account_active} onChange={(event) => updateField("account_active", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                    <option value="1">Đang hoạt động</option>
                                    <option value="0">Đang khóa</option>
                                </select>
                                {errors.account_active ? <p className="mt-2 text-sm text-red-600">{errors.account_active}</p> : null}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Địa chỉ</label>
                            <input type="text" value={form.address} onChange={(event) => updateField("address", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={255} />
                            {errors.address ? <p className="mt-2 text-sm text-red-600">{errors.address}</p> : null}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                                <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
                                    <select value={form.country_code} onChange={(event) => updateField("country_code", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                        {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name} ({country.dialCode})</option>)}
                                    </select>
                                    <input type="text" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" inputMode="tel" maxLength={20} />
                                </div>
                                {normalizedPhonePreview ? <p className="mt-2 text-xs font-medium text-indigo-700">Số để lưu: {normalizedPhonePreview}</p> : null}
                                {errors.phone ? <p className="mt-2 text-sm text-red-600">{errors.phone}</p> : null}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                                <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" maxLength={64} />
                                {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh đại diện</label>
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-700">
                                <ImagePlus className="h-4 w-4" />
                                <span>Chọn ảnh mới</span>
                                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => updateField("photo_file", event.target.files?.[0] || null)} className="hidden" />
                            </label>
                            {errors.photo_file ? <p className="mt-2 text-sm text-red-600">{errors.photo_file}</p> : null}
                        </div>

                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                            {previewUrl ? <img src={previewUrl} alt={staff?.full_name || "Staff preview"} className="h-72 w-full object-cover" /> : <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500"><ImagePlus className="h-8 w-8 text-slate-300" /><p>Nhân viên này chưa có ảnh đại diện.</p></div>}
                        </div>

                        {message.text ? (
                            <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                <div className="flex items-start gap-2">
                                    {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                                    <span>{message.text}</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {submitting ? "Đang cập nhật..." : "Cập nhật thông tin"}
                            </button>
                            <button type="button" onClick={() => setDeleteModal({ open: true, password: "", loading: false, error: "" })} className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">Xóa mềm tài khoản</button>
                            <Link to={buildStaffDetailPath(role, userId)} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">Hủy</Link>
                        </div>
                    </section>
                </form>
            )}

            {deleteModal.open ? (
                <ModalShell title={`Xóa mềm nhân viên #${userId}`} onClose={() => setDeleteModal({ open: false, password: "", loading: false, error: "" })}>
                    <p className="text-sm text-slate-600">Nhập mật khẩu admin để xác nhận xóa mềm tài khoản.</p>
                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu admin</label>
                        <input type="password" value={deleteModal.password} onChange={(event) => setDeleteModal((prev) => ({ ...prev, password: event.target.value, error: "" }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500" />
                    </div>
                    {deleteModal.error ? <p className="mt-3 text-sm text-red-600">{deleteModal.error}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={handleSoftDelete} disabled={deleteModal.loading || !deleteModal.password.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                            {deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                            Xác nhận xóa mềm
                        </button>
                    </div>
                </ModalShell>
            ) : null}
        </div>
    );
}
