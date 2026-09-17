import React from 'react';
import { Sun, Moon, RefreshCw, Unplug, Cloud, HardDrive } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { GoogleUser, NavModule } from '../../types';

const MODULE_LABELS: Record<NavModule, string> = {
  dashboard: 'Dashboard',
  students: 'Gestão de Alunos',
  stagePlan: 'Plano de Palco',
  repertoire: 'Repertório',
  evaluations: 'Avaliações',
};

interface TopBarProps {
  activeModule: NavModule;
  user: GoogleUser;
  spreadsheetTitle?: string;
  isLocalMode?: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  onOpenConnect: () => void;
  isSyncing?: boolean;
}

export default function TopBar({
  activeModule,
  user,
  spreadsheetTitle,
  isLocalMode,
  onSync,
  onDisconnect,
  onOpenConnect,
  isSyncing,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      {/* Left: page title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {MODULE_LABELS[activeModule]}
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <button
            onClick={onOpenConnect}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-orchestra-gold transition-colors flex items-center gap-1.5 group"
            title="Clica para alterar ou ligar a outra folha"
          >
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                isLocalMode ? 'bg-amber-500' : 'bg-green-500'
              }`}
            />
            <span className="group-hover:underline">{spreadsheetTitle || 'Fonte de Dados'}</span>
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 group-hover:text-orchestra-gold">
              Alterar
            </span>
          </button>
        </div>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-2">
        {/* Connect to Google Sheets button (if in local mode) */}
        {isLocalMode && (
          <button
            onClick={onOpenConnect}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orchestra-navy bg-orchestra-gold/90 hover:bg-orchestra-gold rounded-lg transition-all shadow-sm"
            title="Ligar ao teu Google Sheets no Google Drive"
          >
            <Cloud size={14} />
            <span>Ligar ao Google Drive</span>
          </button>
        )}

        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          title="Sincronizar com a fonte de dados"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Sincronizar</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <img
            src={user.picture}
            alt={user.name}
            className="w-8 h-8 rounded-full border-2 border-orchestra-gold object-cover"
          />
          <div className="hidden md:block text-right">
            <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
