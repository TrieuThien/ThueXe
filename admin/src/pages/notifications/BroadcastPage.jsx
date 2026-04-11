import { useEffect, useState } from "react";
import { Clock3, Megaphone, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import { getBroadcastHistory, sendBroadcast } from "../../services/adminService";

const initialForm = {
    title: "",
    content: "",
    audience: "all_customers",
    send_at: "",
};

export default function BroadcastPage() {
    const { t } = useTranslation();
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState("");
    const [history, setHistory] = useState([]);

    async function loadHistory() {
        const response = await getBroadcastHistory({ page: 1, limit: 20 });
        setHistory(response.items || []);
    }

    useEffect(() => {
        loadHistory();
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setResult("");
        try {
            await sendBroadcast({
                ...form,
                send_at: form.send_at || null,
            });
            setResult(t("adminModules.broadcast.sent"));
            setForm(initialForm);
            loadHistory();
        } catch (error) {
            setResult(error?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.broadcast.badge")}
                title={t("adminModules.broadcast.title")}
                description={t("adminModules.broadcast.desc")}
                gradient="from-slate-950 via-slate-900 to-fuchsia-900"
            />

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5">
                    <label>
                        <span className="mb-2 block text-sm font-medium text-slate-600">Title</span>
                        <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-fuchsia-500" required />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-medium text-slate-600">Content</span>
                        <textarea value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-fuchsia-500" required />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm font-medium text-slate-600">Audience</span>
                            <select value={form.audience} onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
                                <option value="all_customers">All customers</option>
                                <option value="all_drivers">All drivers</option>
                                <option value="by_zone">By zone</option>
                                <option value="by_service_type">By service type</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-2 block text-sm font-medium text-slate-600">Schedule time</span>
                            <input type="datetime-local" value={form.send_at} onChange={(event) => setForm((prev) => ({ ...prev, send_at: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
                        </label>
                    </div>
                    {result ? <p className="text-sm text-slate-700">{result}</p> : null}
                    <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><Send className="h-4 w-4" />{submitting ? "Sending..." : "Send"}</button>
                </form>

                <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Megaphone className="h-5 w-5 text-fuchsia-700" />History</h2>
                    <div className="mt-4 space-y-3">
                        {history.map((item) => (
                            <div key={item.notification_id || item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.content}</p>
                                <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "--"}</p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </div>
    );
}
