import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/routes';
import { useUiStore } from '../../store/uiStore';

export default function Sidebar() {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-700 bg-gradient-to-b from-slate-900 to-slate-800 p-3 text-slate-100 transition-all duration-300 lg:block ${sidebarCollapsed ? 'w-24' : 'w-72'}`}
    >
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-700/40 p-3">
        <img src="/Thuexe-logo.png" alt="ThueXe Logo" className="h-8 w-auto" />
        {!sidebarCollapsed && (
          <div>
            <p className="font-bold">Chủ xe</p>
            <p className="text-xs text-slate-300">Trang quản trị</p>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'border border-sky-300/40 bg-sky-400/20 text-white' : 'text-slate-200 hover:bg-slate-700/70'}`
            }
          >
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
