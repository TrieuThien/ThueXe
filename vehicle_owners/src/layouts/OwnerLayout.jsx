import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import { useUiStore } from '../store/uiStore';

export default function OwnerLayout() {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100">
      <Sidebar />
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
        <Topbar />
        <main className="px-4 pb-8 pt-4 md:px-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
