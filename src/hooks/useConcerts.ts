import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  readRange,
  appendRows,
  updateRange,
  deleteRow,
  INITIAL_LOCAL_DATA,
  ensureSheetExists,
  isAppsScript,
  isLocalId,
} from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Concert } from '../types';
import { safeStorage } from '../utils/storage';

const TAB = 'Concertos';
const HEADER = ['Orquestra', 'Data', 'Hora Ensaio Geral', 'Hora Concerto', 'Local', 'Programa', 'Notas'];

function rowToConcert(row: string[], rowIndex: number): Concert {
  return {
    id: `concert-${rowIndex}`,
    rowIndex,
    orquestra: row[0] ?? 'Académica',
    data: row[1] ?? '',
    horaEnsaioGeral: row[2] ?? '',
    horaConcerto: row[3] ?? '',
    local: row[4] ?? '',
    programa: row[5] ?? '',
    notas: row[6] ?? '',
  };
}

function concertToRow(c: Omit<Concert, 'id' | 'rowIndex'>): string[] {
  return [
    c.orquestra || 'Académica',
    c.data || '',
    c.horaEnsaioGeral || '',
    c.horaConcerto || '',
    c.local || '',
    c.programa || '',
    c.notas || '',
  ];
}

const CACHE_KEY = 'orchestra_cache_concerts';

function getInitialConcerts(): Concert[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Concertos'] || [];
  if (raw.length > 1) {
    const list = raw.slice(1).map((row, i) => rowToConcert(row, i + 2));
    safeStorage.setItem(CACHE_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

export function useConcerts() {
  const { config, sheetsMeta, getSheetId, refreshMeta } = useSheets();
  const [concerts, setConcerts] = useState<Concert[]>(getInitialConcerts);
  const [isLoading, setIsLoading] = useState(false);

  const ensureTabExists = useCallback(async () => {
    if (!config) return;
    if (!isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
      if (sheetsMeta && !sheetsMeta.sheets.some((s) => s.properties.title.toLowerCase() === TAB.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, TAB);
          await refreshMeta();
        } catch (e) {
          console.warn('Erro ao criar aba Concertos:', e);
        }
      }
    }
  }, [config, sheetsMeta, refreshMeta]);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A:G`);
      if (rows && rows.length > 1) {
        const loaded = rows.slice(1).map((row, i) => rowToConcert(row, i + 2));
        setConcerts(loaded);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
      }
    } catch (err) {
      console.warn('Aba Concertos ainda não existe ou erro ao carregar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const addConcert = useCallback(
    async (concert: Omit<Concert, 'id' | 'rowIndex'>) => {
      if (!config) return;
      const toastId = toast.loading('A adicionar concerto...');
      try {
        await ensureTabExists();
        await appendRows(config.spreadsheetId, `${TAB}!A:G`, [concertToRow(concert)]);
        toast.success('Concerto agendado com sucesso!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, ensureTabExists, load]
  );

  const updateConcert = useCallback(
    async (concert: Concert) => {
      if (!config) return;
      const toastId = toast.loading('A guardar concerto...');
      try {
        await ensureTabExists();
        const range = `${TAB}!A${concert.rowIndex}:G${concert.rowIndex}`;
        await updateRange(config.spreadsheetId, range, [concertToRow(concert)]);
        toast.success('Concerto atualizado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, ensureTabExists, load]
  );

  const deleteConcert = useCallback(
    async (concert: Concert) => {
      if (!config) return;
      const sheetId = getSheetId(TAB);
      if (sheetId === undefined && !isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
        toast.error('Aba Concertos não encontrada');
        return;
      }
      const toastId = toast.loading('A eliminar concerto...');
      try {
        await deleteRow(config.spreadsheetId, sheetId ?? 0, concert.rowIndex - 1);
        toast.success('Concerto eliminado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, getSheetId, load]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A1:G1`);
      if (!rows.length || rows[0][0] !== 'Orquestra') {
        await updateRange(config.spreadsheetId, `${TAB}!A1:G1`, [HEADER]);
      }
    } catch {}
  }, [config]);

  return {
    concerts,
    isLoading,
    load,
    addConcert,
    updateConcert,
    deleteConcert,
    ensureHeader,
  };
}
