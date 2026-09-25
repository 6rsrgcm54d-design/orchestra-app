import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  readRange,
  appendRows,
  updateRange,
  ensureSheetExists,
  isAppsScript,
  isLocalId,
  INITIAL_LOCAL_DATA,
} from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { ProvaRecord, Student, SheetsMeta, SheetItem } from '../types';
import { calcClassificacaoFinal } from '../types';
import { safeStorage } from '../utils/storage';

const DEFAULT_PROVAS_TAB = 'Provas';

export const PROVAS_HEADER = [
  'Ordem',
  'Nome Aluno',
  'Naipe',
  'Orquestra',
  'Afinação',
  'Precisão Rítmica',
  'Tempo',
  'Articulação',
  'Dinâmicas',
  'Fraseado',
  'Classificação final',
];

export function getProvasTabName(sheetsMeta?: SheetsMeta | null): string {
  if (!sheetsMeta?.sheets?.length) return DEFAULT_PROVAS_TAB;
  const found = sheetsMeta.sheets.find((s: SheetItem) => {
    const t = (s.properties.title || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return t === 'provas' || t.includes('prova');
  });
  return found ? found.properties.title : DEFAULT_PROVAS_TAB;
}

export function formatSheetRange(tab: string, range: string): string {
  const clean = tab.replace(/^'+|'+$/g, '').trim();
  return `'${clean}'!${range}`;
}

export function parsePercentVal(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const clean = String(val).replace('%', '').trim();
  if (clean === '') return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.min(100, Math.max(0, num));
}

interface HeaderMapping {
  colOrdem: number;
  colNome: number;
  colNaipe: number;
  colOrquestra: number;
  colAfinacao: number;
  colPrecisao: number;
  colTempo: number;
  colArticulacao: number;
  colDinamicas: number;
  colFraseado: number;
  colClassificacao: number;
}

function parseHeader(headerRow: string[]): HeaderMapping {
  const norm = headerRow.map((c) =>
    (c || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );
  const findCol = (predicate: (col: string) => boolean) => norm.findIndex(predicate);

  const colOrdem = findCol((c) => c.includes('ordem') || c === '#' || c === 'nº' || c === 'no');
  const colNome = findCol((c) => c.includes('nome') || c.includes('aluno'));
  const colNaipe = findCol((c) => c.includes('naipe') || c.includes('instrumento'));
  const colOrquestra = findCol((c) => c.includes('orquestra'));
  const colAfinacao = findCol((c) => c.includes('afina'));
  const colPrecisao = findCol((c) => c.includes('precisa') || c.includes('ritm'));
  const colTempo = findCol((c) => c === 'tempo' || c.includes('tempo'));
  const colArticulacao = findCol((c) => c.includes('articula'));
  const colDinamicas = findCol((c) => c.includes('dinamica'));
  const colFraseado = findCol((c) => c.includes('frase'));
  const colClassificacao = findCol((c) => c.includes('classifica') || c.includes('final') || c.includes('nota') || c.includes('media'));

  return {
    colOrdem,
    colNome,
    colNaipe,
    colOrquestra,
    colAfinacao,
    colPrecisao,
    colTempo,
    colArticulacao,
    colDinamicas,
    colFraseado,
    colClassificacao,
  };
}

function rowToProva(row: string[], rowIndex: number, mapping: HeaderMapping): ProvaRecord {
  const ordem = mapping.colOrdem !== -1 ? (row[mapping.colOrdem] || '').trim() : '';
  const nomeAluno = mapping.colNome !== -1 ? (row[mapping.colNome] || '').trim() : '';
  const naipe = mapping.colNaipe !== -1 ? (row[mapping.colNaipe] || '').trim() : '';
  const orquestra = mapping.colOrquestra !== -1 ? (row[mapping.colOrquestra] || '').trim() : '';
  const afinacao = mapping.colAfinacao !== -1 ? parsePercentVal(row[mapping.colAfinacao]) : null;
  const precisaoRitmica = mapping.colPrecisao !== -1 ? parsePercentVal(row[mapping.colPrecisao]) : null;
  const tempo = mapping.colTempo !== -1 ? parsePercentVal(row[mapping.colTempo]) : null;
  const articulacao = mapping.colArticulacao !== -1 ? parsePercentVal(row[mapping.colArticulacao]) : null;
  const dinamicas = mapping.colDinamicas !== -1 ? parsePercentVal(row[mapping.colDinamicas]) : null;
  const fraseado = mapping.colFraseado !== -1 ? parsePercentVal(row[mapping.colFraseado]) : null;
  let classificacaoFinal = mapping.colClassificacao !== -1 ? parsePercentVal(row[mapping.colClassificacao]) : null;

  if (classificacaoFinal === null) {
    classificacaoFinal = calcClassificacaoFinal({
      afinacao,
      precisaoRitmica,
      tempo,
      articulacao,
      dinamicas,
      fraseado,
    });
  }

  return {
    id: `prova-${rowIndex}-${nomeAluno.toLowerCase().replace(/\s+/g, '-') || rowIndex}`,
    rowIndex,
    ordem,
    nomeAluno,
    naipe,
    orquestra,
    afinacao,
    precisaoRitmica,
    tempo,
    articulacao,
    dinamicas,
    fraseado,
    classificacaoFinal,
  };
}

const CACHE_PROVAS_KEY = 'orchestra_cache_provas';

function getInitialProvas(): ProvaRecord[] {
  const saved = safeStorage.getItem(CACHE_PROVAS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Provas'] || [];
  if (raw.length > 1) {
    const mapping = parseHeader(raw[0]);
    const list = raw
      .slice(1)
      .map((row, i) => rowToProva(row, i + 2, mapping))
      .filter((p) => p.classificacaoFinal !== null || p.afinacao !== null || p.precisaoRitmica !== null);
    safeStorage.setItem(CACHE_PROVAS_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

export function useProvas() {
  const { config, sheetsMeta, refreshMeta } = useSheets();
  const [provas, setProvas] = useState<ProvaRecord[]>(getInitialProvas);
  const [isLoading, setIsLoading] = useState(false);

  // Garante que a aba 'Provas' existe no Google Sheets
  const ensureTabExists = useCallback(async (): Promise<string> => {
    if (!config) return DEFAULT_PROVAS_TAB;
    const tabName = getProvasTabName(sheetsMeta);
    if (!isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
      if (sheetsMeta && !sheetsMeta.sheets.some((s) => s.properties.title.toLowerCase() === tabName.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, tabName);
          await refreshMeta();
        } catch (e) {
          console.warn('Erro ao criar aba Provas:', e);
        }
      }
    }
    return tabName;
  }, [config, sheetsMeta, refreshMeta]);

  // Carrega as provas do Google Sheets
  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const tabName = await ensureTabExists();
      const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:K'));
      if (rows.length > 0) {
        let headerRow = rows[0];
        const mapping = parseHeader(headerRow);

        // Se o cabeçalho não tem classificação ou afinação, atualiza com o cabeçalho padrão de 11 colunas
        if (mapping.colAfinacao === -1 || mapping.colClassificacao === -1) {
          headerRow = PROVAS_HEADER;
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:K1'), [PROVAS_HEADER]);
        }

        const effectiveMapping = parseHeader(headerRow);
        const loaded = rows
          .slice(1)
          .map((row, i) => rowToProva(row, i + 2, effectiveMapping))
          .filter((p) => p.classificacaoFinal !== null || p.afinacao !== null || p.precisaoRitmica !== null || p.tempo !== null);

        setProvas(loaded);
        safeStorage.setItem(CACHE_PROVAS_KEY, JSON.stringify(loaded));
      }
    } catch (err) {
      toast.error(`Erro ao carregar provas: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, ensureTabExists]);

  // Atualização local imediata
  const updateLocalProva = useCallback((updated: ProvaRecord) => {
    setProvas((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.id === updated.id ||
          (p.nomeAluno.toLowerCase().trim() === updated.nomeAluno.toLowerCase().trim() &&
            (!p.orquestra || !updated.orquestra || p.orquestra.trim().toLowerCase() === updated.orquestra.trim().toLowerCase()))
      );
      let next: ProvaRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], ...updated };
      } else {
        next = [...prev, updated];
      }
      safeStorage.setItem(CACHE_PROVAS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Grava a prova de um aluno em tempo real no Google Sheets
  const saveSingleProva = useCallback(
    async (
      student: { numero?: string; nome: string; naipe?: string; orquestra?: string },
      params: {
        afinacao?: number | null;
        precisaoRitmica?: number | null;
        tempo?: number | null;
        articulacao?: number | null;
        dinamicas?: number | null;
        fraseado?: number | null;
      },
      rowIndex?: number
    ) => {
      const tabName = getProvasTabName(sheetsMeta);
      const finalScore = calcClassificacaoFinal(params);
      const isClearing = finalScore === null;

      // 1. Atualiza estado local imediatamente
      if (isClearing) {
        setProvas((prev) => {
          const next = prev.filter(
            (p) =>
              !(
                p.nomeAluno.trim().toLowerCase() === student.nome.trim().toLowerCase() &&
                (!p.orquestra || !student.orquestra || p.orquestra.trim().toLowerCase() === student.orquestra.trim().toLowerCase())
              )
          );
          safeStorage.setItem(CACHE_PROVAS_KEY, JSON.stringify(next));
          return next;
        });
      } else {
        const updated: ProvaRecord = {
          id: `prova-${student.nome.toLowerCase().replace(/\s+/g, '-')}`,
          rowIndex: rowIndex || -1,
          ordem: student.numero || '',
          nomeAluno: student.nome,
          naipe: student.naipe || '',
          orquestra: student.orquestra || '',
          afinacao: params.afinacao ?? null,
          precisaoRitmica: params.precisaoRitmica ?? null,
          tempo: params.tempo ?? null,
          articulacao: params.articulacao ?? null,
          dinamicas: params.dinamicas ?? null,
          fraseado: params.fraseado ?? null,
          classificacaoFinal: finalScore,
        };
        updateLocalProva(updated);
      }

      if (!config) return;

      try {
        // Se já tivermos o rowIndex da linha correspondente (> 1), escreve diretamente nessa linha
        if (rowIndex && rowIndex > 1) {
          const rowValues = [
            student.numero || String(rowIndex - 1),
            student.nome,
            student.naipe || '',
            student.orquestra || '',
            params.afinacao !== null && params.afinacao !== undefined ? `${params.afinacao}%` : '',
            params.precisaoRitmica !== null && params.precisaoRitmica !== undefined ? `${params.precisaoRitmica}%` : '',
            params.tempo !== null && params.tempo !== undefined ? `${params.tempo}%` : '',
            params.articulacao !== null && params.articulacao !== undefined ? `${params.articulacao}%` : '',
            params.dinamicas !== null && params.dinamicas !== undefined ? `${params.dinamicas}%` : '',
            params.fraseado !== null && params.fraseado !== undefined ? `${params.fraseado}%` : '',
            finalScore !== null ? `${finalScore}%` : '',
          ];
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${rowIndex}:K${rowIndex}`), [rowValues]);
          return;
        }

        // Caso contrário, procura na folha a linha com o nome do aluno
        const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:K'));
        let targetRowIndex = -1;
        const mapping = rows.length > 0 ? parseHeader(rows[0]) : parseHeader(PROVAS_HEADER);

        if (rows.length > 1) {
          const targetName = student.nome.trim().toLowerCase();
          const targetOrch = (student.orquestra || '').trim().toLowerCase();
          for (let i = 1; i < rows.length; i++) {
            const rName = (rows[i][mapping.colNome !== -1 ? mapping.colNome : 1] || '').trim().toLowerCase();
            const rOrch = (rows[i][mapping.colOrquestra !== -1 ? mapping.colOrquestra : 3] || '').trim().toLowerCase();
            if (rName === targetName && (!targetOrch || !rOrch || rOrch === targetOrch)) {
              targetRowIndex = i + 1; // 1-based
              break;
            }
          }
        }

        const rowValues = [
          student.numero || (targetRowIndex > 1 ? String(targetRowIndex - 1) : ''),
          student.nome,
          student.naipe || '',
          student.orquestra || '',
          params.afinacao !== null && params.afinacao !== undefined ? `${params.afinacao}%` : '',
          params.precisaoRitmica !== null && params.precisaoRitmica !== undefined ? `${params.precisaoRitmica}%` : '',
          params.tempo !== null && params.tempo !== undefined ? `${params.tempo}%` : '',
          params.articulacao !== null && params.articulacao !== undefined ? `${params.articulacao}%` : '',
          params.dinamicas !== null && params.dinamicas !== undefined ? `${params.dinamicas}%` : '',
          params.fraseado !== null && params.fraseado !== undefined ? `${params.fraseado}%` : '',
          finalScore !== null ? `${finalScore}%` : '',
        ];

        if (targetRowIndex > 1) {
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${targetRowIndex}:K${targetRowIndex}`), [rowValues]);
        } else if (!isClearing) {
          await appendRows(config.spreadsheetId, formatSheetRange(tabName, 'A:K'), [rowValues]);
        }
      } catch (err) {
        console.error('Erro ao guardar prova no Sheets:', err);
        toast.error(`Erro ao guardar no Google Sheets: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [config, sheetsMeta, updateLocalProva]
  );

  // Guarda todas as provas no Google Sheets (sincronizando todos os alunos)
  const saveAllProvas = useCallback(
    async (provasToSave: ProvaRecord[], allStudents?: Student[]) => {
      const validProvas = provasToSave.filter(
        (p) => p.classificacaoFinal !== null || p.afinacao !== null || p.precisaoRitmica !== null
      );
      setProvas(validProvas);
      safeStorage.setItem(CACHE_PROVAS_KEY, JSON.stringify(validProvas));

      if (!config) {
        toast.success('Provas guardadas localmente!');
        return;
      }

      const toastId = toast.loading('A guardar provas no Google Sheets...');
      try {
        const tabName = await ensureTabExists();

        // Mapa de provas existentes por aluno
        const provaMap = new Map<string, ProvaRecord>();
        validProvas.forEach((p) => {
          const key = `${(p.nomeAluno || '').trim().toLowerCase()}|${(p.orquestra || '').trim().toLowerCase()}`;
          provaMap.set(key, p);
          provaMap.set((p.nomeAluno || '').trim().toLowerCase(), p);
        });

        const rows: string[][] = [PROVAS_HEADER];

        // Garante que todos os alunos são preservados
        let studentRoster = allStudents;
        if (!studentRoster || studentRoster.length === 0) {
          const existingRows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:D'));
          if (existingRows.length > 1) {
            const m = parseHeader(existingRows[0]);
            studentRoster = existingRows.slice(1).map((r, i) => ({
              id: `sheet-student-${i + 1}`,
              rowIndex: i + 2,
              numero: m.colOrdem !== -1 && r[m.colOrdem] ? r[m.colOrdem] : String(i + 1),
              nome: m.colNome !== -1 && r[m.colNome] ? r[m.colNome] : r[1] || '',
              chefeNaipe: '',
              grau: '',
              naipe: m.colNaipe !== -1 && r[m.colNaipe] ? r[m.colNaipe] : '',
              orquestra: m.colOrquestra !== -1 && r[m.colOrquestra] ? r[m.colOrquestra] : '',
            }));
          }
        }

        if (studentRoster && studentRoster.length > 0) {
          studentRoster.forEach((s, idx) => {
            const key = `${(s.nome || '').trim().toLowerCase()}|${(s.orquestra || '').trim().toLowerCase()}`;
            const p = provaMap.get(key) || provaMap.get((s.nome || '').trim().toLowerCase());
            rows.push([
              s.numero || String(idx + 1),
              s.nome,
              s.naipe || '',
              s.orquestra || '',
              p && p.afinacao !== null && p.afinacao !== undefined ? `${p.afinacao}%` : '',
              p && p.precisaoRitmica !== null && p.precisaoRitmica !== undefined ? `${p.precisaoRitmica}%` : '',
              p && p.tempo !== null && p.tempo !== undefined ? `${p.tempo}%` : '',
              p && p.articulacao !== null && p.articulacao !== undefined ? `${p.articulacao}%` : '',
              p && p.dinamicas !== null && p.dinamicas !== undefined ? `${p.dinamicas}%` : '',
              p && p.fraseado !== null && p.fraseado !== undefined ? `${p.fraseado}%` : '',
              p && p.classificacaoFinal !== null && p.classificacaoFinal !== undefined ? `${p.classificacaoFinal}%` : '',
            ]);
          });
        }

        await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A1:K${rows.length}`), rows);
        toast.success(`${rows.length - 1} provas sincronizadas no Google Sheets!`, { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro ao guardar provas: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, ensureTabExists, load]
  );

  const ensureHeaders = useCallback(async () => {
    if (!config) return;
    try {
      const tabName = await ensureTabExists();
      const evalRows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:K1'));
      if (!evalRows.length || !evalRows[0].some((c) => /afina/i.test(c))) {
        await updateRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:K1'), [PROVAS_HEADER]);
      }
    } catch {
      // Ignora erro inicial
    }
  }, [config, ensureTabExists]);

  return {
    provas,
    isLoading,
    load,
    updateLocalProva,
    saveSingleProva,
    saveAllProvas,
    ensureHeaders,
  };
}
