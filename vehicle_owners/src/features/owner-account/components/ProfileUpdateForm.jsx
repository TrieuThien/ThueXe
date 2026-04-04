import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(\+84|84|0)(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ.'),
  address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ.'),
  bankName: z.string().trim().min(1, 'Vui lòng nhập tên ngân hàng.'),
  bankAccountNumber: z.string().trim().regex(/^\d{6,20}$/, 'Số tài khoản phải từ 6 - 20 chữ số.'),
  bankCode: z.string().trim().min(2, 'Vui lòng nhập mã ngân hàng.'),
  swiftCode: z.string().trim().min(6, 'Vui lòng nhập SWIFT code.'),
});

export default function ProfileUpdateForm({ profile, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      address: '',
      bankName: '',
      bankAccountNumber: '',
      bankCode: '',
      swiftCode: '',
    },
  });

  useEffect(() => {
    if (!profile) {
      return;
    }
    reset({
      fullName: profile.fullName || '',
      phoneNumber: profile.phoneNumber || profile.phone || '',
      address: profile.address || '',
      bankName: profile.bankInfo?.bankName || '',
      bankAccountNumber: profile.bankInfo?.accountNumber || '',
      bankCode: profile.bankInfo?.bankCode || '',
      swiftCode: profile.bankInfo?.swiftCode || '',
    });
  }, [profile, reset]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h3 className="text-lg font-bold text-slate-900">Cập nhật thông tin</h3>
      <p className="mt-1 text-sm text-slate-500">Bạn có thể chỉnh sửa thông tin liên hệ và tài khoản nhận tiền</p>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <label className="flex flex-col gap-1.5">
          <span className="form-label">Họ và tên</span>
          <input className="input-field" {...register('fullName')} />
          {errors.fullName ? <span className="error-text">{errors.fullName.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="form-label">Số điện thoại</span>
          <input className="input-field" {...register('phoneNumber')} />
          {errors.phoneNumber ? <span className="error-text">{errors.phoneNumber.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="form-label">Địa chỉ</span>
          <input className="input-field" {...register('address')} />
          {errors.address ? <span className="error-text">{errors.address.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="form-label">Tên ngân hàng</span>
          <input className="input-field" {...register('bankName')} />
          {errors.bankName ? <span className="error-text">{errors.bankName.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="form-label">Số tài khoản</span>
          <input className="input-field" {...register('bankAccountNumber')} />
          {errors.bankAccountNumber ? <span className="error-text">{errors.bankAccountNumber.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="form-label">Mã ngân hàng</span>
          <input className="input-field" {...register('bankCode')} />
          {errors.bankCode ? <span className="error-text">{errors.bankCode.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="form-label">Mã định danh ngân hàng (SWIFT code)</span>
          <input className="input-field" {...register('swiftCode')} />
          {errors.swiftCode ? <span className="error-text">{errors.swiftCode.message}</span> : null}
        </label>

        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={loading || !isDirty}>
            {loading ? 'Đang cập nhật...' : 'Lưu thông tin'}
          </button>
        </div>
      </form>
    </article>
  );
}

