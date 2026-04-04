import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import FormPasswordField from '../../owner-auth/components/FormPasswordField';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z
      .string()
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()[\]{}\-_=+\\|;:'",.<>/?`~]).{8,}$/,
        'Mật khẩu mới phải mạnh hơn (>=8 ký tự, gồm hoa/thường/số/ký tự đặc biệt).',
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['confirmPassword'],
  });

export default function ChangePasswordForm({ onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleValidSubmit = async (values) => {
    await onSubmit(values);
    reset();
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h3 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h3>
      <p className="mt-1 text-sm text-slate-500">Đặt mật khẩu mạnh để bảo vệ tài khoản của bạn.</p>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleValidSubmit)}>
        <FormPasswordField
          label="Mật khẩu hiện tại"
          name="currentPassword"
          placeholder="Nhập mật khẩu hiện tại"
          register={register}
          error={errors.currentPassword?.message}
          required
        />

        <span className="hidden md:block" />

        <FormPasswordField
          label="Mật khẩu mới"
          name="newPassword"
          placeholder="Nhập mật khẩu mới"
          register={register}
          error={errors.newPassword?.message}
          required
        />

        <FormPasswordField
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          placeholder="Nhập lại mật khẩu mới"
          register={register}
          error={errors.confirmPassword?.message}
          required
        />

        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={loading || !isDirty}>
            {loading ? 'Đang đổi mật khẩu...' : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </article>
  );
}

