import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { COUNTRIES, findCountryByCode } from "../../data/countries";
import { createDriver, getDriverMeta } from "../../services/driverService";
import {
    buildDriverCreateInitialForm,
    buildDriverFormData,
    buildInternationalPhoneNumber,
    DRIVER_COLOR_OPTIONS,
    mapApiValidationErrors,
    validateNewDriverForm,
} from "./driverFormUtils";

function SectionTitle({ eyebrow, title, description }) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">{eyebrow}</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
    );
}

function FieldError({ error }) {
    return error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null;
}

export default function NewDriver() {
    const [form, setForm] = useState(buildDriverCreateInitialForm());
    const [errors, setErrors] = useState({});
    const [meta, setMeta] = useState({ routes: [], rides: [], vehicleYears: [], banks: [] });
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [metaError, setMetaError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

    const selectedCountry = useMemo(() => findCountryByCode(form.country_code), [form.country_code]);
    const normalizedPhonePreview = useMemo(
        () => buildInternationalPhoneNumber(form.phone, selectedCountry),
        [form.phone, selectedCountry]
    );
    const previewUrl = useMemo(
        () => (form.photo_file ? URL.createObjectURL(form.photo_file) : ""),
        [form.photo_file]
    );

    useEffect(() => {
        if (!previewUrl) {
            return undefined;
        }

        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    async function loadMeta() {
        setLoadingMeta(true);
        setMetaError("");

        try {
            const payload = await getDriverMeta();
            setMeta({
                routes: payload.routes || [],
                rides: payload.rides || [],
                vehicleYears: payload.vehicleYears || [],
                banks: payload.banks || [],
            });
        } catch (error) {
            setMetaError(
                error?.response?.data?.message ||
                    "Không tải được dữ liệu hỗ trợ tạo tài xế. Vui lòng thử lại."
            );
        } finally {
            setLoadingMeta(false);
        }
    }

    useEffect(() => {
        loadMeta();
    }, []);

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setSubmitMessage({ type: "", text: "" });
    }

    function resetForm() {
        setForm(buildDriverCreateInitialForm());
        setErrors({});
        setSubmitMessage({ type: "", text: "" });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = validateNewDriverForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setSubmitMessage({
                type: "error",
                text: "Vui lòng kiểm tra lại thông tin tài xế trước khi tạo mới.",
            });
            return;
        }

        setSubmitting(true);
        setSubmitMessage({ type: "", text: "" });

        try {
            await createDriver(
                buildDriverFormData(form, {
                    includePassword: true,
                    includeActivationPin: true,
                })
            );

            resetForm();
            setSubmitMessage({
                type: "success",
                text: "Tạo mới tài xế thành công.",
            });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};

            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }

            setSubmitMessage({
                type: "error",
                text: data.message || "Không thể tạo tài xế. Vui lòng thử lại.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Driver create</p>
                    <h1 className="mt-2 text-3xl font-bold">Thêm mới tài xế</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Tạo hồ sơ tài xế mới với ảnh đại diện, thông tin xe, ngân hàng và tỷ lệ
                        hoa hồng theo đúng luồng quản trị hiện tại.
                    </p>
                </div>
                <Link
                    to="/admin/drivers"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                    Xem danh sách tài xế
                </Link>
            </div>

            {metaError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-2">
                            <p>{metaError}</p>
                            <button
                                type="button"
                                onClick={loadMeta}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <SectionTitle
                            eyebrow="Thông tin tài xế"
                            title="Hồ sơ cá nhân"
                            description="Ảnh đại diện, liên hệ, thành phố hoạt động, mã kích hoạt tùy chọn và mật khẩu."
                        />

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Họ</label>
                                <input type="text" value={form.firstname} onChange={(event) => updateField("firstname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={64} />
                                <FieldError error={errors.firstname} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tên</label>
                                <input type="text" value={form.lastname} onChange={(event) => updateField("lastname", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={64} />
                                <FieldError error={errors.lastname} />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Địa chỉ</label>
                            <input type="text" value={form.drv_address} onChange={(event) => updateField("drv_address", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" maxLength={255} />
                            <FieldError error={errors.drv_address} />
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Thành phố hoạt động</label>
                                <select value={form.reg_route_id} onChange={(event) => updateField("reg_route_id", event.target.value)} disabled={loadingMeta} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 disabled:bg-slate-100">
                                    <option value="">{loadingMeta ? "Đang tải..." : "Chọn thành phố"}</option>
                                    {meta.routes.map((route) => (
                                        <option key={route.id} value={route.id}>{route.r_title}</option>
                                    ))}
                                </select>
                                <FieldError error={errors.reg_route_id} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Quốc gia</label>
                                <select value={form.country_code} onChange={(event) => updateField("country_code", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500">
                                    {COUNTRIES.map((country) => (
                                        <option key={country.code} value={country.code}>{country.flag} {country.name} ({country.dialCode})</option>
                                    ))}
                                </select>
                                <FieldError error={errors.country_code} />
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                                <input type="text" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder={selectedCountry.phonePlaceholder} inputMode="tel" maxLength={20} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <p className="mt-2 text-xs font-medium text-cyan-700">Số sẽ lưu: {normalizedPhonePreview || "--"}</p>
                                <FieldError error={errors.phone} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                                <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} maxLength={64} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.email} />
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Mã kích hoạt</label>
                                <input type="text" value={form.activation_pin} onChange={(event) => updateField("activation_pin", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <p className="mt-2 text-xs text-slate-500">Có thể để trống, chỉ nhập khi cần kích hoạt thủ công.</p>
                                <FieldError error={errors.activation_pin} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                                <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} maxLength={128} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <p className="mt-2 text-xs text-slate-500">Tối thiểu 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
                                <FieldError error={errors.password} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <SectionTitle eyebrow="Thông tin xe" title="Phương tiện hoạt động" description="Biển số, dòng xe, loại xe, năm sản xuất và màu xe." />
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Biển số xe</label>
                                <input type="text" value={form.car_plate_num} onChange={(event) => updateField("car_plate_num", event.target.value)} maxLength={20} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.car_plate_num} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Số đăng ký xe</label>
                                <input type="text" value={form.car_reg_num} onChange={(event) => updateField("car_reg_num", event.target.value)} maxLength={30} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.car_reg_num} />
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Dòng xe</label>
                                <input type="text" value={form.car_model} onChange={(event) => updateField("car_model", event.target.value)} maxLength={64} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.car_model} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Loại xe</label>
                                <select value={form.ride_id} onChange={(event) => updateField("ride_id", event.target.value)} disabled={loadingMeta} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 disabled:bg-slate-100">
                                    <option value="">{loadingMeta ? "Đang tải..." : "Chọn loại xe"}</option>
                                    {meta.rides.map((ride) => (
                                        <option key={ride.id} value={ride.id}>{ride.ride_type}</option>
                                    ))}
                                </select>
                                <FieldError error={errors.ride_id} />
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Năm xe</label>
                                <select value={form.car_year} onChange={(event) => updateField("car_year", event.target.value)} disabled={loadingMeta} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 disabled:bg-slate-100">
                                    <option value="">Chọn năm xe</option>
                                    {meta.vehicleYears.map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <FieldError error={errors.car_year} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Màu xe</label>
                                <select value={form.car_color} onChange={(event) => updateField("car_color", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500">
                                    <option value="">Chọn màu xe</option>
                                    {DRIVER_COLOR_OPTIONS.map((color) => (
                                        <option key={color.value} value={color.value}>{color.label}</option>
                                    ))}
                                </select>
                                <FieldError error={errors.car_color} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <SectionTitle eyebrow="Thông tin ngân hàng" title="Tài khoản nhận thanh toán" description="Chọn ngân hàng Việt Nam hoặc nhập thủ công khi không có trong danh sách." />
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tên chủ tài khoản</label>
                                <input type="text" value={form.bank_acc_holder_name} onChange={(event) => updateField("bank_acc_holder_name", event.target.value)} maxLength={100} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.bank_acc_holder_name} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Số tài khoản</label>
                                <input type="text" value={form.bank_acc_num} onChange={(event) => updateField("bank_acc_num", event.target.value)} maxLength={40} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.bank_acc_num} />
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Ngân hàng</label>
                                <select value={form.bank_name} onChange={(event) => updateField("bank_name", event.target.value)} disabled={loadingMeta} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 disabled:bg-slate-100">
                                    <option value="">Chọn ngân hàng</option>
                                    {meta.banks.map((bank) => (
                                        <option key={bank.value} value={bank.value}>{bank.label}</option>
                                    ))}
                                </select>
                                <FieldError error={errors.bank_name} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Swift code</label>
                                <input type="text" value={form.bank_swift_code} onChange={(event) => updateField("bank_swift_code", event.target.value)} maxLength={15} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                <FieldError error={errors.bank_swift_code} />
                            </div>
                        </div>

                        {form.bank_name === "other" ? (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Tên ngân hàng khác</label>
                                    <input type="text" value={form.bank_name_custom} onChange={(event) => updateField("bank_name_custom", event.target.value)} maxLength={100} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                    <FieldError error={errors.bank_name_custom} />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Mã ngân hàng</label>
                                    <input type="text" value={form.bank_code} onChange={(event) => updateField("bank_code", event.target.value)} maxLength={15} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" />
                                    <FieldError error={errors.bank_code} />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <SectionTitle eyebrow="Tỷ lệ hoa hồng" title="Cấu hình commission" description="Thiết lập tỷ lệ phần trăm áp dụng cho mỗi chuyến thành công." />
                        <div className="mt-5 max-w-xs">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Driver commision</label>
                            <div className="relative">
                                <input type="number" min="0" max="100" step="0.1" value={form.driver_commision} onChange={(event) => updateField("driver_commision", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-cyan-500" />
                                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">%</span>
                            </div>
                            <FieldError error={errors.driver_commision} />
                        </div>
                    </div>
                </section>

                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh đại diện</label>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700">
                            <ImagePlus className="h-4 w-4" />
                            <span>Chọn ảnh</span>
                            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => updateField("photo_file", event.target.files?.[0] || null)} className="hidden" />
                        </label>
                        <p className="mt-2 text-xs text-slate-500">Hỗ trợ jpeg, png, webp, gif. Dung lượng tối đa 2MB.</p>
                        <FieldError error={errors.photo_file} />
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Driver preview" className="h-72 w-full object-cover" />
                        ) : (
                            <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                                <ImagePlus className="h-8 w-8 text-slate-300" />
                                <p>Chưa có ảnh xem trước. Ảnh đại diện là bắt buộc khi tạo tài xế.</p>
                            </div>
                        )}
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
                        <button type="submit" disabled={submitting || loadingMeta} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? "Đang tạo tài xế..." : "Tạo tài xế"}
                        </button>
                        <button type="button" onClick={resetForm} disabled={submitting} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60">
                            Reset form
                        </button>
                    </div>
                </section>
            </form>
        </div>
    );
}
