import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, ShieldX } from "lucide-react";
import { deleteVehicleOwnerAccount, getVehicleOwnerDetail, updateVehicleOwnerAccountStatus, updateVehicleOwnerPersonalInfo } from "../../services/vehicleOwnerService";
import { buildVehicleOwnerDetailPath } from "./vehicleOwnerNavigation";
import { buildVehicleOwnerEditForm, buildVehicleOwnerPayload, mapApiValidationErrors, OWNER_VERIFICATION_OPTIONS, validateVehicleOwnerForm } from "./vehicleOwnerFormUtils";

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

export default function EditVehicleOwner() {
    const { ownerId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [owner, setOwner] = useState(null);
    const [form, setForm] = useState(buildVehicleOwnerEditForm(null));
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });
    const [pageError, setPageError] = useState("");
    const [deleteModal, setDeleteModal] = useState({ open: false, loading: false, error: "" });

    async function loadPage() {
        setLoading(true);
        setPageError("");
        try {
            const data = await getVehicleOwnerDetail(ownerId);
            setOwner(data?.owner || null);
            setForm(buildVehicleOwnerEditForm(data?.owner || null));
        } catch (error) {
            setPageError(error?.response?.data?.message || "Không tải được thông tin chủ xe.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPage();
    }, [ownerId]);

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setMessage({ type: "", text: "" });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateVehicleOwnerForm(form, { requirePassword: true });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setMessage({ type: "error", text: "Vui lòng kiểm tra lại thông tin trước khi cập nhật." });
            return;
        }

        setSubmitting(true);
        setMessage({ type: "", text: "" });
        try {
            const response = await updateVehicleOwnerPersonalInfo(ownerId, buildVehicleOwnerPayload(form, { includePassword: false }));
            const updatedOwner = response?.owner || owner;
            setOwner(updatedOwner);
            setForm(buildVehicleOwnerEditForm(updatedOwner));
            setMessage({ type: "success", text: "Đã cập nhật thông tin chủ xe." });
        } catch (error) {
            const status = error?.response?.status;
            const data = error?.response?.data || {};
            if (status === 422 && Array.isArray(data.details)) {
                setErrors((prev) => ({ ...prev, ...mapApiValidationErrors(data.details) }));
            }
            setMessage({ type: "error", text: data.message || "Không thể cập nhật chủ xe." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleQuickLockToggle() {
        if (!owner) return;
        try {
            await updateVehicleOwnerAccountStatus(owner.owner_id, {
                owner_id: owner.owner_id,
                account_active: Number(owner.account_active) === 1 ? 0 : 1,
                status: Number(owner.account_active) === 1 ? 0 : 1,
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
            await deleteVehicleOwnerAccount(ownerId, { owner_id: Number(ownerId) });
            setDeleteModal({ open: false, loading: false, error: "" });
            await loadPage();
            setMessage({ type: "success", text: "Đã xóa mềm tài khoản chủ xe." });
        } catch (error) {
            setDeleteModal((prev) => ({ ...prev, loading: false, error: error?.response?.data?.message || "Không thể xóa mềm chủ xe." }));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Vehicle owner edit</p>
                    <h1 className="mt-2 text-3xl font-bold">Sửa thông tin chủ xe</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Cập nhật hồ sơ cá nhân, ngân hàng, xác minh và trạng thái tài khoản.</p>
                </div>
                <Link to={buildVehicleOwnerDetailPath(role, ownerId)} className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Xem chi tiết</Link>
            </div>

            {pageError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{pageError}</span></div></div> : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm"><div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Đang tải hồ sơ chủ xe...</div></div>
            ) : (
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
                        <div><label className="mb-2 block text-sm font-semibold text-slate-700">Tình trạng tài khoản</label><select value={form.account_active} onChange={(event) => updateField("account_active", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Đang hoạt động</option><option value="0">Đang khóa</option></select><FieldError error={errors.account_active} /></div>
                        <div><label className="mb-2 block text-sm font-semibold text-slate-700">Tình trạng kích hoạt</label><select value={form.is_activated} onChange={(event) => updateField("is_activated", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Đã kích hoạt</option><option value="0">Chưa kích hoạt</option></select><FieldError error={errors.is_activated} /></div>
                        <div><label className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái</label><select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500"><option value="1">Active</option><option value="0">Inactive</option></select><FieldError error={errors.status} /></div>
                    </div>

                    {message.text ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}><div className="flex items-start gap-2">{message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{message.text}</span></div></div> : null}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{submitting ? "Đang cập nhật..." : "Cập nhật thông tin"}</button>
                        <button type="button" onClick={handleQuickLockToggle} className="rounded-2xl border border-amber-200 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">{Number(owner?.account_active) === 1 ? "Khóa tài khoản" : "Mở khóa"}</button>
                        <button type="button" onClick={() => setDeleteModal({ open: true, loading: false, error: "" })} className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">Xóa mềm tài khoản</button>
                        <Link to={buildVehicleOwnerDetailPath(role, ownerId)} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Hủy</Link>
                    </div>
                </form>
            )}

            {deleteModal.open ? (
                <ModalShell title={`Xóa mềm chủ xe #${ownerId}`} onClose={() => setDeleteModal({ open: false, loading: false, error: "" })}>
                    <p className="text-sm text-slate-600">Hành động này sẽ đánh dấu tài khoản chủ xe là đã xóa mềm.</p>
                    {deleteModal.error ? <p className="mt-3 text-sm text-red-600">{deleteModal.error}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={handleSoftDelete} disabled={deleteModal.loading} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">{deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}Xác nhận xóa mềm</button>
                    </div>
                </ModalShell>
            ) : null}
        </div>
    );
}

