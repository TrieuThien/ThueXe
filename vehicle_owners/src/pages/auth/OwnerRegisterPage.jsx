import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, CircleDollarSign, ShieldCheck, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import FormPasswordField from '../../features/owner-auth/components/FormPasswordField';
import FormSectionCard from '../../features/owner-auth/components/FormSectionCard';
import FormTextField from '../../features/owner-auth/components/FormTextField';
import {
  mapOwnerRegistrationPayload,
  ownerRegistrationDefaultValues,
} from '../../features/owner-auth/models/ownerRegistrationModel';
import { ownerRegistrationSchema } from '../../features/owner-auth/schemas/ownerRegistrationSchema';
import { OWNER_ROUTES } from '../../constants/routes';
import { ownerAuthService } from '../../services/ownerAuthService';

const benefitItems = [
  {
    icon: CircleDollarSign,
    title: 'Tăng thu nhập chủ động',
    description: 'Tối ưu công suất xe, theo dõi doanh thu và lịch sử giao dịch rõ ràng.',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật và xác thực',
    description: 'Hồ sơ được đối chiếu, giúp hệ thống vận hành minh bạch và an toàn hơn.',
  },
  {
    icon: WalletCards,
    title: 'Thanh toán linh hoạt',
    description: 'Cấu hình tài khoản ngân hàng ngay từ đầu để rút tiền nhanh.'
  },
];

export default function OwnerRegisterPage() {
  const navigate = useNavigate();
  const [submitMessage, setSubmitMessage] = useState({ type: 'idle', text: '' });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ownerRegistrationSchema),
    defaultValues: ownerRegistrationDefaultValues,
    mode: 'onBlur',
  });

  const onSubmit = async (values) => {
    setSubmitMessage({ type: 'idle', text: '' });

    try {
      const payload = mapOwnerRegistrationPayload(values);
      const response = await ownerAuthService.registerOwnerAccount(payload);

      setSubmitMessage({
        type: 'success',
        text: 'Gửi mã xác thực thành công. Đang chuyển đến trang xác thực tài khoản...',
      });
      toast.success('Gửi mã xác thực thành công.');
      navigate(OWNER_ROUTES.REGISTER_VERIFY, {
        replace: true,
        state: {
          fullName: values.fullName,
          email: values.email,
          verificationTicket: response.verificationTicket,
        },
      });
    } catch (error) {
      const message = error.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setSubmitMessage({ type: 'error', text: message });
      toast.error(message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-white px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40 md:p-7">
          <header className="mb-5 space-y-2">
            <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700">
              Chủ xe mới
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Đăng ký tài khoản chủ xe
            </h1>
            <p className="text-sm text-slate-600 md:text-base">
              Hoàn tất thông tin bên dưới để tạo tài khoản và bắt đầu hành trình cho thuê xe của bạn với chúng tôi.
            </p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormSectionCard title="Thông tin cá nhân" description="Thông tin dùng để xác minh danh tính.">
              <FormTextField
                label="Họ và tên"
                name="fullName"
                placeholder="Nguyễn Văn A"
                register={register}
                error={errors.fullName?.message}
                required
              />
              <span className="hidden md:block" />
              <FormPasswordField
                label="Mật khẩu"
                name="password"
                placeholder="Nhập mật khẩu"
                register={register}
                error={errors.password?.message}
                required
              />
              <FormPasswordField
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                register={register}
                error={errors.confirmPassword?.message}
                required
              />
            </FormSectionCard>

            <FormSectionCard title="Thông tin liên hệ" description="Cần thiết để nhận thông báo và đối soát.">
              <FormTextField
                label="Số điện thoại"
                name="phoneNumber"
                placeholder="0912345678"
                register={register}
                error={errors.phoneNumber?.message}
                required
              />
              <FormTextField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                register={register}
                error={errors.email?.message}
                required
              />
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="form-label">
                  Địa chỉ <span className="ml-1 text-rose-600">*</span>
                </span>
                <textarea
                  rows={3}
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                  className="input-field resize-y"
                  {...register('address')}
                />
                {errors.address ? <span className="error-text">{errors.address.message}</span> : null}
              </label>
            </FormSectionCard>

            <FormSectionCard title="Thông tin thanh toán" description="Tài khoản nhận tiền doanh thu cho thuê xe.">
              <FormTextField
                label="Tên ngân hàng"
                name="bankName"
                placeholder="Vietcombank"
                register={register}
                error={errors.bankName?.message}
                required
              />
              <FormTextField
                label="Số tài khoản"
                name="bankAccountNumber"
                placeholder="0123456789"
                register={register}
                error={errors.bankAccountNumber?.message}
                required
              />
              <FormTextField
                label="Mã ngân hàng"
                name="bankCode"
                placeholder="VCB"
                register={register}
                error={errors.bankCode?.message}
                required
              />
              <FormTextField
                label="Mã định danh tổ chức (Swift code)"
                name="swiftCode"
                placeholder="BFTVVNVX"
                register={register}
                error={errors.swiftCode?.message}
                required
              />
            </FormSectionCard>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                {...register('agreeTerms')}
              />
              <span className="text-sm text-slate-700">
                Tôi đồng ý với <a href="/terms" className="text-sky-600 hover:underline">Điều khoản dịch vụ</a> và <a href="/privacy" className="text-sky-600 hover:underline">Chính sách bảo mật</a> của Thuexe.
              </span>
            </label>
            {errors.agreeTerms ? <p className="error-text mt-1">{errors.agreeTerms.message}</p> : null}

            {submitMessage.type !== 'idle' ? (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  submitMessage.type === 'success'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-rose-300 bg-rose-50 text-rose-700'
                }`}
              >
                {submitMessage.text}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <Link className="text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline" to="/owner">
                Quay lại trang chủ
              </Link>
              <button type="submit" className="btn btn-primary min-w-52" disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
              </button>
            </div>
          </form>
        </section>

        <aside className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-xl shadow-slate-400/40 md:p-8">
          <div className="pointer-events-none absolute -left-8 top-14 h-40 w-40 rounded-full bg-cyan-400/30 blur-2xl" />
          <div className="pointer-events-none absolute -right-4 bottom-10 h-44 w-44 rounded-full bg-sky-500/20 blur-2xl" />

          <div className="relative space-y-6">
            <header className="space-y-3">
              <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-100">
                Lợi ích chủ xe
              </p>
              <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                Biến xe nhàn rỗi thành thu nhập bền vững
              </h2>
              <p className="text-sm leading-6 text-slate-200">
                Nền tảng hỗ trợ bạn quản lý xe, đơn thuê, thanh toán và xác minh tài khoản theo quy trình rõ ràng.
              </p>
            </header>

            <div className="space-y-3">
              {benefitItems.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <item.icon size={18} className="text-cyan-200" />
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <CheckCircle2 size={16} /> Hỗ trợ xử lý hồ sơ nhanh trong thời gian hành chính.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}



