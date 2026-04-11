import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Save, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import {
    getSystemSettings,
    updateSystemSettings,
    getCurrencies,
    createCurrency,
    updateCurrency,
    setDefaultCurrency,
} from "../../services/adminService";

// ─── General Settings Tab ────────────────────────────────────────────────────

const defaultSettings = {
    driver_commission_rate: "20",
    cancel_fee: "15000",
    free_waiting_minutes: "5",
    max_service_radius_km: "25",
    paypal_client_id: "",
    google_maps_api_key: "",
};

function GeneralSettingsTab() {
    const { t } = useTranslation();
    const [form, setForm] = useState(defaultSettings);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getSystemSettings()
            .then((response) => {
                if (!mounted) return;
                setForm({
                    driver_commission_rate: String(response?.driver_commission_rate ?? defaultSettings.driver_commission_rate),
                    cancel_fee: String(response?.cancel_fee ?? defaultSettings.cancel_fee),
                    free_waiting_minutes: String(response?.free_waiting_minutes ?? defaultSettings.free_waiting_minutes),
                    max_service_radius_km: String(response?.max_service_radius_km ?? defaultSettings.max_service_radius_km),
                    paypal_client_id: String(response?.paypal_client_id ?? defaultSettings.paypal_client_id),
                    google_maps_api_key: String(response?.google_maps_api_key ?? defaultSettings.google_maps_api_key),
                });
            })
            .catch(() => {
                if (!mounted) return;
                setMessageType("error");
                setMessage(t("adminModules.loadFailed"));
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [t]);

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setMessageType("info");
        try {
            const payloadData = {
                driver_commission_rate: Number(form.driver_commission_rate),
                cancel_fee: Number(form.cancel_fee),
                free_waiting_minutes: Number(form.free_waiting_minutes),
                max_service_radius_km: Number(form.max_service_radius_km),
                paypal_client_id: form.paypal_client_id?.trim() || "",
                google_maps_api_key: form.google_maps_api_key?.trim() || "",
            };
            const updated = await updateSystemSettings(payloadData);
            setForm({
                driver_commission_rate: String(updated?.driver_commission_rate ?? payloadData.driver_commission_rate),
                cancel_fee: String(updated?.cancel_fee ?? payloadData.cancel_fee),
                free_waiting_minutes: String(updated?.free_waiting_minutes ?? payloadData.free_waiting_minutes),
                max_service_radius_km: String(updated?.max_service_radius_km ?? payloadData.max_service_radius_km),
                paypal_client_id: String(updated?.paypal_client_id ?? payloadData.paypal_client_id),
                google_maps_api_key: String(updated?.google_maps_api_key ?? payloadData.google_maps_api_key),
            });
            setMessageType("success");
            setMessage(t("adminModules.settings.saved"));
        } catch (error) {
            setMessageType("error");
            setMessage(error?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setSaving(false);
        }
    }

    function field(key, label, type = "text") {
        return (
            <label>
                <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
                <input
                    type={type}
                    value={form[key] || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
            </label>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
                {field("driver_commission_rate", "Tỷ lệ hoa hồng cho tài xế (%)", "number")}
                {field("cancel_fee", "Phí hủy đơn (VND)", "number")}
                {field("free_waiting_minutes", "Phút chờ miễn phí", "number")}
                {field("max_service_radius_km", "Bán kính dịch vụ tối đa (km)", "number")}
                {field("paypal_client_id", "PayPal client id")}
                {field("google_maps_api_key", "Google Maps key")}
            </div>
            {message ? (
                <p className={`text-sm ${messageType === "error" ? "text-red-600" : messageType === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                    {message}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
                <Save className="h-4 w-4" />
                {loading ? "Loading..." : saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
        </form>
    );
}

// ─── Currency Tab ────────────────────────────────────────────────────────────

const emptyCurrencyForm = { name: "", iso_code: "", symbol: "", exchng_rate: "" };

function CurrencyFormRow({ form, setForm, onSubmit, onCancel, submitLabel, submitting, formError }) {
    return (
        <tr className="bg-indigo-50">
            <td className="px-4 py-2">
                <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="Tên tiền tệ"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-indigo-500"
                    placeholder="USD"
                    maxLength={4}
                    value={form.iso_code}
                    onChange={(e) => setForm((p) => ({ ...p, iso_code: e.target.value.toUpperCase() }))}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="$"
                    maxLength={10}
                    value={form.symbol}
                    onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value }))}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="1.00000"
                    value={form.exchng_rate}
                    onChange={(e) => setForm((p) => ({ ...p, exchng_rate: e.target.value }))}
                />
            </td>
            <td className="px-4 py-2" colSpan={2}>
                <div className="flex flex-col gap-1">
                    {formError && <span className="text-xs text-red-600">{formError}</span>}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={submitting}
                            className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                            {submitting ? "Đang lưu..." : submitLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
}

function CurrencyTab() {
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // add form
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState(emptyCurrencyForm);
    const [addError, setAddError] = useState("");
    const [adding, setAdding] = useState(false);

    // edit form (keyed by currency id)
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState(emptyCurrencyForm);
    const [editError, setEditError] = useState("");
    const [saving, setSaving] = useState(false);

    const [settingDefault, setSettingDefault] = useState(null);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const data = await getCurrencies();
            setCurrencies(data?.currencies || []);
        } catch {
            setError("Không thể tải danh sách tiền tệ.");
        } finally {
            setLoading(false);
        }
    }

    function validateForm(form) {
        if (!form.name.trim()) return "Tên tiền tệ là bắt buộc.";
        if (!form.iso_code.trim() || form.iso_code.trim().length < 2) return "Mã ISO phải có ít nhất 2 ký tự.";
        if (!form.symbol.trim()) return "Ký hiệu là bắt buộc.";
        const rate = Number(form.exchng_rate);
        if (!Number.isFinite(rate) || rate < 0) return "Tỷ giá phải là số không âm.";
        return null;
    }

    async function handleAdd(e) {
        e.preventDefault();
        const err = validateForm(addForm);
        if (err) { setAddError(err); return; }
        setAdding(true);
        setAddError("");
        try {
            await createCurrency({
                name: addForm.name.trim(),
                iso_code: addForm.iso_code.trim().toUpperCase(),
                symbol: addForm.symbol.trim(),
                exchng_rate: Number(addForm.exchng_rate),
            });
            setAddForm(emptyCurrencyForm);
            setShowAdd(false);
            await load();
        } catch (err) {
            setAddError(err?.response?.data?.message || "Thêm thất bại.");
        } finally {
            setAdding(false);
        }
    }

    function startEdit(currency) {
        setEditId(currency.id);
        setEditForm({
            name: currency.name,
            iso_code: currency.iso_code,
            symbol: currency.symbol,
            exchng_rate: String(currency.exchng_rate),
        });
        setEditError("");
    }

    function cancelEdit() {
        setEditId(null);
        setEditError("");
    }

    async function handleSaveEdit(e) {
        e.preventDefault();
        const err = validateForm(editForm);
        if (err) { setEditError(err); return; }
        setSaving(true);
        setEditError("");
        try {
            await updateCurrency(editId, {
                name: editForm.name.trim(),
                iso_code: editForm.iso_code.trim().toUpperCase(),
                symbol: editForm.symbol.trim(),
                exchng_rate: Number(editForm.exchng_rate),
            });
            setEditId(null);
            await load();
        } catch (err) {
            setEditError(err?.response?.data?.message || "Cập nhật thất bại.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSetDefault(id) {
        setSettingDefault(id);
        try {
            const data = await setDefaultCurrency(id);
            setCurrencies(data?.currencies || []);
        } catch {
            // silently ignore, reload to sync
            await load();
        } finally {
            setSettingDefault(null);
        }
    }

    return (
        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Đơn vị tiền tệ mặc định sẽ được sử dụng để hiển thị giá trên toàn hệ thống.
                </p>
                {!showAdd && (
                    <button
                        type="button"
                        onClick={() => { setShowAdd(true); setAddError(""); setAddForm(emptyCurrencyForm); }}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm tiền tệ
                    </button>
                )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {loading ? (
                <p className="py-8 text-center text-sm text-slate-400">Đang tải...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                                <th className="px-4 py-3">Tên</th>
                                <th className="px-4 py-3">Mã ISO</th>
                                <th className="px-4 py-3">Ký hiệu</th>
                                <th className="px-4 py-3">Tỷ giá</th>
                                <th className="px-4 py-3">Mặc định</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {showAdd && (
                                <CurrencyFormRow
                                    form={addForm}
                                    setForm={setAddForm}
                                    onSubmit={handleAdd}
                                    onCancel={() => setShowAdd(false)}
                                    submitLabel="Thêm"
                                    submitting={adding}
                                    formError={addError}
                                />
                            )}
                            {currencies.length === 0 && !showAdd && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400">
                                        Chưa có tiền tệ nào.
                                    </td>
                                </tr>
                            )}
                            {currencies.map((currency) =>
                                editId === currency.id ? (
                                    <CurrencyFormRow
                                        key={currency.id}
                                        form={editForm}
                                        setForm={setEditForm}
                                        onSubmit={handleSaveEdit}
                                        onCancel={cancelEdit}
                                        submitLabel="Lưu"
                                        submitting={saving}
                                        formError={editError}
                                    />
                                ) : (
                                    <tr key={currency.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{currency.name}</td>
                                        <td className="px-4 py-3 font-mono text-slate-700">{currency.iso_code}</td>
                                        <td className="px-4 py-3 text-slate-700">{currency.symbol}</td>
                                        <td className="px-4 py-3 text-slate-700">{Number(currency.exchng_rate).toFixed(5)}</td>
                                        <td className="px-4 py-3">
                                            {currency.is_default ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                                    <Star className="h-3 w-3 fill-emerald-600" />
                                                    Mặc định
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={settingDefault === currency.id}
                                                    onClick={() => handleSetDefault(currency.id)}
                                                    className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50"
                                                >
                                                    {settingDefault === currency.id ? "..." : "Đặt mặc định"}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(currency)}
                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                                            >
                                                <Pencil className="h-3 w-3" />
                                                Sửa
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
    { id: "general", label: "Cài đặt chung" },
    { id: "currency", label: "Đơn vị tiền tệ" },
];

export default function SystemSettingsPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("general");

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.settings.badge")}
                title={t("adminModules.settings.title")}
                description={t("adminModules.settings.desc")}
                gradient="from-slate-950 via-slate-900 to-violet-900"
            />

            <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
                            activeTab === tab.id
                                ? "bg-white text-violet-700 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "general" && <GeneralSettingsTab />}
            {activeTab === "currency" && <CurrencyTab />}
        </div>
    );
}
