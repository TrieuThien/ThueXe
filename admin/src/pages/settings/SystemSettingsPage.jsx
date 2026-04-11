import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import { getSystemSettings, updateSystemSettings } from "../../services/adminService";

const defaultSettings = {
    driver_commission_rate: "20",
    cancel_fee: "15000",
    free_waiting_minutes: "5",
    max_service_radius_km: "25",
    paypal_client_id: "",
    google_maps_api_key: "",
};

export default function SystemSettingsPage() {
    const { t } = useTranslation();
    const [form, setForm] = useState(defaultSettings);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getSystemSettings()
            .then((response) => setForm((prev) => ({ ...prev, ...response })))
            .catch(() => {
                setMessage(t("adminModules.loadFailed"));
            });
    }, [t]);

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            await updateSystemSettings(form);
            setMessage(t("adminModules.settings.saved"));
        } catch (error) {
            setMessage(error?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setSaving(false);
        }
    }

    function input(field, label, type = "text") {
        return (
            <label>
                <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
                <input
                    type={type}
                    value={form[field] || ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
            </label>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.settings.badge")}
                title={t("adminModules.settings.title")}
                description={t("adminModules.settings.desc")}
                gradient="from-slate-950 via-slate-900 to-violet-900"
            />

            <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2">
                    {input("driver_commission_rate", "Driver commission (%)", "number")}
                    {input("cancel_fee", "Cancel fee (VND)", "number")}
                    {input("free_waiting_minutes", "Free waiting minutes", "number")}
                    {input("max_service_radius_km", "Max service radius (km)", "number")}
                    {input("paypal_client_id", "PayPal client id")}
                    {input("google_maps_api_key", "Google Maps key")}
                </div>

                {message ? <p className="text-sm text-slate-700">{message}</p> : null}
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save changes"}</button>
            </form>
        </div>
    );
}
