import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Truck, Users, CreditCard,
  BarChart3, Settings, ChevronLeft, ChevronRight, LogOut, Package
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/complaints', label: 'Complaints', icon: FileText },
  { path: '/cfa-management', label: 'CFA Management', icon: Truck },
  { path: '/dealer-management', label: 'Dealer Management', icon: Users },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/field-management', label: 'Field Management', icon: Settings },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{ backgroundColor: '#1E3A5F' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-white font-bold text-lg leading-tight">RLTS</h1>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Conti Collect</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-white/15 text-white shadow-lg shadow-black/10'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-blue-300' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Collapse */}
      <div className="p-3 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-white/40 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>

        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full mt-2 py-2 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/70 transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
