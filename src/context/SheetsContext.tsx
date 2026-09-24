import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getSpreadsheetMeta,
  ensureSheetExists,
  extractSpreadsheetId,
  LOCAL_STORAGE_ID,
  isLocalId,
} from '../api/sheetsApi';
import type { SheetsConfig } from '../types';
import { safeStorage } from '../utils/storage';

interface SheetsContextValue {
  config: SheetsConfig | null;
  sheetsMeta: SheetsMeta | null;
  isConnecting: boolean;
  isLocalMode: boolean;
  connect: (urlOrId: string) => Promise<void>;
  connectLocal: () => Promise<void>;
  reconnect: () => Promise<void>;
  refreshMeta: () => Promise<void>;
  disconnect: () => void;
  getSheetId: (tabName: string) => number | undefined;
}

interface SheetsMeta {
  title: string;
  sheets: Array<{ properties: { sheetId: number; title: string } }>;
}

const REQUIRED_TABS = ['Alunos', 'Repertório', 'Avaliações', 'Critérios', 'PlanosPalco'];

const SheetsContext = createContext<SheetsContextValue | null>(null);

const STORAGE_KEY = 'orchestra_spreadsheet_id';

const DEFAULT_SHEETS_META: SheetsMeta = {
  title: 'Orquestras Bomfim (Base de Dados Local)',
  sheets: [
    { properties: { sheetId: 0, title: 'Académica' } },
    { properties: { sheetId: 1, title: 'Juvenil' } },
    { properties: { sheetId: 2, title: 'Artave' } },
    { properties: { sheetId: 3, title: 'Repertório' } },
    { properties: { sheetId: 4, title: 'Avaliações' } },
    { properties: { sheetId: 5, title: 'Critérios' } },
    { properties: { sheetId: 6, title: 'PlanosPalco' } },
  ],
};

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SheetsConfig | null>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) return { spreadsheetId: saved };
    safeStorage.setItem(STORAGE_KEY, LOCAL_STORAGE_ID);
    return { spreadsheetId: LOCAL_STORAGE_ID };
  });
  const [sheetsMeta, setSheetsMeta] = useState<SheetsMeta | null>(() => {
    const savedMeta = safeStorage.getItem('orchestra_cache_sheets_meta');
    if (savedMeta) {
      try {
        return JSON.parse(savedMeta);
      } catch {}
    }
    return DEFAULT_SHEETS_META;
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (urlOrId: string) => {
    setIsConnecting(true);
    try {
      const id = extractSpreadsheetId(urlOrId);
      const meta = await getSpreadsheetMeta(id);

      // Garante que todas as abas necessárias existem (se for Sheets real)
      if (!isLocalId(id)) {
        for (const tab of REQUIRED_TABS) {
          await ensureSheetExists(id, meta.sheets, tab);
        }
      }

      // Re-fetcha meta depois de criar abas
      const updatedMeta = await getSpreadsheetMeta(id);

      setConfig({ spreadsheetId: id });
      setSheetsMeta(updatedMeta);
      safeStorage.setItem(STORAGE_KEY, id);
      safeStorage.setItem('orchestra_cache_sheets_meta', JSON.stringify(updatedMeta));
      toast.success(`Conectado: ${updatedMeta.title}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao conectar: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Suporte a link direto de sincronização (ex: abrir no iPad via ?sync=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncParam = params.get('sync') || params.get('sheet');
    if (syncParam) {
      if (!safeStorage.getItem('orchestra_guest_user')) {
        const guestUser = {
          id: 'maestro-luis',
          name: 'Maestro: Luís Machado',
          email: 'luismachado78@gmail.com',
          picture: '',
        };
        safeStorage.setItem('orchestra_guest_user', JSON.stringify(guestUser));
      }
      connect(syncParam).then(() => {
        const cleanUrl = window.location.protocol === 'file:'
          ? window.location.href.split('?')[0]
          : window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        window.location.reload();
      });
    }
  }, [connect]);

  const connectLocal = useCallback(async () => {
    await connect(LOCAL_STORAGE_ID);
  }, [connect]);

  const reconnect = useCallback(async () => {
    const saved = safeStorage.getItem(STORAGE_KEY) || LOCAL_STORAGE_ID;
    if (sheetsMeta) return;
    setIsConnecting(true);
    try {
      const meta = await getSpreadsheetMeta(saved);
      setConfig({ spreadsheetId: saved });
      setSheetsMeta(meta);
      safeStorage.setItem('orchestra_cache_sheets_meta', JSON.stringify(meta));
    } catch {
      // fallback to local
      const meta = await getSpreadsheetMeta(LOCAL_STORAGE_ID);
      setConfig({ spreadsheetId: LOCAL_STORAGE_ID });
      setSheetsMeta(meta);
      safeStorage.setItem('orchestra_cache_sheets_meta', JSON.stringify(meta));
    } finally {
      setIsConnecting(false);
    }
  }, [sheetsMeta]);

  const refreshMeta = useCallback(async () => {
    if (!config) return;
    try {
      const meta = await getSpreadsheetMeta(config.spreadsheetId);
      setSheetsMeta(meta);
      safeStorage.setItem('orchestra_cache_sheets_meta', JSON.stringify(meta));
    } catch (err) {
      console.warn('Erro ao atualizar abas:', err);
    }
  }, [config]);

  const disconnect = useCallback(() => {
    setConfig(null);
    setSheetsMeta(null);
    safeStorage.removeItem(STORAGE_KEY);
    toast.success('Desconectado');
  }, []);

  const getSheetId = useCallback(
    (tabName: string): number | undefined => {
      return sheetsMeta?.sheets.find((s) => s.properties.title === tabName)?.properties.sheetId;
    },
    [sheetsMeta]
  );

  const isLocalMode = config ? isLocalId(config.spreadsheetId) : false;

  return (
    <SheetsContext.Provider
      value={{
        config,
        sheetsMeta,
        isConnecting,
        isLocalMode,
        connect,
        connectLocal,
        reconnect,
        refreshMeta,
        disconnect,
        getSheetId,
      }}
    >
      {children}
    </SheetsContext.Provider>
  );
}

export function useSheets(): SheetsContextValue {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used within SheetsProvider');
  return ctx;
}
