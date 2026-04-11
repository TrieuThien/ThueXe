import { Link } from "react-router-dom";
import { CalendarClock, ClipboardList, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";

export default function DispatcherDashboardPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.dispatcher.badge")}
                title={t("adminModules.dispatcher.title")}
                description={t("adminModules.dispatcher.desc")}
                gradient="from-slate-950 via-slate-900 to-cyan-800"
                actions={
                    <>
                        <Link to="/dispatcher/booking/dispatch" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">Open Dispatch</Link>
                        <Link to="/dispatcher/map-tracking" className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold">Tracking Map</Link>
                    </>
                }
            />

            <section className="grid gap-4 xl:grid-cols-3">
                <StatCard label="New requests" value="24" hint="Need action in current shift" icon={ClipboardList} tone="cyan" />
                <StatCard label="Scheduled trips" value="9" hint="Waiting for assignment" icon={CalendarClock} tone="blue" />
                <StatCard label="Live incidents" value="3" hint="Need close monitoring" icon={MapPinned} tone="amber" />
            </section>
        </div>
    );
}
