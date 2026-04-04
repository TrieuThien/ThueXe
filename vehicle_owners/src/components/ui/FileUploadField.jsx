export default function FileUploadField({ label, value, onChange, accept = 'image/*' }) {
  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onChange(file);
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="form-label">{label}</span>
      <input className="input-field p-2" type="file" accept={accept} onChange={handleChange} />
      <span className="text-xs text-slate-500">{value?.name || value || 'Chưa chọn tep'}</span>
    </label>
  );
}


