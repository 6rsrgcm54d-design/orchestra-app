import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, deleteRow } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Evaluation, Criteria } from '../types';

const EVAL_TAB = 'Avaliações';
const CRIT_TAB = 'Critérios';

const EVAL_HEADER = ['Nome Aluno', 'Naipe', 'Critério', 'Pontuação', 'Data', 'Observações'];
const CRIT_HEADER = ['Nome do Critério', 'Descrição', 'Peso'];

function rowToEvaluation(row: string[], rowIndex: number): Evaluation {
  return {
    id: `eval-${rowIndex}`,
    rowIndex,
    nomeAluno: row[0] ?? '',
    naipe: row[1] ?? '',
    criterio: row[2] ?? '',
    pontuacao: parseInt(row[3] ?? '0', 10),
    data: row[4] ?? '',
    observacoes: row[5] ?? '',
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

export function useEvaluations() {
  const { config, getSheetId } = useSheets();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCriteria = useCallback(async () => {
    if (!config) return;
    try {
      const rows = await readRange(config.spreadsheetId, `${CRIT_TAB}!A:C`);
      setCriteria(rows.slice(1).map((row, i) => rowToCriteria(row, i + 2)));
    } catch (err) {
      toast.error(`Erro ao carregar critérios: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }, [config]);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${EVAL_TAB}!A:F`);
      setEvaluations(rows.slice(1).map((row, i) => rowToEvaluation(row, i + 2)));
      await loadCriteria();
    } catch (err) {
      toast.error(`Erro ao carregar avaliações: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, loadCriteria]);

  const addEvaluation = useCallback(
    async (ev: Omit<Evaluation, 'id' | 'rowIndex'>) => {
      if (!config) return;
      const toastId = toast.loading('A guardar avaliação...');
      try {
        await appendRows(config.spreadsheetId, `${EVAL_TAB}!A:F`, [
          [ev.nomeAluno, ev.naipe, ev.criterio, ev.pontuacao, ev.data, ev.observacoes],
        ]);
        toast.success('Avaliação guardada!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, load]
  );

  const removeEvaluation = useCallback(
    async (ev: Evaluation) => {
      if (!config) return;
      const sheetId = getSheetId(EVAL_TAB);
      if (sheetId === undefined) { toast.error('Aba não encontrada'); return; }
      const toastId = toast.loading('A eliminar...');
      try {
        await deleteRow(config.spreadsheetId, sheetId, ev.rowIndex - 1);
        toast.success('Avaliação eliminada!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, getSheetId, load]
  );

  const ensureHeaders = useCallback(async () => {
    if (!config) return;
    const evalRows = await readRange(config.spreadsheetId, `${EVAL_TAB}!A1:F1`);
    if (!evalRows.length || evalRows[0][0] !== 'Nome Aluno') {
      const { updateRange } = await import('../api/sheetsApi');
      await updateRange(config.spreadsheetId, `${EVAL_TAB}!A1:F1`, [EVAL_HEADER]);
    }
    const critRows = await readRange(config.spreadsheetId, `${CRIT_TAB}!A1:C1`);
    if (!critRows.length || critRows[0][0] !== 'Nome do Critério') {
      const { updateRange } = await import('../api/sheetsApi');
      await updateRange(config.spreadsheetId, `${CRIT_TAB}!A1:C1`, [CRIT_HEADER]);
    }
  }, [config]);

  return { evaluations, criteria, isLoading, load, addEvaluation, removeEvaluation, loadCriteria, ensureHeaders };
}
