import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import { getVehicleOwners } from "../../services/vehicleOwnerService";

export default function VehicleOwnersPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);

    async function loadData() {
        const response = await getVehicleOwners({ page: 1, limit: 40 });
        setRows(response.items || []);
    }

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.vehicleOwners.badge")}
                title={t("adminModules.vehicleOwners.title")}
                description={t("adminModules.vehicleOwners.desc")}
                gradient="from-slate-950 via-slate-900 to-teal-900"
                actions={<button type="button" onClick={loadData} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span></button>}
            />

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Vehicles</th><th className="px-4 py-3">Status</th></tr></thead>
                        <tbody>{rows.map((row) => <tr key={row.owner_id || row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.fullname || row.owner_name || "--"}</td><td className="px-4 py-3">{row.phone || "--"}</td><td className="px-4 py-3">{row.email || "--"}</td><td className="px-4 py-3">{Number(row.wallet_balance || 0).toLocaleString("vi-VN")}</td><td className="px-4 py-3">{row.verification_status || "--"}</td></tr>)}</tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
