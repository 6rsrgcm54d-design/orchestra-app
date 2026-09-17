import React, { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSpreadsheetMeta, ensureSheetExists, extractSpreadsheetId } from '../api/sheetsApi';
import type { SheetsConfig } from '../types';

interface SheetsContextValue {
  config: SheetsConfig | null;
  sheetsMeta: SheetsMeta | null;
  isConnecting: boolean;
  connect: (urlOrId: string) => Promise<void>;
  reconnect: () => Promise<void>;
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

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SheetsConfig | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { spreadsheetId: saved } : null;
  });
  const [sheetsMeta, setSheetsMeta] = useState<SheetsMeta | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async (urlOrId: string) => {
    setIsConnecting(true);
    try {
      const id = extractSpreadsheetId(urlOrId);
      const meta = await getSpreadsheetMeta(id);

      // Garante que todas as abas necessárias existem
      for (const tab of REQUIRED_TABS) {
        await ensureSheetExists(id, meta.sheets, tab);
      }

      // Re-fetcha meta depois de criar abas
      const updatedMeta = await getSpreadsheetMeta(id);

      setConfig({ spreadsheetId: id });
      setSheetsMeta(updatedMeta);
      localStorage.setItem(STORAGE_KEY, id);
      toast.success(`Conectado a: ${updatedMeta.title}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao conectar: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Reconnect using the saved spreadsheetId (called after login when ID already exists)
  const reconnect = useCallback(async () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || sheetsMeta) return;
    setIsConnecting(true);
    try {
      const meta = await getSpreadsheetMeta(saved);
      setSheetsMeta(meta);
    } catch {
      // Silently fail — user will see the connect screen
    } finally {
      setIsConnecting(false);
    }
  }, [sheetsMeta]);

  const disconnect = useCallback(() => {
    setConfig(null);
    setSheetsMeta(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Desconectado do Spreadsheet');
  }, []);

  const getSheetId = useCallback(
    (tabName: string): number | undefined => {
      return sheetsMeta?.sheets.find((s) => s.properties.title === tabName)?.properties.sheetId;
    },
    [sheetsMeta]
  );

  return (
    <SheetsContext.Provider value={{ config, sheetsMeta, isConnecting, connect, reconnect, disconnect, getSheetId }}>
      {children}
    </SheetsContext.Provider>
  );
}

export function useSheets(): SheetsContextValue {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used within SheetsProvider');
  return ctx;
}
