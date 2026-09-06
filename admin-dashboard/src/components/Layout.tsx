import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, Users, BarChart3, Star,
  Scissors, LogOut, Bell, ChevronDown, Settings
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../services/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',         label: 'Overview',   icon: LayoutDashboard, exact: true },
  { to: '/salons',   label: 'Salons',     icon: Store },
  { to: '/users',    label: 'Customers',  icon: Users },
  { to: '/revenue',  label: 'Revenue',    icon: BarChart3 },
  { to: '/reviews',  label: 'Reviews',    icon: Star },
  { to: '/settings', label: 'Settings',   icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-[#0f0f23] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Scissors size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">TrimTown</p>
              <p className="text-white/40 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-brand-600/20 text-white border-l-2 border-brand-500 pl-[10px]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center text-xs text-brand-300 font-semibold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-white/40 text-xs">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">Haldwani, Uttarakhand · MVP v1.0</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
                {user?.name?.[0] || 'A'}
              </div>
              {user?.name || 'Admin'}
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
