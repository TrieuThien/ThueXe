import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import FormPasswordField from '../../features/owner-auth/components/FormPasswordField';
import FormTextField from '../../features/owner-auth/components/FormTextField';
import { OWNER_ROUTES } from '../../constants/routes';
import { ownerAuthService } from '../../services/ownerAuthService';
import { CheckCircle2, CircleDollarSign, ShieldCheck, WalletCards, LogIn } from 'lucide-react';

const ownerLoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});


const benefitItems = [
  {
    icon: CircleDollarSign,
    title: 'Tăng thu nhập chủ động',
    description: 'Tối ưu công suất xe, theo dõi doanh thu và lịch sử giao dịch rõ ràng.',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật và xác thực',
    description: 'Hồ sơ được đối soát, giúp hệ thống vận hành minh bạch và an toàn hơn.',
  },
  {
    icon: WalletCards,
    title: 'Thanh toán linh hoạt',
    description: 'Cấu hình tài khoản ngân hàng ngay từ đầu để rút tiền nhanh.'
  },
];

export default function OwnerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ownerLoginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitError('');

    try {
      await ownerAuthService.loginOwnerAccount(values);
      toast.success('Đăng nhập thành công.');
      const fromPath = location.state?.from;
      const fromQuery = searchParams.get('from');
      const redirectPath =
        typeof fromPath === 'string' && fromPath.startsWith('/owner')
          ? fromPath
          : typeof fromQuery === 'string' && fromQuery.startsWith('/owner')
            ? fromQuery
            : OWNER_ROUTES.DASHBOARD;
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <main className="flex items-center min-h-screen place-items-center bg-gradient-to-br from-slate-100 via-blue-50 to-white p-4 md:p-6">
      <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/40 md:p-8">
          <header className="mb-5 space-y-2 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <ShieldCheck size={24} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">ThueXe</h1>
            <p className="text-sm text-slate-600">Sử dụng email hoặc số điện thoại để đăng nhập hệ thống quản lý xe.</p>
          </header>

          <form className="space-y-4 max-w-md mx-auto" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormTextField
              label="Email hoặc số điện thoại"
              name="identifier"
              placeholder="owner@example.com hoặc 0912345678"
              register={register}
              error={errors.identifier?.message}
              required
            />

            <FormPasswordField
              label="Mật khẩu"
              name="password"
              placeholder="Nhập mật khẩu"
              register={register}
              error={errors.password?.message}
              required
            />

            {submitError ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {submitError}
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              <LogIn size={16} />
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Chưa có tài khoản?{' '}
            <Link className="font-bold text-sky-700 hover:underline" to={OWNER_ROUTES.REGISTER}>
              Đăng ký ngay
            </Link>
          </p>
          
          <p className='mt-6 text-center text-sm text-slate-600'>
          <Link className="font-bold text-center text-sky-700 hover:underline" to={OWNER_ROUTES.LANDING}>
              Quay về trang chủ
          </Link>

          </p>

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
                Biến xe nhận được thu nhập bên trong
              </h2>
              <p className="text-sm leading-6 text-slate-200">
                Nâng cao hỗ trợ bạn quản lý xe, đơn thuê, thanh toán và xác minh tài khoản theo quy trình rõ ràng.
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


