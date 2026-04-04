export default function FormSectionCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
      <header className="mb-4">
        <h2 className="text-base font-bold text-slate-900 md:text-lg">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </header>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
