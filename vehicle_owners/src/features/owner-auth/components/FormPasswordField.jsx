import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function FormPasswordField({
  label,
  name,
  placeholder,
  register,
  error,
  required = false,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="form-label">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>

      <span className="relative">
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className="input-field pr-11"
          {...register(name)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? 'An mat khau' : 'Hien mat khau'}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>

      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}
