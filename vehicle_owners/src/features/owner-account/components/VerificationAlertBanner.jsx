import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OWNER_ROUTES } from '../../../constants/routes';

export default function VerificationAlertBanner({ verificationStatus }) {
  if (verificationStatus === 'verified') {
    return null;
  }

  const note =
    verificationStatus === 'pending_review'
      ? 'Hồ sơ của bạn đang được admin kiểm tra. Bạn có thể theo dõi tiến trình trong trang xác thực.'
      : 'Tài khoản chưa xác thực. Hoàn tất hồ sơ để kích hoạt đầy đủ tính năng và tăng độ tin cậy.';

  return (
    <article className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertTriangle size={16} />
          {note}
        </p>
        <Link className="btn btn-primary" to={OWNER_ROUTES.ACCOUNT_VERIFICATION}>
          Đến trang xác thực <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
