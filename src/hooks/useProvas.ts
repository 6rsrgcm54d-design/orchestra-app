import { useState, useCallback, useRef } from 'react';
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
  'Timbre',
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

export function colToLetter(col: number): string {
  let temp = col;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter || 'A';
}

export function parseScoreVal(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const str = String(val).trim();
  if (str === '' || str === '—' || str === '-') return null;

  // Remove % se houver e normaliza vírgula para ponto
  const clean = str.replace('%', '').trim().replace(',', '.');
  if (clean === '') return null;

  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  // Se veio do Sheets em formato decimal (ex: 0.45 para 45, 0.7 para 70, 0.85 para 85, ou 1 para 100)
  if (num > 0 && num <= 1 && (clean.includes('.') || clean === '1')) {
    return Math.min(100, Math.max(0, Math.round(num * 100)));
  }

  // Número normal 0-100 (ex: 45, 70, 85, 100)
  return Math.min(100, Math.max(0, Math.round(num)));
}

export const parsePercentVal = parseScoreVal;

export function formatScoreForSheet(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '';
  const rounded = Math.min(100, Math.max(0, Math.round(val)));
  return String(rounded);
}

export interface HeaderMapping {
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
  colTimbre: number;
  colClassificacao: number;
  rawHeader: string[];
}

export function parseHeader(headerRow: string[] = []): HeaderMapping {
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
  const colTimbre = findCol((c) => c.includes('timbre'));
  const colClassificacao = findCol(
    (c) => c.includes('classifica') || c.includes('final') || c.includes('nota') || c.includes('media')
  );

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
    colTimbre,
    colClassificacao,
    rawHeader: headerRow,
  };
}

export function buildRowValues(
  student: { numero?: string; nome: string; naipe?: string; orquestra?: string },
  params: {
    afinacao?: number | null;
    precisaoRitmica?: number | null;
    tempo?: number | null;
    articulacao?: number | null;
    dinamicas?: number | null;
    fraseado?: number | null;
    timbre?: number | null;
    classificacaoFinal?: number | null;
  },
  mapping: HeaderMapping,
  rowIndex: number
): string[] {
  const colCount = Math.max(mapping.rawHeader.length, PROVAS_HEADER.length);
  const row: string[] = new Array(colCount).fill('');

  const finalScore =
    params.classificacaoFinal !== undefined && params.classificacaoFinal !== null
      ? params.classificacaoFinal
      : calcClassificacaoFinal(params);

  const setVal = (idx: number, val: string) => {
    if (idx >= 0 && idx < colCount) row[idx] = val;
  };

  const colOrdem = mapping.colOrdem >= 0 ? mapping.colOrdem : 0;
  const colNome = mapping.colNome >= 0 ? mapping.colNome : 1;
  const colNaipe = mapping.colNaipe >= 0 ? mapping.colNaipe : 2;
  const colOrquestra = mapping.colOrquestra >= 0 ? mapping.colOrquestra : 3;
  const colAfinacao = mapping.colAfinacao >= 0 ? mapping.colAfinacao : 4;
  const colPrecisao = mapping.colPrecisao >= 0 ? mapping.colPrecisao : 5;
  const colTempo = mapping.colTempo >= 0 ? mapping.colTempo : 6;
  const colArticulacao = mapping.colArticulacao >= 0 ? mapping.colArticulacao : 7;
  const colDinamicas = mapping.colDinamicas >= 0 ? mapping.colDinamicas : 8;
  const colFraseado = mapping.colFraseado >= 0 ? mapping.colFraseado : 9;
  const colTimbre = mapping.colTimbre >= 0 ? mapping.colTimbre : 10;
  const colClassificacao = mapping.colClassificacao >= 0 ? mapping.colClassificacao : 11;

  setVal(colOrdem, student.numero || (rowIndex > 1 ? String(rowIndex - 1) : ''));
  setVal(colNome, student.nome);
  setVal(colNaipe, student.naipe || '');
  setVal(colOrquestra, student.orquestra || '');
  setVal(colAfinacao, formatScoreForSheet(params.afinacao));
  setVal(colPrecisao, formatScoreForSheet(params.precisaoRitmica));
  setVal(colTempo, formatScoreForSheet(params.tempo));
  setVal(colArticulacao, formatScoreForSheet(params.articulacao));
  setVal(colDinamicas, formatScoreForSheet(params.dinamicas));
  setVal(colFraseado, formatScoreForSheet(params.fraseado));
  setVal(colTimbre, formatScoreForSheet(params.timbre));
  setVal(colClassificacao, formatScoreForSheet(finalScore));

  return row;
}

