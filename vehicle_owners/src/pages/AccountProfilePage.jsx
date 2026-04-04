import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, Mail, Phone, UserCircle2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import AccountSummaryCards from '../features/owner-account/components/AccountSummaryCards';
import VerificationAlertBanner from '../features/owner-account/components/VerificationAlertBanner';
import ProfileUpdateForm from '../features/owner-account/components/ProfileUpdateForm';
import ChangePasswordForm from '../features/owner-account/components/ChangePasswordForm';
import { OWNER_ROUTES } from '../constants/routes';
import { ownerService } from '../services/ownerService';
import { formatDate } from '../utils/format';

const accountStatusLabels = {
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
  suspended: 'Tạm khóa',
};

const verificationStatusLabels = {
  not_submitted: 'Chưa gửi',
  pending_review: 'Đang chờ duyệt',
  verified: 'Đã xác thực',
  rejected: 'Bị từ chối',
};

const badgeClassByStatus = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  locked: 'border-rose-200 bg-rose-50 text-rose-700',
  suspended: 'border-amber-200 bg-amber-50 text-amber-700',
  not_submitted: 'border-slate-200 bg-slate-50 text-slate-700',
  pending_review: 'border-amber-200 bg-amber-50 text-amber-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join('');

export default function AccountProfilePage() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['owner-account-profile'],
    queryFn: ownerService.getAccountProfile,
  });

  const summaryQuery = useQuery({
    queryKey: ['owner-account-summary'],
    queryFn: ownerService.getAccountSummary,
  });

  const updateProfileMutation = useMutation({
    mutationFn: ownerService.updateAccountProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-account-profile'] });
      toast.success('Cập nhật thông tin thành công.');
    },
    onError: (error) => toast.error(error.message || 'Cập nhật thất bại.'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ownerService.changePassword,
    onSuccess: () => toast.success('Đổi mật khẩu thành công.'),
    onError: (error) => toast.error(error.message || 'Không thể đổi mật khẩu.'),
  });

  const profile = profileQuery.data;
  const accountBadgeClass = badgeClassByStatus[profile?.accountStatus] || badgeClassByStatus.active;
  const verificationBadgeClass =
    badgeClassByStatus[profile?.verificationStatus] || badgeClassByStatus.not_submitted;
  const fullName = profile?.fullName || 'Chủ xe';
  const avatarText = useMemo(() => getInitials(fullName), [fullName]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Quản lý thông tin tài khoản"
        description="Cập nhật thông tin tài khoản, ngân hàng và bảo mật tài khoản của chủ xe."
      />

      <VerificationAlertBanner verificationStatus={profile?.verificationStatus} />

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-slate-900 text-2xl font-black text-white">
              {avatarText || <UserCircle2 size={36} />}
            </div>
            <p className="mt-3 font-bold text-slate-900">{fullName}</p>
            <p className="mt-1 text-sm text-slate-500">{profile?.email || '--'}</p>
            <Link className="btn mt-3 w-full justify-center" to={OWNER_ROUTES.ACCOUNT_VERIFICATION}>
              Đến trang xác thực
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Trạng thái tài khoản</p>
              <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${accountBadgeClass}`}>
                {accountStatusLabels[profile?.accountStatus] || '--'}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Trạng thái xác thực</p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${verificationBadgeClass}`}
              >
                {verificationStatusLabels[profile?.verificationStatus] || '--'}
              </span>
            </div>

            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <Phone size={15} /> {profile?.phoneNumber || profile?.phone || '--'}
            </p>
            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <Mail size={15} /> {profile?.email || '--'}
            </p>
            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <Building2 size={15} /> {profile?.address || '--'}
            </p>
            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <CalendarDays size={15} /> Ngày tạo tài khoản: {formatDate(profile?.createdAt)}
            </p>
          </div>
        </div>
      </article>

      <AccountSummaryCards summary={summaryQuery.data} />

      <ProfileUpdateForm
        profile={profile}
        loading={updateProfileMutation.isPending}
        onSubmit={(values) => updateProfileMutation.mutateAsync(values)}
      />

      <ChangePasswordForm
        loading={changePasswordMutation.isPending}
        onSubmit={(values) => changePasswordMutation.mutateAsync(values)}
      />
    </section>
  );
}


