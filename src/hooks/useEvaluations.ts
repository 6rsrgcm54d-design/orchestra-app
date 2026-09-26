import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, updateRange, ensureSheetExists, isAppsScript, isLocalId, INITIAL_LOCAL_DATA } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Evaluation, Criteria, Student, SheetsMeta, SheetItem } from '../types';
import { safeStorage } from '../utils/storage';
import {
  getStoredLevelTemplates,
  saveStoredLevelTemplates,
  DEFAULT_LEVEL_TEMPLATES,
} from '../utils/nameParser';

const DEFAULT_EVAL_TAB = 'Avaliações';
const CRIT_TAB = 'Critérios';

export const USER_EVAL_HEADER = [
  'Ordem',
  'Nome Aluno',
  'Grau',
  'Naipe',
  'Orquestra',
  'Nível',
  'Observações',
];

export function getEvalTabName(sheetsMeta?: SheetsMeta | null): string {
  if (!sheetsMeta?.sheets?.length) return DEFAULT_EVAL_TAB;
  const found = sheetsMeta.sheets.find((s: SheetItem) => {
    const t = (s.properties.title || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return t.includes('avaliac') || t.includes('avaliacao');
  });
  return found ? found.properties.title : DEFAULT_EVAL_TAB;
}

export function formatSheetRange(tab: string, range: string): string {
  const clean = tab.replace(/^'+|'+$/g, '').trim();
  return `'${clean}'!${range}`;
}

interface HeaderMapping {
  colOrdem: number;
  colNome: number;
  colGrau: number;
  colNaipe: number;
  colOrquestra: number;
  colClassificacao: number;
  colObservacoes: number;
  colCriterio: number;
  colData: number;
  rawHeader: string[];
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

  const colOrdem = findCol((c) => c.includes('ordem') || c === '#' || c === 'nº' || c === 'numero' || c === 'no');
  const colNome = findCol((c) => c.includes('nome') || c.includes('aluno'));
  const colGrau = findCol((c) => c.includes('grau') || c.includes('ano'));
  const colNaipe = findCol((c) => c.includes('naipe') || c.includes('instrumento'));
  const colOrquestra = findCol((c) => c.includes('orquestra'));
  const colClassificacao = findCol(
    (c) =>
      c.includes('nivel') ||
      c.includes('classifica') ||
      c.includes('pontua') ||
      c.includes('nota')
  );
  const colObservacoes = findCol((c) => c.includes('observa') || c.includes('notas'));
  const colCriterio = findCol((c) => c.includes('criter'));
  const colData = findCol((c) => c.includes('data'));

  return {
    colOrdem,
    colNome,
    colGrau,
    colNaipe,
    colOrquestra,
    colClassificacao,
    colObservacoes,
    colCriterio,
    colData,
    rawHeader: headerRow,
  };
}

function deduceScore(obs: string): number {
  if (!obs) return 0;
  const lower = obs.toLowerCase();
  if (lower.includes('excelente') || /^[5]\b/.test(obs.trim())) return 5;
  if (lower.includes('muito bom') || /^[4]\b/.test(obs.trim())) return 4;
  if (lower.includes('satisfat') || /^[3]\b/.test(obs.trim())) return 3;
  if (lower.includes('insuficiente') || lower.includes('dificuldade') || /^[2]\b/.test(obs.trim())) return 2;
  if (lower.includes('muito fraco') || lower.includes('não atingiu') || lower.includes('nao atingiu') || /^[1]\b/.test(obs.trim())) return 1;
  return 0;
}

function rowToEvaluation(row: string[], rowIndex: number, mapping: HeaderMapping): Evaluation {
  const nomeAluno = mapping.colNome !== -1 ? (row[mapping.colNome] ?? '').trim() : '';
  const ordem = mapping.colOrdem !== -1 ? (row[mapping.colOrdem] ?? '').trim() : '';
  const grau = mapping.colGrau !== -1 ? (row[mapping.colGrau] ?? '').trim() : '';
  const naipe = mapping.colNaipe !== -1 ? (row[mapping.colNaipe] ?? '').trim() : '';
  const rawOrquestra = mapping.colOrquestra !== -1 ? (row[mapping.colOrquestra] ?? '').trim() : '';
  const orquestra = /^10[º°]?\s*ano$/i.test(rawOrquestra) ? 'Orquestra 10º ano' : rawOrquestra;
  const observacoes = mapping.colObservacoes !== -1 ? (row[mapping.colObservacoes] ?? '').trim() : '';
  const criterio = mapping.colCriterio !== -1 ? (row[mapping.colCriterio] ?? '').trim() : '';
  const data = mapping.colData !== -1 ? (row[mapping.colData] ?? '').trim() : '';

  let pontuacao = 0;
  if (mapping.colClassificacao !== -1 && row[mapping.colClassificacao]) {
    pontuacao = parseInt(row[mapping.colClassificacao], 10) || 0;
  }
  if (!pontuacao && observacoes) {
    pontuacao = deduceScore(observacoes);
  }

  return {
    id: `eval-${rowIndex}-${nomeAluno.toLowerCase().replace(/\s+/g, '-') || rowIndex}`,
    rowIndex,
    ordem,
    nomeAluno,
    grau,
    naipe,
    orquestra,
    criterio,
    pontuacao,
    data: data || new Date().toISOString().split('T')[0],
    observacoes,
  };
}

function rowToCriteria(row: string[], rowIndex: number): Criteria {
  return {
    id: `crit-${rowIndex}`,
    rowIndex,
    nome: row[0] ?? '',
    descricao: row[1] ?? '',
    peso: parseFloat(row[2] ?? '1'),
  };
}

const CACHE_EVALS_KEY = 'orchestra_cache_evaluations';
const CACHE_CRIT_KEY = 'orchestra_cache_criteria';

function getInitialEvaluations(): Evaluation[] {
  const saved = safeStorage.getItem(CACHE_EVALS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Avaliações'] || [];
  if (raw.length > 1) {
    const mapping = parseHeader(raw[0]);
    const list = raw
      .slice(1)
      .map((row, i) => rowToEvaluation(row, i + 2, mapping))
      .filter((ev) => ev.pontuacao > 0 || (ev.observacoes && ev.observacoes.trim().length > 0));
    safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

function getInitialCriteria(): Criteria[] {
  const saved = safeStorage.getItem(CACHE_CRIT_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Critérios'] || [];
  if (raw.length > 1) {
    const list = raw.slice(1).map((row, i) => rowToCriteria(row, i + 2));
    safeStorage.setItem(CACHE_CRIT_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

export function useEvaluations() {
  const { config, sheetsMeta, getSheetId, refreshMeta } = useSheets();
  const [evaluations, setEvaluations] = useState<Evaluation[]>(getInitialEvaluations);
  const [criteria, setCriteria] = useState<Criteria[]>(getInitialCriteria);
  const [levelTemplates, setLevelTemplates] = useState<Record<number, string>>(getStoredLevelTemplates);
  const [detectedHeader, setDetectedHeader] = useState<string[]>(USER_EVAL_HEADER);
  const [isLoading, setIsLoading] = useState(false);

  const evalTab = getEvalTabName(sheetsMeta);

  // Garante que a aba existe no Google Sheets
  const ensureTabExists = useCallback(async (): Promise<string> => {
    if (!config) return DEFAULT_EVAL_TAB;
    const tabName = getEvalTabName(sheetsMeta);
    if (!isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
      if (sheetsMeta && !sheetsMeta.sheets.some((s) => s.properties.title.toLowerCase() === tabName.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, tabName);
          await refreshMeta();
        } catch (e) {
          console.warn('Erro ao criar aba Avaliações:', e);
        }
      }
    }
    return tabName;
  }, [config, sheetsMeta, refreshMeta]);

  // Guarda novos modelos de observação (1 a 5)
  const saveLevelTemplates = useCallback(
    async (newTemplates: Record<number, string>) => {
      setLevelTemplates(newTemplates);
      saveStoredLevelTemplates(newTemplates);
      toast.success('Textos dos níveis guardados com sucesso!');

      if (!config) return;
      try {
        const critRows = [
          ['Nível', 'Observação Padrão'],
          ['5', newTemplates[5] || DEFAULT_LEVEL_TEMPLATES[5]],
          ['4', newTemplates[4] || DEFAULT_LEVEL_TEMPLATES[4]],
          ['3', newTemplates[3] || DEFAULT_LEVEL_TEMPLATES[3]],
          ['2', newTemplates[2] || DEFAULT_LEVEL_TEMPLATES[2]],
          ['1', newTemplates[1] || DEFAULT_LEVEL_TEMPLATES[1]],
        ];
        await updateRange(config.spreadsheetId, formatSheetRange(CRIT_TAB, 'A1:B6'), critRows);
      } catch {
        // Fallback silencioso
      }
    },
    [config]
  );

  const loadCriteria = useCallback(async () => {
    if (!config) return;
    try {
      const rows = await readRange(config.spreadsheetId, formatSheetRange(CRIT_TAB, 'A:C'));
      if (rows.length > 1) {
        const loadedTpls: Record<number, string> = { ...levelTemplates };
        let hasLevelTpls = false;
        rows.slice(1).forEach((r) => {
          const firstVal = (r[0] || '').trim();
          const lvlNum = parseInt(firstVal.replace(/\D/g, ''), 10);
          const tplText = (r[1] || '').trim();
          if (lvlNum >= 1 && lvlNum <= 5 && tplText) {
            loadedTpls[lvlNum] = tplText;
            hasLevelTpls = true;
          }
        });

        if (hasLevelTpls) {
          setLevelTemplates(loadedTpls);
          saveStoredLevelTemplates(loadedTpls);
        }

        const loadedCrit = rows.slice(1).map((row, i) => rowToCriteria(row, i + 2));
        setCriteria(loadedCrit);
        safeStorage.setItem(CACHE_CRIT_KEY, JSON.stringify(loadedCrit));
      }
    } catch {
      // Ignora erro se aba não existir
    }
  }, [config, levelTemplates]);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const tabName = await ensureTabExists();
      const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:G'));
      if (rows.length > 0) {
        let headerRow = rows[0];
        const mapping = parseHeader(headerRow);

        // Se a folha não tem coluna de nível, atualiza para o cabeçalho padrão com 'Nível'
        if (mapping.colClassificacao === -1) {
          headerRow = USER_EVAL_HEADER;
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:G1'), [USER_EVAL_HEADER]);
        }

        setDetectedHeader(headerRow);
        const effectiveMapping = parseHeader(headerRow);
        const loaded = rows
          .slice(1)
          .map((row, i) => rowToEvaluation(row, i + 2, effectiveMapping))
          .filter((ev) => ev.pontuacao > 0 || (ev.observacoes && ev.observacoes.trim().length > 0));

        setEvaluations(loaded);
        safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(loaded));
      }
      await loadCriteria();
    } catch (err) {
      toast.error(`Erro ao carregar avaliações: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, ensureTabExists, loadCriteria]);

  // Atualização local imediata
  const updateEvaluation = useCallback((updated: Evaluation) => {
    setEvaluations((prev) => {
      const idx = prev.findIndex(
        (e) =>
          e.id === updated.id ||
          (e.nomeAluno.toLowerCase().trim() === updated.nomeAluno.toLowerCase().trim() &&
            (!e.orquestra || !updated.orquestra || e.orquestra.trim().toLowerCase() === updated.orquestra.trim().toLowerCase()))
      );
      let next: Evaluation[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], ...updated };
      } else {
        next = [...prev, updated];
      }
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Gravação EM TEMPO REAL de um aluno no Google Sheets
  const saveSingleEvaluation = useCallback(
    async (
      student: { numero?: string; nome: string; grau?: string; naipe?: string; orquestra?: string },
      level: number,
      observacoes: string,
      rowIndex?: number
    ) => {
      const tabName = getEvalTabName(sheetsMeta);
      const isClearing = level <= 0 && (!observacoes || observacoes.trim().length === 0);

      // 1. Atualiza estado local imediatamente (UI super rápida)
      if (isClearing) {
        setEvaluations((prev) => {
          const next = prev.filter(
            (e) =>
              !(
                e.nomeAluno.trim().toLowerCase() === student.nome.trim().toLowerCase() &&
                (!e.orquestra || !student.orquestra || e.orquestra.trim().toLowerCase() === student.orquestra.trim().toLowerCase())
              )
          );
          safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(next));
          return next;
        });
      } else {
        const updatedEval: Evaluation = {
          id: `eval-${student.nome.toLowerCase().replace(/\s+/g, '-')}`,
          rowIndex: rowIndex || -1,
          ordem: student.numero || '',
          nomeAluno: student.nome,
          grau: student.grau || '',
          naipe: student.naipe || '',
          orquestra: student.orquestra || '',
          pontuacao: level,
          data: new Date().toISOString().split('T')[0],
          observacoes,
        };
        updateEvaluation(updatedEval);
      }

      if (!config) return;

      try {
        // Se já tivermos o rowIndex da linha correspondente (> 1), escreve diretamente nessa linha
        if (rowIndex && rowIndex > 1) {
          const rowValues = [
            student.numero || String(rowIndex - 1),
            student.nome,
            student.grau || '',
            student.naipe || '',
            student.orquestra || '',
            level > 0 ? String(level) : '',
            observacoes || '',
          ];
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${rowIndex}:G${rowIndex}`), [rowValues]);
          return;
        }

        // Caso contrário, procura na folha a linha com o nome do aluno
        const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:G'));
        let targetRowIndex = -1;
        const mapping = rows.length > 0 ? parseHeader(rows[0]) : parseHeader(USER_EVAL_HEADER);

        if (rows.length > 1) {
          const targetName = student.nome.trim().toLowerCase();
          const targetOrch = (student.orquestra || '').trim().toLowerCase();
          const normOrch = (o: string) => /^10[º°]?\s*ano$/i.test(o.trim()) ? 'orquestra 10º ano' : o.trim().toLowerCase();
          for (let i = 1; i < rows.length; i++) {
            const rName = (rows[i][mapping.colNome !== -1 ? mapping.colNome : 1] || '').trim().toLowerCase();
            const rOrch = (rows[i][mapping.colOrquestra !== -1 ? mapping.colOrquestra : 4] || '').trim().toLowerCase();
            if (rName === targetName && (!targetOrch || !rOrch || normOrch(rOrch) === normOrch(targetOrch))) {
              targetRowIndex = i + 1; // 1-based
              break;
            }
          }
        }

        const rowValues = [
          student.numero || (targetRowIndex > 1 ? String(targetRowIndex - 1) : ''),
          student.nome,
          student.grau || '',
          student.naipe || '',
          student.orquestra || '',
          level > 0 ? String(level) : '',
          observacoes || '',
        ];

        if (targetRowIndex > 1) {
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${targetRowIndex}:G${targetRowIndex}`), [rowValues]);
        } else if (!isClearing) {
          // Só adiciona linha se NÃO for para limpar
          await appendRows(config.spreadsheetId, formatSheetRange(tabName, 'A:G'), [rowValues]);
        }
      } catch (err) {
        console.error('Erro ao guardar avaliação no Sheets:', err);
        toast.error(`Erro ao guardar no Google Sheets: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [config, sheetsMeta, updateEvaluation]
  );

  // Guarda todas as avaliações no Google Sheets (sincronizando todos os alunos)
  const saveAllEvaluations = useCallback(
    async (evalsToSave: Evaluation[], allStudents?: Student[]) => {
      const validEvals = evalsToSave.filter(
        (ev) => (ev.pontuacao && ev.pontuacao > 0) || (ev.observacoes && ev.observacoes.trim().length > 0)
      );
      setEvaluations(validEvals);
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(validEvals));

      if (!config) {
        toast.success('Avaliações guardadas localmente!');
        return;
      }

      const toastId = toast.loading('A guardar no Google Sheets...');
      try {
        const tabName = await ensureTabExists();

        // Mapa de avaliações existentes por nome de aluno
        const evalMap = new Map<string, Evaluation>();
        validEvals.forEach((ev) => {
          const key = `${(ev.nomeAluno || '').trim().toLowerCase()}|${(ev.orquestra || '').trim().toLowerCase()}`;
          evalMap.set(key, ev);
          evalMap.set((ev.nomeAluno || '').trim().toLowerCase(), ev);
        });

        const rows: string[][] = [USER_EVAL_HEADER];

        // Garante que a lista de alunos contém todos os alunos (da memória ou da folha) para nunca apagar alunos
        let studentRoster = allStudents;
        if (!studentRoster || studentRoster.length === 0) {
          const existingRows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:G'));
          if (existingRows.length > 1) {
            const m = parseHeader(existingRows[0]);
            studentRoster = existingRows.slice(1).map((r, i) => ({
              id: `student-sheet-${i + 1}`,
              rowIndex: i + 2,
              numero: m.colOrdem !== -1 && r[m.colOrdem] ? r[m.colOrdem] : String(i + 1),
              nome: m.colNome !== -1 && r[m.colNome] ? r[m.colNome] : r[1] || '',
              chefeNaipe: '',
              grau: m.colGrau !== -1 && r[m.colGrau] ? r[m.colGrau] : '',
              naipe: m.colNaipe !== -1 && r[m.colNaipe] ? r[m.colNaipe] : '',
              orquestra: m.colOrquestra !== -1 && r[m.colOrquestra] ? (/^10[º°]?\s*ano$/i.test(r[m.colOrquestra].trim()) ? 'Orquestra 10º ano' : r[m.colOrquestra]) : '',
            }));
          }
        }

        if (studentRoster && studentRoster.length > 0) {
          // Preenche a tabela com todos os alunos: apenas Nível e Observações são atualizados/limpos
          studentRoster.forEach((s, idx) => {
            const key = `${(s.nome || '').trim().toLowerCase()}|${(s.orquestra || '').trim().toLowerCase()}`;
            const ev = evalMap.get(key) || evalMap.get((s.nome || '').trim().toLowerCase());
            rows.push([
              s.numero || String(idx + 1),
              s.nome,
              s.grau || '',
              s.naipe || '',
              s.orquestra || '',
              ev && ev.pontuacao > 0 ? String(ev.pontuacao) : '',
              ev ? ev.observacoes || '' : '',
            ]);
          });
        }

        await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A1:G${rows.length}`), rows);
        toast.success(`${rows.length - 1} registos sincronizados no Google Sheets!`, { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro ao guardar: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, ensureTabExists, load]
  );

  const addEvaluation = useCallback(
    async (ev: Omit<Evaluation, 'id' | 'rowIndex'>) => {
      const newEval: Evaluation = {
        ...ev,
        id: `eval-new-${Date.now()}`,
        rowIndex: evaluations.length + 2,
      };
      const updatedList = [...evaluations, newEval];
      await saveAllEvaluations(updatedList);
    },
    [evaluations, saveAllEvaluations]
  );

  const removeEvaluation = useCallback(
    async (ev: Evaluation) => {
      const matchEval = (e: Evaluation) =>
        e.id === ev.id ||
        (e.nomeAluno.trim().toLowerCase() === ev.nomeAluno.trim().toLowerCase() &&
          (!e.orquestra || !ev.orquestra || e.orquestra.trim().toLowerCase() === ev.orquestra.trim().toLowerCase()));

      const updatedList = evaluations.filter((e) => !matchEval(e));
      setEvaluations(updatedList);
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(updatedList));

      if (!config) {
        toast.success('Avaliação removida localmente.');
        return;
      }

      const tabName = getEvalTabName(sheetsMeta);
      try {
        const rowValues = [
          ev.ordem || (ev.rowIndex > 1 ? String(ev.rowIndex - 1) : ''),
          ev.nomeAluno,
          ev.grau || '',
          ev.naipe || '',
          ev.orquestra || '',
          '', // Nível limpo
          '', // Observações limpa
        ];

        if (ev.rowIndex > 1) {
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${ev.rowIndex}:G${ev.rowIndex}`), [rowValues]);
          toast.success('Nível e observação limpos no Google Sheets!');
        } else {
          // Procura a linha pelo nome
          const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:G'));
          let targetRowIndex = -1;
          const mapping = rows.length > 0 ? parseHeader(rows[0]) : parseHeader(USER_EVAL_HEADER);
          if (rows.length > 1) {
            const targetName = ev.nomeAluno.trim().toLowerCase();
            const targetOrch = (ev.orquestra || '').trim().toLowerCase();
            const normOrch = (o: string) => /^10[º°]?\s*ano$/i.test(o.trim()) ? 'orquestra 10º ano' : o.trim().toLowerCase();
            for (let i = 1; i < rows.length; i++) {
              const rName = (rows[i][mapping.colNome !== -1 ? mapping.colNome : 1] || '').trim().toLowerCase();
              const rOrch = (rows[i][mapping.colOrquestra !== -1 ? mapping.colOrquestra : 4] || '').trim().toLowerCase();
              if (rName === targetName && (!targetOrch || !rOrch || normOrch(rOrch) === normOrch(targetOrch))) {
                targetRowIndex = i + 1;
                break;
              }
            }
          }
          if (targetRowIndex > 1) {
            const foundRowValues = [
              ev.ordem || String(targetRowIndex - 1),
              ev.nomeAluno,
              ev.grau || '',
              ev.naipe || '',
              ev.orquestra || '',
              '', // Nível limpo
              '', // Observações limpa
            ];
            await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${targetRowIndex}:G${targetRowIndex}`), [foundRowValues]);
            toast.success('Nível e observação limpos no Google Sheets!');
          }
        }
      } catch (err) {
        console.error('Erro ao limpar avaliação no Sheets:', err);
      }
    },
    [config, evaluations, sheetsMeta]
  );

  const ensureHeaders = useCallback(async () => {
    if (!config) return;
    try {
      const tabName = await ensureTabExists();
      const evalRows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:G1'));
      if (!evalRows.length || !evalRows[0].some((c) => /nome/i.test(c))) {
        await updateRange(config.spreadsheetId, formatSheetRange(tabName, 'A1:G1'), [USER_EVAL_HEADER]);
      }
    } catch {
      // Ignora erro inicial
    }
  }, [config, ensureTabExists]);

  return {
    evaluations,
    criteria,
    levelTemplates,
    detectedHeader,
    isLoading,
    load,
    updateEvaluation,
    saveSingleEvaluation,
    saveAllEvaluations,
    saveLevelTemplates,
    addEvaluation,
    removeEvaluation,
    loadCriteria,
    ensureHeaders,
  };
}
