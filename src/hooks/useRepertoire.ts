import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, updateRange, deleteRow, INITIAL_LOCAL_DATA } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Piece, EstadoRepertorio } from '../types';
import { safeStorage } from '../utils/storage';

const TAB = 'Repertório';
const HEADER = ['Título', 'Compositor', 'Dificuldade', 'Duração', 'Estado', 'Notas', 'Orquestra'];

function rowToPiece(row: string[], rowIndex: number): Piece {
  return {
    id: `piece-${rowIndex}`,
    rowIndex,
    titulo: row[0] ?? '',
    compositor: row[1] ?? '',
    dificuldade: row[2] ?? '',
    duracao: row[3] ?? '',
    estado: (row[4] as EstadoRepertorio) ?? 'em ensaio',
    notas: row[5] ?? '',
    orquestra: row[6] ? String(row[6]).trim() : undefined,
  };
}

function pieceToRow(p: Omit<Piece, 'id' | 'rowIndex'>): string[] {
  return [p.titulo, p.compositor, p.dificuldade, p.duracao, p.estado, p.notas, p.orquestra ?? ''];
}

const CACHE_KEY = 'orchestra_cache_pieces';

function getInitialPieces(): Piece[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Repertório'] || [];
  if (raw.length > 1) {
    const list = raw.slice(1).map((row, i) => rowToPiece(row, i + 2));
    safeStorage.setItem(CACHE_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

export function useRepertoire() {
  const { config, getSheetId } = useSheets();
  const [pieces, setPieces] = useState<Piece[]>(getInitialPieces);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A:G`);
      const loaded = rows.slice(1).map((row, i) => rowToPiece(row, i + 2));
      setPieces(loaded);
      if (loaded.length > 0) {
        safeStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
      }
    } catch (err) {
      toast.error(`Erro ao carregar repertório: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const add = useCallback(
    async (piece: Omit<Piece, 'id' | 'rowIndex'>) => {
      if (!config) return;
      const toastId = toast.loading('A adicionar peça...');
      try {
        await appendRows(config.spreadsheetId, `${TAB}!A:G`, [pieceToRow(piece)]);
        toast.success('Peça adicionada!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, load]
  );

  const update = useCallback(
    async (piece: Piece) => {
      if (!config) return;
      const toastId = toast.loading('A guardar...');
      try {
        const range = `${TAB}!A${piece.rowIndex}:G${piece.rowIndex}`;
        await updateRange(config.spreadsheetId, range, [pieceToRow(piece)]);
        toast.success('Peça atualizada!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, load]
  );

  const remove = useCallback(
    async (piece: Piece) => {
      if (!config) return;
      const sheetId = getSheetId(TAB);
      if (sheetId === undefined) { toast.error('Aba não encontrada'); return; }
      const toastId = toast.loading('A eliminar...');
      try {
        await deleteRow(config.spreadsheetId, sheetId, piece.rowIndex - 1);
        toast.success('Peça eliminada!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, getSheetId, load]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    const rows = await readRange(config.spreadsheetId, `${TAB}!A1:G1`);
    if (!rows.length || rows[0][0] !== 'Título') {
      await updateRange(config.spreadsheetId, `${TAB}!A1:G1`, [HEADER]);
    }
  }, [config]);

  return { pieces, isLoading, load, add, update, remove, ensureHeader };
}
