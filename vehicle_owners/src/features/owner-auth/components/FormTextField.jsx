export default function FormTextField({
  label,
  name,
  type = 'text',
  placeholder,
  register,
  error,
  required = false,
  className = '',
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="form-label">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      <input type={type} placeholder={placeholder} className="input-field" {...register(name)} />
      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}
