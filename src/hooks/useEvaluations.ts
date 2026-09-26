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

const DEFAULT_CB_TAB = 'Avaliações CB';
const DEFAULT_SEC_TAB = 'Avaliações Secundário';
const CRIT_TAB = 'Critérios';

export const USER_EVAL_HEADER_CB = [
  'Ordem',
  'Nome Aluno',
  'Grau',
  'Naipe',
  'Orquestra',
  'Nível',
  'Observações',
];

export const USER_EVAL_HEADER_SEC = [
  'Ordem',
  'Nome Aluno',
  'Grau',
  'Naipe',
  'Orquestra',
  'Classificação Final',
];

export const USER_EVAL_HEADER = USER_EVAL_HEADER_CB;

export function isCbOrchestra(orquestra?: string): boolean {
  if (!orquestra) return true;
  const lower = orquestra.toLowerCase().trim();
  if (lower.includes('acad') || lower.includes('juv')) return true;
  if (lower.includes('artave') || lower.includes('10')) return false;
  return true;
}

export interface EvalTabsInfo {
  cbTab: string;
  secundarioTab: string;
}

export function getEvalTabs(sheetsMeta?: SheetsMeta | null): EvalTabsInfo {
  if (!sheetsMeta?.sheets?.length) {
    return { cbTab: DEFAULT_CB_TAB, secundarioTab: DEFAULT_SEC_TAB };
  }

  const titles = sheetsMeta.sheets.map((s: SheetItem) => s.properties.title);

  const cbTab =
    titles.find((t) => {
      const norm = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (norm.includes('avaliac') || norm.includes('avaliacao')) && (norm.includes('cb') || norm.includes('basico'));
    }) ||
    titles.find((t) => {
      const norm = t.toLowerCase();
      return norm === 'cb' || norm === 'avaliações cb' || norm === 'avaliacoes cb';
    }) ||
    DEFAULT_CB_TAB;

  let secTab = titles.find((t) => {
    if (t === cbTab) return false;
    const norm = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isEval = norm.includes('avaliac') || norm.includes('avaliacao') || norm.includes('classifica');
    const isSec = norm.includes('cp') || norm.includes('secund') || norm.includes('artave') || norm.includes('10') || norm.includes('prof') || norm.includes('20');
    return isEval && isSec;
  });

  if (!secTab) {
    secTab = titles.find((t) => {
      if (t === cbTab) return false;
      const norm = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return norm.includes('avaliac') || norm.includes('avaliacao') || norm.includes('classifica');
    });
  }

  if (!secTab) {
    secTab = DEFAULT_SEC_TAB;
  }

  return { cbTab, secundarioTab: secTab };
}

export function getEvalTabName(sheetsMeta?: SheetsMeta | null): string {
  return getEvalTabs(sheetsMeta).cbTab;
}

