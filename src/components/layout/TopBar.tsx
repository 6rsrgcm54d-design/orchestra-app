import React from 'react';
import { Sun, Moon, RefreshCw, Unplug } from 'lucide-react';
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
  onSync: () => void;
  onDisconnect: () => void;
  isSyncing?: boolean;
}

export default function TopBar({ activeModule, user, spreadsheetTitle, onSync, onDisconnect, isSyncing }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      {/* Left: page title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {MODULE_LABELS[activeModule]}
        </h1>
        {spreadsheetTitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {spreadsheetTitle}
          </p>
        )}
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-2">
        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          title="Sincronizar com Google Sheets"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Sincronizar</span>
        </button>

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          title="Desconectar Spreadsheet"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
        >
          <Unplug size={15} />
          <span className="hidden sm:inline">Desconectar</span>
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
            className="w-8 h-8 rounded-full border-2 border-orchestra-gold"
          />
          <div className="hidden md:block text-right">
            <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{user.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
