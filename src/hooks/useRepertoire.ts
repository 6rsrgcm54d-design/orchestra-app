import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, updateRange, deleteRow, INITIAL_LOCAL_DATA } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Piece, EstadoRepertorio } from '../types';
import { safeStorage } from '../utils/storage';

const TAB = 'Repertório';
const DEFAULT_HEADER = ['Título', 'Compositor', 'Duração', 'Orquestra', 'Notas'];

export interface RepertoireHeaderMapping {
  colTitulo: number;
  colCompositor: number;
  colDuracao: number;
  colOrquestra: number;
  colNotas: number;
  colDificuldade: number;
  colEstado: number;
  rawHeader: string[];
}

export function parseRepertoireHeader(headerRow: string[] = []): RepertoireHeaderMapping {
  const norm = headerRow.map((c) =>
    (c || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );
  const findCol = (predicate: (col: string) => boolean) => norm.findIndex(predicate);

  const colTitulo = findCol((c) => c.includes('titulo') || c.includes('peca') || c.includes('obra'));
  const colCompositor = findCol((c) => c.includes('compositor') || c.includes('autor'));
  const colDuracao = findCol((c) => c.includes('duracao') || c.includes('tempo') || c.includes('min'));
  const colOrquestra = findCol((c) => c.includes('orquestra'));
  const colNotas = findCol((c) => c.includes('nota') || c.includes('obs') || c.includes('coment'));
  const colDificuldade = findCol((c) => c.includes('dificuldade') || c.includes('grau') || c.includes('nivel'));
  const colEstado = findCol((c) => c.includes('estado') || c.includes('status'));

  return {
    colTitulo: colTitulo !== -1 ? colTitulo : 0,
    colCompositor: colCompositor !== -1 ? colCompositor : 1,
    colDuracao: colDuracao !== -1 ? colDuracao : (headerRow.length > 3 ? 3 : -1),
    colOrquestra: colOrquestra !== -1 ? colOrquestra : (headerRow.length > 6 ? 6 : -1),
    colNotas: colNotas !== -1 ? colNotas : (headerRow.length > 5 ? 5 : -1),
    colDificuldade,
    colEstado,
    rawHeader: headerRow,
  };
}

function colToLetter(col: number): string {
  let temp = col;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter || 'A';
}

function rowToPiece(row: string[], rowIndex: number, mapping: RepertoireHeaderMapping): Piece | null {
  const titulo = (row[mapping.colTitulo] ?? '').trim();
  const compositor = mapping.colCompositor !== -1 ? (row[mapping.colCompositor] ?? '').trim() : '';
  if (!titulo && !compositor) return null;
  const lowerTitulo = titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (lowerTitulo === 'titulo' || lowerTitulo === 'peca') return null;

  return {
    id: `piece-${rowIndex}`,
    rowIndex,
    titulo,
    compositor,
    duracao: mapping.colDuracao !== -1 ? (row[mapping.colDuracao] ?? '').trim() : '',
    notas: mapping.colNotas !== -1 ? (row[mapping.colNotas] ?? '').trim() : '',
    orquestra: mapping.colOrquestra !== -1 ? (row[mapping.colOrquestra] ?? '').trim() || undefined : undefined,
    dificuldade: mapping.colDificuldade !== -1 ? (row[mapping.colDificuldade] ?? '').trim() || undefined : undefined,
    estado: mapping.colEstado !== -1 ? (row[mapping.colEstado] as EstadoRepertorio) : undefined,
  };
}

function pieceToRow(p: Omit<Piece, 'id' | 'rowIndex'>, mapping?: RepertoireHeaderMapping): string[] {
  if (!mapping || !mapping.rawHeader || mapping.rawHeader.length === 0) {
    return [p.titulo, p.compositor, p.duracao, p.orquestra ?? '', p.notas];
  }
  const row = new Array(mapping.rawHeader.length).fill('');
  if (mapping.colTitulo >= 0 && mapping.colTitulo < row.length) row[mapping.colTitulo] = p.titulo;
  if (mapping.colCompositor >= 0 && mapping.colCompositor < row.length) row[mapping.colCompositor] = p.compositor;
  if (mapping.colDuracao >= 0 && mapping.colDuracao < row.length) row[mapping.colDuracao] = p.duracao;
  if (mapping.colOrquestra >= 0 && mapping.colOrquestra < row.length) row[mapping.colOrquestra] = p.orquestra || '';
  if (mapping.colNotas >= 0 && mapping.colNotas < row.length) row[mapping.colNotas] = p.notas;
  if (mapping.colDificuldade >= 0 && mapping.colDificuldade < row.length) row[mapping.colDificuldade] = p.dificuldade || '';
  if (mapping.colEstado >= 0 && mapping.colEstado < row.length) row[mapping.colEstado] = p.estado || '';
  return row;
}

const CACHE_KEY = 'orchestra_cache_pieces';

function getInitialPieces(): Piece[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter((p: any) => p && p.titulo);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(valid));
        return valid;
      }
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Repertório'] || [];
  if (raw.length > 1) {
    const mapping = parseRepertoireHeader(raw[0]);
    const list = raw
      .slice(1)
      .map((row, i) => rowToPiece(row, i + 2, mapping))
      .filter((p): p is Piece => p !== null);
    safeStorage.setItem(CACHE_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

export function useRepertoire() {
  const { config, getSheetId } = useSheets();
  const [pieces, setPieces] = useState<Piece[]>(getInitialPieces);
  const [isLoading, setIsLoading] = useState(false);
  const lastMappingRef = useRef<RepertoireHeaderMapping>(parseRepertoireHeader(DEFAULT_HEADER));

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A:Z`);
      if (rows.length > 0) {
        const mapping = parseRepertoireHeader(rows[0]);
        lastMappingRef.current = mapping;
        const loaded = rows
          .slice(1)
          .map((row, i) => rowToPiece(row, i + 2, mapping))
          .filter((p): p is Piece => p !== null);
        setPieces(loaded);
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
        const rowValues = pieceToRow(piece, lastMappingRef.current);
        const endCol = colToLetter(rowValues.length);
        await appendRows(config.spreadsheetId, `${TAB}!A:${endCol}`, [rowValues]);
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
        const rowValues = pieceToRow(piece, lastMappingRef.current);
        const endCol = colToLetter(rowValues.length);
        const range = `${TAB}!A${piece.rowIndex}:${endCol}${piece.rowIndex}`;
        await updateRange(config.spreadsheetId, range, [rowValues]);
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
      // 1. Otimista: remove imediatamente da UI e da cache!
      setPieces((prev) => {
        const next = prev.filter((p) => p.id !== piece.id && p.rowIndex !== piece.rowIndex);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });

      if (!config) return;
      const sheetId = getSheetId(TAB);
      if (sheetId === undefined) { toast.error('Aba não encontrada'); return; }
      const toastId = toast.loading('A eliminar...');
      try {
        await deleteRow(config.spreadsheetId, sheetId, piece.rowIndex - 1, TAB);
        toast.success('Peça eliminada!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
        await load();
      }
    },
    [config, getSheetId, load]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    const rows = await readRange(config.spreadsheetId, `${TAB}!A1:Z1`);
    if (!rows.length || !rows[0].some((c) => /t[ií]tulo/i.test(c))) {
      await updateRange(config.spreadsheetId, `${TAB}!A1:${colToLetter(DEFAULT_HEADER.length)}1`, [DEFAULT_HEADER]);
    }
  }, [config]);

  return { pieces, isLoading, load, add, update, remove, ensureHeader };
}
