import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw, ShieldX } from "lucide-react";
import { COUNTRIES, findCountryByCode } from "../../data/countries";
import {
    deleteDriverAccount,
    getDriverDetail,
    getDriverMeta,
    updateDriverAccountStatus,
    updateDriverPersonalInfo,
} from "../../services/driverService";
import {
    buildDriverEditForm,
    buildDriverFormData,
    buildInternationalPhoneNumber,
    DRIVER_COLOR_OPTIONS,
    mapApiValidationErrors,
    validateEditDriverForm,
} from "./driverFormUtils";
import { buildDriverDetailPath } from "./driverNavigation";

function FieldError({ error }) {
    return error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null;
}

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

export default function EditDriver() {
    const { driverId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [driver, setDriver] = useState(null);
    const [form, setForm] = useState(buildDriverEditForm(null));
    const [meta, setMeta] = useState({ routes: [], rides: [], vehicleYears: [], banks: [] });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });
    const [pageError, setPageError] = useState("");
    const [deleteModal, setDeleteModal] = useState({ open: false, password: "", loading: false, error: "" });

    const selectedCountry = useMemo(() => findCountryByCode(form.country_code), [form.country_code]);
    const normalizedPhonePreview = useMemo(() => buildInternationalPhoneNumber(form.phone, selectedCountry), [form.phone, selectedCountry]);
    const previewUrl = useMemo(() => form.photo_file ? URL.createObjectURL(form.photo_file) : driver?.photo_file || "", [form.photo_file, driver?.photo_file]);

    useEffect(() => {
        if (!form.photo_file || !previewUrl.startsWith("blob:")) return undefined;
        return () => URL.revokeObjectURL(previewUrl);
    }, [form.photo_file, previewUrl]);

    async function loadPage() {
        setLoading(true);
        setPageError("");
        try {
            const [detailData, metaData] = await Promise.all([getDriverDetail(driverId), getDriverMeta()]);
            const currentDriver = detailData?.driver || null;
            setDriver(currentDriver);
            setForm(buildDriverEditForm(currentDriver));
            setMeta({
                routes: metaData.routes || [],
                rides: metaData.rides || [],
                vehicleYears: metaData.vehicleYears || [],
                banks: metaData.banks || [],
            });
        } catch (error) {
            setPageError(error?.response?.data?.message || "Không tải được thông tin tài xế để chỉnh sửa.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPage();
    }, [driverId]);

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setMessage({ type: "", text: "" });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateEditDriverForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setMessage({ type: "error", text: "Vui lòng kiểm tra lại thông tin trước khi cập nhật." });
            return;
        }

        setSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            const response = await updateDriverPersonalInfo(driverId, buildDriverFormData(form));
            const updatedDriver = response?.driver || null;
            setDriver(updatedDriver);
            setForm(buildDriverEditForm(updatedDriver));
            setMessage({ type: "success", text: "Đã cập nhật thông tin tài xế." });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};
            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }
            setMessage({ type: "error", text: data.message || "Không thể cập nhật tài xế." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleQuickLockToggle() {
        if (!driver) return;

        try {
            await updateDriverAccountStatus(driver.driver_id, {
                driver_id: driver.driver_id,
                account_active: Number(driver.account_active) === 1 ? 0 : 1,
            });
            await loadPage();
            setMessage({ type: "success", text: "Đã cập nhật trạng thái tài khoản." });
        } catch (error) {
            setMessage({ type: "error", text: error?.response?.data?.message || "Không thể cập nhật trạng thái tài khoản." });
        }
    }

    async function handleSoftDelete() {
        setDeleteModal((prev) => ({ ...prev, loading: true, error: "" }));
        try {
            await deleteDriverAccount(driverId, { admin_password: deleteModal.password });
            setDeleteModal({ open: false, password: "", loading: false, error: "" });
            await loadPage();
            setMessage({ type: "success", text: "Đã xóa mềm tài khoản tài xế." });
        } catch (error) {
            setDeleteModal((prev) => ({
                ...prev,
                loading: false,
                error: error?.response?.data?.message || "Không thể xóa mềm tài khoản tài xế.",
            }));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Driver edit</p>
                    <h1 className="mt-2 text-3xl font-bold">Sửa thông tin tài xế</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Cập nhật hồ sơ cá nhân, xe, ngân hàng, hoa hồng và trạng thái tài khoản tài xế.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link to={buildDriverDetailPath(role, driverId)} className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Xem chi tiết</Link>
                    <button type="button" onClick={loadPage} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"><RefreshCw className="h-4 w-4" />Tải lại</button>
                </div>
            </div>

            {pageError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{pageError}</span></div></div> : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Đang tải hồ sơ tài xế...</div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Họ</label><input type="text" value={form.firstname} onChange={(event) => updateField("firstname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={64} /><FieldError error={errors.firstname} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Tên</label><input type="text" value={form.lastname} onChange={(event) => updateField("lastname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={64} /><FieldError error={errors.lastname} /></div>
                        </div>

                        <div><label className="mb-2 block text-sm font-semibold text-slate-700">Địa chỉ</label><input type="text" value={form.drv_address} onChange={(event) => updateField("drv_address", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={255} /><FieldError error={errors.drv_address} /></div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Thành phố hoạt động</label><select value={form.reg_route_id} onChange={(event) => updateField("reg_route_id", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="">Chọn thành phố</option>{meta.routes.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}</select><FieldError error={errors.reg_route_id} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Quốc gia</label><select value={form.country_code} onChange={(event) => updateField("country_code", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500">{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name} ({country.dialCode})</option>)}</select><FieldError error={errors.country_code} /></div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại</label><input type="text" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder={selectedCountry.phonePlaceholder} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><p className="mt-2 text-xs font-medium text-cyan-700">Số sẽ lưu: {normalizedPhonePreview || "--"}</p><FieldError error={errors.phone} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Email</label><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={64} /><FieldError error={errors.email} /></div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Biển số xe</label><input type="text" value={form.car_plate_num} onChange={(event) => updateField("car_plate_num", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={20} /><FieldError error={errors.car_plate_num} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Dòng xe</label><input type="text" value={form.car_model} onChange={(event) => updateField("car_model", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={64} /><FieldError error={errors.car_model} /></div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Loại xe</label><select value={form.ride_id} onChange={(event) => updateField("ride_id", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="">Chọn loại xe</option>{meta.rides.map((ride) => <option key={ride.id} value={ride.id}>{ride.ride_type}</option>)}</select><FieldError error={errors.ride_id} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Năm xe</label><select value={form.car_year} onChange={(event) => updateField("car_year", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="">Chọn năm xe</option>{meta.vehicleYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><FieldError error={errors.car_year} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Màu xe</label><select value={form.car_color} onChange={(event) => updateField("car_color", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="">Chọn màu xe</option>{DRIVER_COLOR_OPTIONS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select><FieldError error={errors.car_color} /></div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Tên chủ tài khoản</label><input type="text" value={form.bank_acc_holder_name} onChange={(event) => updateField("bank_acc_holder_name", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={100} /><FieldError error={errors.bank_acc_holder_name} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Số tài khoản</label><input type="text" value={form.bank_acc_num} onChange={(event) => updateField("bank_acc_num", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={40} /><FieldError error={errors.bank_acc_num} /></div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Ngân hàng</label><select value={form.bank_name} onChange={(event) => updateField("bank_name", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="">Chọn ngân hàng</option>{meta.banks.map((bank) => <option key={bank.value} value={bank.value}>{bank.label}</option>)}</select><FieldError error={errors.bank_name} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Bank code / swift</label><div className="grid gap-4 sm:grid-cols-2"><input type="text" value={form.bank_code} onChange={(event) => updateField("bank_code", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" placeholder="Bank code" maxLength={15} /><input type="text" value={form.bank_swift_code} onChange={(event) => updateField("bank_swift_code", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" placeholder="Swift code" maxLength={15} /></div><FieldError error={errors.bank_code || errors.bank_swift_code} /></div>
                        </div>

                        {form.bank_name === "other" ? <div><label className="mb-2 block text-sm font-semibold text-slate-700">Tên ngân hàng khác</label><input type="text" value={form.bank_name_custom} onChange={(event) => updateField("bank_name_custom", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={100} /><FieldError error={errors.bank_name_custom} /></div> : null}

                        <div className="grid gap-4 sm:grid-cols-4">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Hoa hồng (%)</label><input type="number" min="0" max="100" step="0.1" value={form.driver_commision} onChange={(event) => updateField("driver_commision", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.driver_commision} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Account status</label><select value={form.account_active} onChange={(event) => updateField("account_active", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Đang hoạt động</option><option value="0">Đang khóa</option></select><FieldError error={errors.account_active} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Activation</label><select value={form.is_activated} onChange={(event) => updateField("is_activated", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Đã kích hoạt</option><option value="0">Chưa kích hoạt</option></select><FieldError error={errors.is_activated} /></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Online</label><select value={form.available} onChange={(event) => updateField("available", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Online</option><option value="0">Offline</option></select><FieldError error={errors.available} /></div>
                        </div>
                    </section>

                    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh đại diện</label>
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700">
                                <ImagePlus className="h-4 w-4" />
                                <span>Chọn ảnh mới</span>
                                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => updateField("photo_file", event.target.files?.[0] || null)} className="hidden" />
                            </label>
                            <FieldError error={errors.photo_file} />
                        </div>

                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">{previewUrl ? <img src={previewUrl} alt={driver?.full_name || "Driver preview"} className="h-72 w-full object-cover" /> : <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500"><ImagePlus className="h-8 w-8 text-slate-300" /><p>Tài xế này chưa có ảnh đại diện.</p></div>}</div>

                        {message.text ? <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}><div className="flex items-start gap-2">{message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{message.text}</span></div></div> : null}

                        <div className="flex flex-wrap gap-3">
                            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{submitting ? "Đang cập nhật..." : "Cập nhật thông tin"}</button>
                            <button type="button" onClick={handleQuickLockToggle} className="rounded-2xl border border-amber-200 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">{Number(driver?.account_active) === 1 ? "Khóa tài khoản" : "Mở khóa"}</button>
                            <button type="button" onClick={() => setDeleteModal({ open: true, password: "", loading: false, error: "" })} className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">Xóa mềm tài khoản</button>
                            <Link to={buildDriverDetailPath(role, driverId)} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">Hủy</Link>
                        </div>
                    </section>
                </form>
            )}

            {deleteModal.open ? (
                <ModalShell title={`Xóa mềm tài xế #${driverId}`} onClose={() => setDeleteModal({ open: false, password: "", loading: false, error: "" })}>
                    <p className="text-sm text-slate-600">Nhập mật khẩu admin hiện tại để xác nhận xóa mềm tài khoản.</p>
                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu admin</label>
                        <input type="password" value={deleteModal.password} onChange={(event) => setDeleteModal((prev) => ({ ...prev, password: event.target.value, error: "" }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500" />
                    </div>
                    {deleteModal.error ? <p className="mt-3 text-sm text-red-600">{deleteModal.error}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={handleSoftDelete} disabled={deleteModal.loading || !deleteModal.password.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">{deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}Xác nhận xóa mềm</button>
                    </div>
                </ModalShell>
            ) : null}
        </div>
    );
}
