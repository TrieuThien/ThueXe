import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUiStore } from '../../store/uiStore';
import { ownerAuthService } from '../../services/ownerAuthService';

export default function Topbar() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const toggleMobileSidebar = useUiStore((state) => state.toggleMobileSidebar);

  const handleMenuClick = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const ownerName = useMemo(() => {
    try {
      const rawProfile = localStorage.getItem('owner_profile');
      const profile = rawProfile ? JSON.parse(rawProfile) : null;
      return (
        profile?.fullname ||
        profile?.full_name ||
        profile?.name ||
        profile?.email ||
        profile?.phone ||
        'Chủ xe'
      );
    } catch {
      return 'Chủ xe';
    }
  }, []);

  const ownerInitials =
    ownerName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'CX';

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await ownerAuthService.logoutOwnerAccount();
      toast.success('Đã đăng xuất tài khoản.');
      navigate('/owner/login', { replace: true });
    } catch {
      navigate('/owner/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 grid grid-cols-1 gap-3 border-b border-sky-100 bg-white/90 px-4 py-3 backdrop-blur md:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
      <button type="button" className="btn w-fit" onClick={handleMenuClick}>
        <Menu></Menu>
      </button>

      <div>
        <h1 className="font-bold">ThueXe</h1>
        <p className="text-xs text-slate-500">Trang quản trị dành cho chủ xe</p>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{ownerInitials}</span>
        <div className="pr-1">
          <p className="text-xs font-bold">{ownerName}</p>
          <p className="text-[11px] text-slate-500">Chủ xe</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-orange-500 hover:text-white disabled:opacity-60"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut size={12} />
          {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>
      </div>
    </header>
  );
}
