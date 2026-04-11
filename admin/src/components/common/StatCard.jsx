export default function StatCard({ label, value, hint, icon: Icon, tone = "blue" }) {
    const tones = {
        blue: "bg-blue-100 text-blue-700",
        emerald: "bg-emerald-100 text-emerald-700",
        amber: "bg-amber-100 text-amber-700",
        cyan: "bg-cyan-100 text-cyan-700",
    };

    return (
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                </div>
                {Icon ? (
                    <div className={`rounded-2xl p-3 ${tones[tone] || tones.blue}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                ) : null}
            </div>
            {hint ? <p className="mt-3 text-sm text-slate-600">{hint}</p> : null}
        </article>
    );
}
