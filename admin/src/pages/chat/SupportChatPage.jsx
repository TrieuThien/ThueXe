import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, SendHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import { getSupportMessages, sendSupportReply } from "../../services/adminService";
import { connectRealtime } from "../../services/realtimeService";

export default function SupportChatPage() {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");

    const selectedConversation = useMemo(() => conversations.find((item) => item.thread_key === selectedId), [conversations, selectedId]);

    function buildThread(chat) {
        if (chat.user_id) {
            return `user:${chat.user_id}`;
        }
        if (chat.driver_id) {
            return `driver:${chat.driver_id}`;
        }
        return "unknown:0";
    }

    async function loadConversations() {
        const response = await getSupportMessages({ page: 1, limit: 200 });
        const items = response.items || [];
        const grouped = new Map();
        items.forEach((item) => {
            const key = buildThread(item);
            if (!grouped.has(key)) {
                grouped.set(key, {
                    thread_key: key,
                    customer_name: key,
                    status: Number(item.session_status) === 1 ? "new" : "processing",
                    last_message: item.chat_msg,
                });
            }
        });
        const list = Array.from(grouped.values());
        setConversations(list);
        if (!selectedId && list[0]) {
            setSelectedId(list[0].thread_key);
        }
    }

    async function loadMessages(threadKey) {
        if (!threadKey) {
            setMessages([]);
            return;
        }
        const response = await getSupportMessages({ page: 1, limit: 200 });
        const all = response.items || [];
        setMessages(all.filter((item) => buildThread(item) === threadKey).reverse());
    }

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        loadMessages(selectedId);
    }, [selectedId]);

    useEffect(() => {
        const realtime = connectRealtime("/ws/support/chat", {
            onMessage: (payload) => {
                if (buildThread(payload) === selectedId) {
                    setMessages((prev) => [...prev, payload]);
                }
                loadConversations();
            },
        });

        return () => realtime.close();
    }, [selectedId]);

    async function handleSend(event) {
        event.preventDefault();
        if (!reply.trim() || !selectedId) {
            return;
        }

        const [kind, id] = selectedId.split(":");
        const payload = await sendSupportReply({
            chat_msg: reply.trim(),
            user_id: kind === "user" ? Number(id) : 0,
            driver_id: kind === "driver" ? Number(id) : 0,
            session_status: 2,
        });
        setMessages((prev) => [...prev, payload.chat || payload]);
        setReply("");
        loadConversations();
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.chat.badge")}
                title={t("adminModules.chat.title")}
                description={t("adminModules.chat.desc")}
                gradient="from-slate-950 via-slate-900 to-cyan-900"
            />

            <section className="grid min-h-[620px] gap-4 xl:grid-cols-[340px_1fr]">
                <aside className="rounded-[28px] border border-slate-200 bg-white p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900"><MessageCircleMore className="h-5 w-5 text-cyan-700" />Conversations</h2>
                    <div className="space-y-2">
                        {conversations.map((item) => {
                            const id = item.thread_key;
                            const active = id === selectedId;
                            return (
                                <button key={id} type="button" onClick={() => setSelectedId(id)} className={`w-full rounded-2xl border px-3 py-3 text-left ${active ? "border-cyan-300 bg-cyan-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                    <p className="font-semibold text-slate-900">{item.customer_name || `Conversation #${id}`}</p>
                                    <p className="mt-1 text-xs text-slate-500">{item.status || "new"}</p>
                                    <p className="mt-1 text-xs text-slate-400">{item.last_message || ""}</p>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <article className="flex flex-col rounded-[28px] border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="font-bold text-slate-900">{selectedConversation?.customer_name || "Select a conversation"}</h2>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                        {messages.map((item, index) => {
                            const mine = Number(item.admin_id || 0) > 0;
                            return (
                                <div key={item.message_id || index} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-cyan-600 text-white" : "bg-white text-slate-800 border border-slate-200"}`}>
                                        <p>{item.chat_msg || item.content || item.message || ""}</p>
                                        <p className={`mt-1 text-[11px] ${mine ? "text-cyan-100" : "text-slate-400"}`}>{item.date_created ? new Date(item.date_created).toLocaleTimeString("vi-VN") : ""}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2">
                            <input value={reply} onChange={(event) => setReply(event.target.value)} className="w-full bg-transparent px-2 py-1 outline-none" placeholder="Reply message..." />
                            <button type="submit" className="rounded-xl bg-cyan-600 p-2 text-white"><SendHorizontal className="h-4 w-4" /></button>
                        </div>
                    </form>
                </article>
            </section>
        </div>
    );
}
