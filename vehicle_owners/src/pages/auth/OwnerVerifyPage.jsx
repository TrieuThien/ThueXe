import { CheckCircle2, Clock3, MailCheck, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { OWNER_ROUTES } from '../../constants/routes';

export default function OwnerVerifyPage() {
  const { state } = useLocation();
  const fullName = state?.fullName || 'Chủ xe';
  const email = state?.email || 'Chưa-cap-nhat@example.com';
  const verificationTicket = state?.verificationTicket || '---';

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-4 md:p-8">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/40 md:p-8">
        <header className="text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Đã gửi mã xác thực!
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Xin chào {fullName}, tài khoản của bạn đã được ghi nhận và đang chờ xác thực.
          </p>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Vui lòng kiểm tra email {email} để xác thực tài khoản.
          </p>
        </header>

        <div className="mt-6 grid gap-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MailCheck size={16} className="text-blue-600" />
              Email đăng ký: <span className="font-black text-slate-900">{email}</span>
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldCheck size={16} className="text-cyan-600" />
              Mã hồ sơ: <span className="font-black text-slate-900">{verificationTicket}</span>
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Clock3 size={16} />
              Mã xác thực có hiệu lực trong 3 phút kể từ khi nhận được email. Nếu không xác thực, thông tin đăng ký sẽ bị hủy và bạn sẽ phải đăng ký lại.
            </p>

          </article>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link className="btn justify-center" to={OWNER_ROUTES.ACCOUNT_VERIFICATION}>
            Nộp hồ sơ xác thực
          </Link>
          <Link className="btn justify-center" to={OWNER_ROUTES.REGISTER}>
            Cập nhật thông tin đăng ký
          </Link>
          <Link className="btn btn-primary justify-center" to={OWNER_ROUTES.LOGIN}>
            Đến trang đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}

