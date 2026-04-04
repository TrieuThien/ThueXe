export default function LanguageSwitcher({ language, onChange, label }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-blue-200/90 bg-white p-1 shadow-sm">
      <span className="ml-2 mr-1 text-[11px] font-medium text-slate-500">{label}</span>
      <button
        type="button"
        className={`rounded-full px-3 py-1 text-xs font-bold transition ${language === 'vi' ? 'bg-blue-700 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'}`}
        onClick={() => onChange('vi')}
      >
        VI
      </button>
      <button
        type="button"
        className={`rounded-full px-3 py-1 text-xs font-bold transition ${language === 'en' ? 'bg-blue-700 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'}`}
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  );
}