export function getTargetEvalTab(orquestra: string | undefined, sheetsMeta?: SheetsMeta | null): string {
  const tabs = getEvalTabs(sheetsMeta);
  return isCbOrchestra(orquestra) ? tabs.cbTab : tabs.secundarioTab;
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
      c.includes('classifica') ||
      c.includes('nivel') ||
      c.includes('pontua') ||
      c.includes('nota') ||
      c.includes('final') ||
      c.includes('20')
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
  let classificacao20: number | null = null;
  if (mapping.colClassificacao !== -1 && row[mapping.colClassificacao] !== undefined && String(row[mapping.colClassificacao]).trim() !== '') {
    const rawVal = String(row[mapping.colClassificacao]).trim().replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      pontuacao = parsed;
      classificacao20 = parsed;
    }
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
    classificacao20,
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  const allInitial: Evaluation[] = [];
  ['Avaliações CB', 'Avaliações Secundário', 'Avaliações'].forEach((tab) => {
    const raw = INITIAL_LOCAL_DATA[tab] || [];
    if (raw.length > 1) {
      const mapping = parseHeader(raw[0]);
      raw.slice(1).forEach((row, i) => {
        const ev = rowToEvaluation(row, i + 2, mapping);
        if (ev.pontuacao > 0 || (ev.observacoes && ev.observacoes.trim().length > 0)) {
          allInitial.push(ev);
        }
      });
    }
  });

  if (allInitial.length > 0) {
    safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(allInitial));
    return allInitial;
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
  const { config, sheetsMeta, refreshMeta } = useSheets();
  const [evaluations, setEvaluations] = useState<Evaluation[]>(getInitialEvaluations);
  const [criteria, setCriteria] = useState<Criteria[]>(getInitialCriteria);
  const [levelTemplates, setLevelTemplates] = useState<Record<number, string>>(getStoredLevelTemplates);
  const [detectedHeader, setDetectedHeader] = useState<string[]>(USER_EVAL_HEADER_CB);
  const [isLoading, setIsLoading] = useState(false);

  const evalTabs = getEvalTabs(sheetsMeta);

  // Garante que ambas as abas existem no Google Sheets
  const ensureTabsExist = useCallback(async (): Promise<EvalTabsInfo> => {
    const tabs = getEvalTabs(sheetsMeta);
    if (!config || isAppsScript(config.spreadsheetId) || isLocalId(config.spreadsheetId)) {
      return tabs;
    }
    if (sheetsMeta) {
      const titles = sheetsMeta.sheets.map((s) => s.properties.title.toLowerCase());
      let created = false;
      if (!titles.includes(tabs.cbTab.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, tabs.cbTab);
          created = true;
        } catch {}
      }
      if (!titles.includes(tabs.secundarioTab.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, tabs.secundarioTab);
          created = true;
        } catch {}
      }
      if (created) {
        await refreshMeta();
      }
    }
    return tabs;
  }, [config, sheetsMeta, refreshMeta]);

  const ensureTabExists = useCallback(async (): Promise<string> => {
    const tabs = await ensureTabsExist();
    return tabs.cbTab;
  }, [ensureTabsExist]);

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
      const tabs = getEvalTabs(sheetsMeta);
      const allLoaded: Evaluation[] = [];

      // 1. Carrega Avaliações CB (Académica e Juvenil)
      try {
        const rowsCb = await readRange(config.spreadsheetId, formatSheetRange(tabs.cbTab, 'A:G'));
        if (rowsCb && rowsCb.length > 0) {
          const mappingCb = parseHeader(rowsCb[0]);
          setDetectedHeader(rowsCb[0]);
          rowsCb.slice(1).forEach((row, i) => {
            const ev = rowToEvaluation(row, i + 2, mappingCb);
            if (ev.pontuacao > 0 || (ev.observacoes && ev.observacoes.trim().length > 0)) {
              allLoaded.push(ev);
            }
          });
        }
      } catch {
        // Se a aba CB com esse nome não existir, tenta 'Avaliações' como fallback
        if (tabs.cbTab !== 'Avaliações') {
          try {
            const rowsFb = await readRange(config.spreadsheetId, formatSheetRange('Avaliações', 'A:G'));
            if (rowsFb && rowsFb.length > 0) {
              const mappingFb = parseHeader(rowsFb[0]);
              rowsFb.slice(1).forEach((row, i) => {
                const ev = rowToEvaluation(row, i + 2, mappingFb);
                if (ev.pontuacao > 0 || (ev.observacoes && ev.observacoes.trim().length > 0)) {
                  allLoaded.push(ev);
                }
              });
            }
          } catch {}
        }
      }

      // 2. Carrega Avaliações Secundário (Artave e 10º ano - 0 a 20 valores)
      try {
        const rowsSec = await readRange(config.spreadsheetId, formatSheetRange(tabs.secundarioTab, 'A:G'));
        if (rowsSec && rowsSec.length > 0) {
          const mappingSec = parseHeader(rowsSec[0]);
          rowsSec.slice(1).forEach((row, i) => {
            const ev = rowToEvaluation(row, i + 2, mappingSec);
            if (ev.pontuacao > 0 || (ev.observacoes && ev.observacoes.trim().length > 0)) {
              allLoaded.push(ev);
            }
          });
        }
      } catch {
        // Ignora se aba secundário ainda não existir
      }

      setEvaluations(allLoaded);
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(allLoaded));
      await loadCriteria();
    } catch (err) {
      toast.error(`Erro ao carregar avaliações: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, sheetsMeta, loadCriteria]);

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
      levelOrScore: number,
      observacoes: string,
      rowIndex?: number
    ) => {
      const isCB = isCbOrchestra(student.orquestra);
      const tabName = getTargetEvalTab(student.orquestra, sheetsMeta);
      const isClearing = levelOrScore <= 0 && (!observacoes || observacoes.trim().length === 0);

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
          pontuacao: levelOrScore,
          classificacao20: !isCB ? levelOrScore : undefined,
          data: new Date().toISOString().split('T')[0],
          observacoes,
        };
        updateEvaluation(updatedEval);
      }

      if (!config) return;

      try {
        const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:G'));
        const defaultHeader = isCB ? USER_EVAL_HEADER_CB : USER_EVAL_HEADER_SEC;
        const mapping = rows.length > 0 ? parseHeader(rows[0]) : parseHeader(defaultHeader);

        let targetRowIndex = rowIndex && rowIndex > 1 ? rowIndex : -1;
        if (targetRowIndex <= 1 && rows.length > 1) {
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

        const scoreStr = levelOrScore > 0 ? String(levelOrScore) : '';
        let rowValues: string[];

        if (isCB) {
          rowValues = [
            student.numero || (targetRowIndex > 1 ? String(targetRowIndex - 1) : ''),
            student.nome,
            student.grau || '',
            student.naipe || '',
            student.orquestra || '',
            scoreStr,
            observacoes || '',
          ];
        } else {
          // Secundário: Classificação 0-20
          if (mapping.colObservacoes !== -1) {
            rowValues = [
              student.numero || (targetRowIndex > 1 ? String(targetRowIndex - 1) : ''),
              student.nome,
              student.grau || '',
              student.naipe || '',
              student.orquestra || '',
              scoreStr,
              observacoes || '',
            ];
          } else {
            rowValues = [
              student.numero || (targetRowIndex > 1 ? String(targetRowIndex - 1) : ''),
              student.nome,
              student.grau || '',
              student.naipe || '',
              student.orquestra || '',
              scoreStr,
            ];
          }
        }

        const endCol = isCB || mapping.colObservacoes !== -1 ? 'G' : 'F';
        if (targetRowIndex > 1) {
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${targetRowIndex}:${endCol}${targetRowIndex}`), [rowValues]);
        } else if (!isClearing) {
          await appendRows(config.spreadsheetId, formatSheetRange(tabName, `A:${endCol}`), [rowValues]);
        }
      } catch (err) {
        console.error('Erro ao guardar avaliação no Sheets:', err);
        toast.error(`Erro ao guardar no Google Sheets: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [config, sheetsMeta, updateEvaluation]
  );

  // Guarda todas as avaliações no Google Sheets (sincronizando todos os alunos nas respetivas abas)
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
        const tabs = getEvalTabs(sheetsMeta);
        const evalMap = new Map<string, Evaluation>();
        validEvals.forEach((ev) => {
          const key = `${(ev.nomeAluno || '').trim().toLowerCase()}|${(ev.orquestra || '').trim().toLowerCase()}`;
          evalMap.set(key, ev);
          evalMap.set((ev.nomeAluno || '').trim().toLowerCase(), ev);
        });

        const studentsList = allStudents || [];
        const cbStudents = studentsList.filter((s) => isCbOrchestra(s.orquestra));
        const secStudents = studentsList.filter((s) => !isCbOrchestra(s.orquestra));

        // 1. Sincroniza aba CB (Académica e Juvenil)
        if (cbStudents.length > 0) {
          const rowsCb: string[][] = [USER_EVAL_HEADER_CB];
          cbStudents.forEach((s, idx) => {
            const key = `${(s.nome || '').trim().toLowerCase()}|${(s.orquestra || '').trim().toLowerCase()}`;
            const ev = evalMap.get(key) || evalMap.get((s.nome || '').trim().toLowerCase());
            rowsCb.push([
              s.numero || String(idx + 1),
              s.nome,
              s.grau || '',
              s.naipe || '',
              s.orquestra || '',
              ev && ev.pontuacao > 0 ? String(ev.pontuacao) : '',
              ev ? ev.observacoes || '' : '',
            ]);
          });
          await updateRange(config.spreadsheetId, formatSheetRange(tabs.cbTab, `A1:G${rowsCb.length}`), rowsCb);
        }

        // 2. Sincroniza aba Secundário (Artave e 10º ano)
        if (secStudents.length > 0) {
          const rowsSec: string[][] = [USER_EVAL_HEADER_SEC];
          secStudents.forEach((s, idx) => {
            const key = `${(s.nome || '').trim().toLowerCase()}|${(s.orquestra || '').trim().toLowerCase()}`;
            const ev = evalMap.get(key) || evalMap.get((s.nome || '').trim().toLowerCase());
            rowsSec.push([
              s.numero || String(idx + 1),
              s.nome,
              s.grau || '',
              s.naipe || '',
              s.orquestra || '',
              ev && ev.pontuacao > 0 ? String(ev.pontuacao) : '',
            ]);
          });
          await updateRange(config.spreadsheetId, formatSheetRange(tabs.secundarioTab, `A1:F${rowsSec.length}`), rowsSec);
        }

        toast.success(`Avaliações sincronizadas no Google Sheets!`, { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro ao guardar: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, sheetsMeta, load]
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

      setEvaluations((prev) => {
        const next = prev.filter((e) => !matchEval(e));
        safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(next));
        return next;
      });

      if (!config) {
        toast.success('Avaliação removida localmente.');
        return;
      }

      const isCB = isCbOrchestra(ev.orquestra);
      const tabName = getTargetEvalTab(ev.orquestra, sheetsMeta);
      try {
        const rows = await readRange(config.spreadsheetId, formatSheetRange(tabName, 'A:G'));
        let targetRowIndex = ev.rowIndex > 1 ? ev.rowIndex : -1;
        const mapping = rows.length > 0 ? parseHeader(rows[0]) : parseHeader(isCB ? USER_EVAL_HEADER_CB : USER_EVAL_HEADER_SEC);

        if (targetRowIndex <= 1 && rows.length > 1) {
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
          const rowValues = isCB
            ? [
                ev.ordem || String(targetRowIndex - 1),
                ev.nomeAluno,
                ev.grau || '',
                ev.naipe || '',
                ev.orquestra || '',
                '', // Nível limpo
                '', // Observações limpa
              ]
            : [
                ev.ordem || String(targetRowIndex - 1),
                ev.nomeAluno,
                ev.grau || '',
                ev.naipe || '',
                ev.orquestra || '',
                '', // Classificação 0-20 limpa
              ];
          const endCol = isCB ? 'G' : 'F';
          await updateRange(config.spreadsheetId, formatSheetRange(tabName, `A${targetRowIndex}:${endCol}${targetRowIndex}`), [rowValues]);
          toast.success('Classificação limpa no Google Sheets!');
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
      const tabs = getEvalTabs(sheetsMeta);
      await Promise.all([
        ensureSheetExists(config.spreadsheetId, sheetsMeta?.sheets, tabs.cbTab, USER_EVAL_HEADER_CB),
        ensureSheetExists(config.spreadsheetId, sheetsMeta?.sheets, tabs.secundarioTab, USER_EVAL_HEADER_SEC),
      ]);
    } catch {
      // Ignora erro inicial
    }
  }, [config, sheetsMeta]);

  return {
    evaluations,
    criteria,
    levelTemplates,
    detectedHeader,
    isLoading,
    evalTabs,
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
