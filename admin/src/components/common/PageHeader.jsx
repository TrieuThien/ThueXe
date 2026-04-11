export default function PageHeader({ badge, title, description, actions, gradient = "from-slate-950 via-slate-900 to-blue-900" }) {
    return (
        <section className={`overflow-hidden rounded-[28px] bg-gradient-to-r ${gradient} px-6 py-6 text-white`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-blue-200">{badge}</p>
                    <h1 className="mt-2 text-3xl font-bold">{title}</h1>
                    {description ? <p className="mt-2 max-w-3xl text-sm text-slate-200">{description}</p> : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
        </section>
    );
}