function rowToProva(row: string[], rowIndex: number, mapping: HeaderMapping): ProvaRecord {
  const ordem = mapping.colOrdem !== -1 ? (row[mapping.colOrdem] || '').trim() : '';
  const nomeAluno = mapping.colNome !== -1 ? (row[mapping.colNome] || '').trim() : '';
  const naipe = mapping.colNaipe !== -1 ? (row[mapping.colNaipe] || '').trim() : '';
  const rawOrquestra = mapping.colOrquestra !== -1 ? (row[mapping.colOrquestra] || '').trim() : '';
  const orquestra = /^10[º°]?\s*ano$/i.test(rawOrquestra) ? 'Orquestra 10º ano' : rawOrquestra;
  const afinacao = mapping.colAfinacao !== -1 ? parsePercentVal(row[mapping.colAfinacao]) : null;
  const precisaoRitmica = mapping.colPrecisao !== -1 ? parsePercentVal(row[mapping.colPrecisao]) : null;
  const tempo = mapping.colTempo !== -1 ? parsePercentVal(row[mapping.colTempo]) : null;
  const articulacao = mapping.colArticulacao !== -1 ? parsePercentVal(row[mapping.colArticulacao]) : null;
  const dinamicas = mapping.colDinamicas !== -1 ? parsePercentVal(row[mapping.colDinamicas]) : null;
  const fraseado = mapping.colFraseado !== -1 ? parsePercentVal(row[mapping.colFraseado]) : null;
  const timbre = mapping.colTimbre !== -1 ? parsePercentVal(row[mapping.colTimbre]) : null;
  let classificacaoFinal = mapping.colClassificacao !== -1 ? parsePercentVal(row[mapping.colClassificacao]) : null;

  if (classificacaoFinal === null) {
    classificacaoFinal = calcClassificacaoFinal({
      afinacao,
      precisaoRitmica,
      tempo,
      articulacao,
      dinamicas,
      fraseado,
      timbre,
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
    timbre,
    classificacaoFinal,
  };
}

const CACHE_PROVAS_KEY = 'orchestra_cache_provas';

function getInitialProvas(): ProvaRecord[] {
  const saved = safeStorage.getItem(CACHE_PROVAS_KEY);
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function useProvas() {
  const { config, sheetsMeta, refreshMeta } = useSheets();
  const [provas, setProvas] = useState<ProvaRecord[]>(getInitialProvas);
  const [isLoading, setIsLoading] = useState(false);
  const lastMappingRef = useRef<HeaderMapping>(parseHeader(PROVAS_HEADER));

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
      // Lê até coluna Z para abranger todas as colunas
      const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:Z'));
      if (rows.length > 0) {
        let headerRow = rows[0];
        let mapping = parseHeader(headerRow);

        // Se o cabeçalho não tem afinação ou classificação, atualiza com o cabeçalho padrão
        if (mapping.colAfinacao === -1 || mapping.colClassificacao === -1) {
          headerRow = PROVAS_HEADER;
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A1:${colToLetter(PROVAS_HEADER.length)}1`), [PROVAS_HEADER]);
          mapping = parseHeader(headerRow);
        }

        lastMappingRef.current = mapping;

        const loaded = rows
          .slice(1)
          .map((row, i) => rowToProva(row, i + 2, mapping))
          .filter(
            (p) =>
              p.classificacaoFinal !== null ||
              p.afinacao !== null ||
              p.precisaoRitmica !== null ||
              p.tempo !== null ||
              p.timbre !== null
          );

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
        timbre?: number | null;
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
          timbre: params.timbre ?? null,
          classificacaoFinal: finalScore,
        };
        updateLocalProva(updated);
      }

      if (!config) return;

      try {
        let mapping = lastMappingRef.current;
        let targetRowIndex = rowIndex || -1;

        // Se ainda não temos o targetRowIndex ou o mapping não tem colunas, consulta o cabeçalho
        if (targetRowIndex <= 1) {
          const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:Z'));
          if (rows.length > 0) {
            mapping = parseHeader(rows[0]);
            lastMappingRef.current = mapping;
          }
          if (rows.length > 1) {
            const targetName = student.nome.trim().toLowerCase();
            const targetOrch = (student.orquestra || '').trim().toLowerCase();
            const normOrch = (o: string) => /^10[º°]?\s*ano$/i.test(o.trim()) ? 'orquestra 10º ano' : o.trim().toLowerCase();
            for (let i = 1; i < rows.length; i++) {
              const rName = (rows[i][mapping.colNome !== -1 ? mapping.colNome : 1] || '').trim().toLowerCase();
              const rOrch = (rows[i][mapping.colOrquestra !== -1 ? mapping.colOrquestra : 3] || '').trim().toLowerCase();
              if (rName === targetName && (!targetOrch || !rOrch || normOrch(rOrch) === normOrch(targetOrch))) {
                targetRowIndex = i + 1; // 1-based
                break;
              }
            }
          }
        }

        const rowValues = buildRowValues(student, params, mapping, targetRowIndex);
        const endColLetter = colToLetter(rowValues.length);

        if (targetRowIndex > 1) {
          await updateRange(
            config.spreadsheetId,
            formatSheetRange(tabName, `A${targetRowIndex}:${endColLetter}${targetRowIndex}`),
            [rowValues]
          );
        } else if (!isClearing) {
          await appendRows(config.spreadsheetId, formatSheetRange(tabName, `A:${endColLetter}`), [rowValues]);
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
        (p) =>
          p.classificacaoFinal !== null ||
          p.afinacao !== null ||
          p.precisaoRitmica !== null ||
          p.timbre !== null
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

        // Lê o cabeçalho existente para respeitar a disposição de colunas do utilizador
        const existingData = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:Z'));
        let mapping = existingData.length > 0 ? parseHeader(existingData[0]) : parseHeader(PROVAS_HEADER);
        lastMappingRef.current = mapping;

        const headerRow = mapping.rawHeader.length >= 10 ? mapping.rawHeader : PROVAS_HEADER;

        // Mapa de provas existentes por aluno
        const provaMap = new Map<string, ProvaRecord>();
        validProvas.forEach((p) => {
          const key = `${(p.nomeAluno || '').trim().toLowerCase()}|${(p.orquestra || '').trim().toLowerCase()}`;
          provaMap.set(key, p);
          provaMap.set((p.nomeAluno || '').trim().toLowerCase(), p);
        });

        const rows: string[][] = [headerRow];

        // Garante que todos os alunos são preservados
        let studentRoster = allStudents;
        if (!studentRoster || studentRoster.length === 0) {
          if (existingData.length > 1) {
            studentRoster = existingData.slice(1).map((r, i) => ({
              id: `sheet-student-${i + 1}`,
              rowIndex: i + 2,
              numero: mapping.colOrdem !== -1 && r[mapping.colOrdem] ? r[mapping.colOrdem] : String(i + 1),
              nome: mapping.colNome !== -1 && r[mapping.colNome] ? r[mapping.colNome] : r[1] || '',
              chefeNaipe: '',
              grau: '',
              naipe: mapping.colNaipe !== -1 && r[mapping.colNaipe] ? r[mapping.colNaipe] : '',
              orquestra: mapping.colOrquestra !== -1 && r[mapping.colOrquestra] ? (/^10[º°]?\s*ano$/i.test(r[mapping.colOrquestra].trim()) ? 'Orquestra 10º ano' : r[mapping.colOrquestra]) : '',
            }));
          }
        }

        if (studentRoster && studentRoster.length > 0) {
          studentRoster.forEach((s, idx) => {
            const key = `${(s.nome || '').trim().toLowerCase()}|${(s.orquestra || '').trim().toLowerCase()}`;
            const p = provaMap.get(key) || provaMap.get((s.nome || '').trim().toLowerCase());
            const row = buildRowValues(
              s,
              {
                afinacao: p?.afinacao ?? null,
                precisaoRitmica: p?.precisaoRitmica ?? null,
                tempo: p?.tempo ?? null,
                articulacao: p?.articulacao ?? null,
                dinamicas: p?.dinamicas ?? null,
                fraseado: p?.fraseado ?? null,
                timbre: p?.timbre ?? null,
                classificacaoFinal: p?.classificacaoFinal ?? null,
              },
              mapping,
              idx + 2
            );
            rows.push(row);
          });
        }

        const endColLetter = colToLetter(rows[0].length);
        await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A1:${endColLetter}${rows.length}`), rows);
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
      const evalRows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:Z1'));
      if (!evalRows.length || !evalRows[0].some((c) => /afina/i.test(c))) {
        await updateRange(
          config.spreadsheetId,
          formatSheetRange(tabName, `A1:${colToLetter(PROVAS_HEADER.length)}1`),
          [PROVAS_HEADER]
        );
      } else {
        const header = evalRows[0];
        const hasTimbre = header.some((c) => /timbre/i.test(c));
        if (!hasTimbre) {
          const classIdx = header.findIndex((c) => /classifica|final/i.test(c));
          const newHeader = [...header];
          if (classIdx >= 0) {
            newHeader.splice(classIdx, 0, 'Timbre');
          } else {
            newHeader.push('Timbre');
          }
          await updateRange(
            config.spreadsheetId,
            formatSheetRange(tabName, `A1:${colToLetter(newHeader.length)}1`),
            [newHeader]
          );
        }
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
