import React from 'react';
import {
  LayoutDashboard,
  Users,
  Music,
  Star,
  Theater,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Music2,
} from 'lucide-react';
import type { NavModule } from '../../types';

interface SidebarProps {
  activeModule: NavModule;
  onNavigate: (module: NavModule) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut: () => void;
}

const navItems: { id: NavModule; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'students', label: 'Alunos', icon: <Users size={20} /> },
  { id: 'stagePlan', label: 'Plano de Palco', icon: <Theater size={20} /> },
  { id: 'repertoire', label: 'Repertório', icon: <Music size={20} /> },
  { id: 'evaluations', label: 'Avaliações', icon: <Star size={20} /> },
];

export default function Sidebar({ activeModule, onNavigate, collapsed, onToggleCollapse, onSignOut }: SidebarProps) {
  return (
    <aside
      className={`
        flex flex-col h-screen bg-orchestra-navy dark:bg-orchestra-navy
        border-r border-white/10 transition-all duration-300 z-40
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex-shrink-0 w-8 h-8 bg-orchestra-gold rounded-lg flex items-center justify-center">
          <Music2 size={16} className="text-orchestra-navy" />
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-sm tracking-wide truncate">OrquestraApp</span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
                text-sm font-medium group
                ${isActive
                  ? 'bg-orchestra-gold text-orchestra-navy'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1 border-t border-white/10 pt-3">
        <button
          onClick={onSignOut}
          title={collapsed ? 'Sair' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>

        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-2 text-white/40 hover:text-white/70 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
