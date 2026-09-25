import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, deleteRow, updateRange, INITIAL_LOCAL_DATA } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Evaluation, Criteria } from '../types';
import { safeStorage } from '../utils/storage';
import {
  getStoredLevelTemplates,
  saveStoredLevelTemplates,
  DEFAULT_LEVEL_TEMPLATES,
} from '../utils/nameParser';

const EVAL_TAB = 'Avaliações';
const CRIT_TAB = 'Critérios';

export const USER_EVAL_HEADER = [
  'Ordem',
  'Nome Aluno',
  'Grau',
  'Naipe',
  'Orquestra',
  'Classificação',
  'Observações',
];

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
      c.includes('pontua') ||
      c.includes('nota') ||
      c.includes('nivel')
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
  const orquestra = mapping.colOrquestra !== -1 ? (row[mapping.colOrquestra] ?? '').trim() : '';
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Avaliações'] || [];
  if (raw.length > 1) {
    const mapping = parseHeader(raw[0]);
    const list = raw.slice(1).map((row, i) => rowToEvaluation(row, i + 2, mapping));
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
  const { config, getSheetId } = useSheets();
  const [evaluations, setEvaluations] = useState<Evaluation[]>(getInitialEvaluations);
  const [criteria, setCriteria] = useState<Criteria[]>(getInitialCriteria);
  const [levelTemplates, setLevelTemplates] = useState<Record<number, string>>(getStoredLevelTemplates);
  const [detectedHeader, setDetectedHeader] = useState<string[]>(USER_EVAL_HEADER);
  const [isLoading, setIsLoading] = useState(false);

  // Guarda novos modelos de observação (1 a 5) na memória local e opcionalmente no Sheets
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
        await updateRange(config.spreadsheetId, `${CRIT_TAB}!A1:B6`, critRows);
      } catch {
        // Fallback silencioso se aba Critérios não existir
      }
    },
    [config]
  );

  const loadCriteria = useCallback(async () => {
    if (!config) return;
    try {
      const rows = await readRange(config.spreadsheetId, `${CRIT_TAB}!A:C`);
      if (rows.length > 1) {
        // Verifica se a aba contém os modelos dos níveis 1 a 5
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
      const rows = await readRange(config.spreadsheetId, `${EVAL_TAB}!A:G`);
      if (rows.length > 0) {
        const headerRow = rows[0];
        setDetectedHeader(headerRow);
        const mapping = parseHeader(headerRow);
        const loaded = rows
          .slice(1)
          .filter((r) => r.some((cell) => (cell || '').trim().length > 0))
          .map((row, i) => rowToEvaluation(row, i + 2, mapping));

        setEvaluations(loaded);
        safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(loaded));
      }
      await loadCriteria();
    } catch (err) {
      toast.error(`Erro ao carregar avaliações: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, loadCriteria]);

  // Atualização otimista local de uma avaliação
  const updateEvaluation = useCallback((updated: Evaluation) => {
    setEvaluations((prev) => {
      const idx = prev.findIndex(
        (e) =>
          e.id === updated.id ||
          (e.nomeAluno.toLowerCase().trim() === updated.nomeAluno.toLowerCase().trim() &&
            (e.orquestra || '').trim() === (updated.orquestra || '').trim())
      );
      let next: Evaluation[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updated;
      } else {
        next = [...prev, updated];
      }
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Guarda todas as avaliações no Google Sheets com o cabeçalho configurado
  const saveAllEvaluations = useCallback(
    async (evalsToSave: Evaluation[]) => {
      // Atualiza estado local imediatamente
      setEvaluations(evalsToSave);
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(evalsToSave));

      if (!config) {
        toast.success('Avaliações guardadas localmente!');
        return;
      }

      const toastId = toast.loading('A guardar no Google Sheets...');
      try {
        let header = detectedHeader && detectedHeader.length >= 5 ? detectedHeader : USER_EVAL_HEADER;
        const mapping = parseHeader(header);

        const rows: string[][] = [header];
        evalsToSave.forEach((ev, idx) => {
          const row = new Array(header.length).fill('');
          if (mapping.colOrdem !== -1) row[mapping.colOrdem] = ev.ordem || String(idx + 1);
          if (mapping.colNome !== -1) row[mapping.colNome] = ev.nomeAluno || '';
          if (mapping.colGrau !== -1) row[mapping.colGrau] = ev.grau || '';
          if (mapping.colNaipe !== -1) row[mapping.colNaipe] = ev.naipe || '';
          if (mapping.colOrquestra !== -1) row[mapping.colOrquestra] = ev.orquestra || '';
          if (mapping.colClassificacao !== -1) {
            row[mapping.colClassificacao] = ev.pontuacao > 0 ? String(ev.pontuacao) : '';
          }
          if (mapping.colObservacoes !== -1) row[mapping.colObservacoes] = ev.observacoes || '';
          if (mapping.colCriterio !== -1) row[mapping.colCriterio] = ev.criterio || '';
          if (mapping.colData !== -1) row[mapping.colData] = ev.data || '';
          rows.push(row);
        });

        const colLetter = String.fromCharCode(64 + Math.min(26, header.length));
        await updateRange(config.spreadsheetId, `${EVAL_TAB}!A1:${colLetter}${rows.length}`, rows);
        toast.success(`${evalsToSave.length} avaliações guardadas no Google Sheets!`, { id: toastId });
      } catch (err) {
        toast.error(`Erro ao guardar: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, detectedHeader]
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
      const updatedList = evaluations.filter((e) => e.id !== ev.id);
      setEvaluations(updatedList);
      safeStorage.setItem(CACHE_EVALS_KEY, JSON.stringify(updatedList));

      if (!config) {
        toast.success('Avaliação removida localmente.');
        return;
      }

      const sheetId = getSheetId(EVAL_TAB);
      if (sheetId !== undefined && ev.rowIndex > 0) {
        try {
          await deleteRow(config.spreadsheetId, sheetId, ev.rowIndex - 1, EVAL_TAB);
          toast.success('Avaliação removida do Google Sheets!');
        } catch {
          await saveAllEvaluations(updatedList);
        }
      } else {
        await saveAllEvaluations(updatedList);
      }
    },
    [config, evaluations, getSheetId, saveAllEvaluations]
  );

  const ensureHeaders = useCallback(async () => {
    if (!config) return;
    try {
      const evalRows = await readRange(config.spreadsheetId, `${EVAL_TAB}!A1:G1`);
      if (!evalRows.length || !evalRows[0].some((c) => /nome/i.test(c))) {
        await updateRange(config.spreadsheetId, `${EVAL_TAB}!A1:G1`, [USER_EVAL_HEADER]);
      }
    } catch {
      // Ignora erro inicial
    }
  }, [config]);

  return {
    evaluations,
    criteria,
    levelTemplates,
    detectedHeader,
    isLoading,
    load,
    updateEvaluation,
    saveAllEvaluations,
    saveLevelTemplates,
    addEvaluation,
    removeEvaluation,
    loadCriteria,
    ensureHeaders,
  };
}
