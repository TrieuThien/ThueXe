import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createVehicleOwner } from "../../services/vehicleOwnerService";
import {
    buildVehicleOwnerCreateInitialForm,
    buildVehicleOwnerPayload,
    mapApiValidationErrors,
    OWNER_VERIFICATION_OPTIONS,
    validateVehicleOwnerForm,
} from "./vehicleOwnerFormUtils";

function FieldError({ error }) {
    return error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null;
}

export default function NewVehicleOwner() {
    const [form, setForm] = useState(buildVehicleOwnerCreateInitialForm());
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setSubmitMessage({ type: "", text: "" });
    }

    function resetForm() {
        setForm(buildVehicleOwnerCreateInitialForm());
        setErrors({});
        setSubmitMessage({ type: "", text: "" });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateVehicleOwnerForm(form, { requirePassword: true });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setSubmitMessage({ type: "error", text: "Vui lòng kiểm tra lại thông tin chủ xe trước khi tạo mới." });
            return;
        }

        setSubmitting(true);
        setSubmitMessage({ type: "", text: "" });
        try {
            await createVehicleOwner(buildVehicleOwnerPayload(form, { includePassword: true }));
            resetForm();
            setSubmitMessage({ type: "success", text: "Tạo mới chủ xe thành công." });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};
            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }
            setSubmitMessage({ type: "error", text: data.message || "Không thể tạo chủ xe. Vui lòng thử lại." });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Vehicle owner create</p>
                    <h1 className="mt-2 text-3xl font-bold">Thêm mới chủ xe</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Tạo hồ sơ chủ xe mới với thông tin cá nhân, ngân hàng, xác minh và hoa hồng.</p>
                </div>
                <Link to="/admin/vehicle-owners" className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Xem danh sách chủ xe</Link>
            </div>

            <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Họ tên</label><input type="text" value={form.fullname} onChange={(event) => updateField("fullname", event.target.value)} maxLength={100} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.fullname} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại</label><input type="text" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} maxLength={20} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.phone} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Email</label><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} maxLength={64} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.email} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Địa chỉ</label><input type="text" value={form.address} onChange={(event) => updateField("address", event.target.value)} maxLength={255} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.address} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Ngân hàng</label><input type="text" value={form.bank_name} onChange={(event) => updateField("bank_name", event.target.value)} maxLength={100} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.bank_name} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Số tài khoản</label><input type="text" value={form.bank_account} onChange={(event) => updateField("bank_account", event.target.value)} maxLength={40} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.bank_account} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Bank code</label><input type="text" value={form.bank_code} onChange={(event) => updateField("bank_code", event.target.value)} maxLength={15} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.bank_code} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Swift code</label><input type="text" value={form.swift_code} onChange={(event) => updateField("swift_code", event.target.value)} maxLength={15} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.swift_code} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái xác minh</label><select value={form.verification_status} onChange={(event) => updateField("verification_status", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500">{OWNER_VERIFICATION_OPTIONS.filter((item) => item.value !== "").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><FieldError error={errors.verification_status} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Hoa hồng (%)</label><input type="number" min="0" max="100" step="0.1" value={form.commission_rate} onChange={(event) => updateField("commission_rate", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.commission_rate} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Account active</label><select value={form.account_active} onChange={(event) => updateField("account_active", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Đang hoạt động</option><option value="0">Đang khóa</option></select><FieldError error={errors.account_active} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Is activated</label><select value={form.is_activated} onChange={(event) => updateField("is_activated", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Đã kích hoạt</option><option value="0">Chưa kích hoạt</option></select><FieldError error={errors.is_activated} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Status</label><select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Active</option><option value="0">Inactive</option></select><FieldError error={errors.status} /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu (tùy chọn)</label><input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} maxLength={128} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500" /><FieldError error={errors.password} /></div>
                </div>

                {submitMessage.text ? (
                    <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${submitMessage.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        <div className="flex items-start gap-2">
                            {submitMessage.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                            <span>{submitMessage.text}</span>
                        </div>
                    </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {submitting ? "Đang tạo chủ xe..." : "Tạo chủ xe"}
                    </button>
                    <button type="button" onClick={resetForm} disabled={submitting} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                        Reset form
                    </button>
                </div>
            </form>
        </div>
    );
}

