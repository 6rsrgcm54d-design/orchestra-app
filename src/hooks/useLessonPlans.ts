import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  readRange,
  appendRows,
  updateRange,
  clearTab,
  INITIAL_LOCAL_DATA,
  ensureSheetExists,
  isAppsScript,
  isLocalId,
} from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { LessonPlan, LessonPlanItem } from '../types';
import { safeStorage } from '../utils/storage';

const DEFAULT_TAB = 'Planos de Aula';
const CACHE_KEY = 'orchestra_cache_lesson_plans';
const HEADER = ['ID Plano', 'Orquestra', 'Data', 'Hora', 'Obra', 'Minuto', 'Atividade', 'Notas'];

interface ColumnMapping {
  idPlano: number;
  orquestra: number;
  data: number;
  hora: number;
  obra: number;
  minuto: number;
  atividade: number;
  notas: number;
}

const DEFAULT_MAPPING: ColumnMapping = {
  idPlano: 0,
  orquestra: 1,
  data: 2,
  hora: 3,
  obra: 4,
  minuto: 5,
  atividade: 6,
  notas: 7,
};

function detectMapping(headerRow: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    idPlano: -1,
    orquestra: -1,
    data: -1,
    hora: -1,
    obra: -1,
    minuto: -1,
    atividade: -1,
    notas: -1,
  };

  if (headerRow && headerRow.length > 0) {
    headerRow.forEach((col, idx) => {
      const text = String(col).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      if (text.includes('id') || text.includes('codigo') || text.includes('identificador')) {
        mapping.idPlano = idx;
      } else if (text.includes('orquestra') || text.includes('grupo') || text.includes('elenco')) {
        mapping.orquestra = idx;
      } else if (text.includes('data') || text.includes('dia')) {
        mapping.data = idx;
      } else if (text.includes('hora') || text.includes('horario') || text.includes('inicio') || text.includes('tempo')) {
        mapping.hora = idx;
      } else if (text.includes('obra') || text.includes('peca') || text.includes('repertorio') || text.includes('titulo')) {
        mapping.obra = idx;
      } else if (text.includes('minuto') || text.includes('duracao')) {
        mapping.minuto = idx;
      } else if (text.includes('atividade') || text.includes('conteudo') || text.includes('trabalho') || text.includes('foco') || text.includes('descricao')) {
        mapping.atividade = idx;
      } else if (text.includes('nota') || text.includes('obs') || text.includes('observa')) {
        mapping.notas = idx;
      }
    });
  }

  // Fallbacks
  if (mapping.idPlano === -1) mapping.idPlano = 0;
  if (mapping.orquestra === -1) mapping.orquestra = 1;
  if (mapping.data === -1) mapping.data = 2;
  if (mapping.hora === -1) mapping.hora = 3;
  if (mapping.obra === -1) mapping.obra = 4;
  if (mapping.minuto === -1) mapping.minuto = 5;
  if (mapping.atividade === -1) mapping.atividade = 6;
  if (mapping.notas === -1) mapping.notas = 7;

  return mapping;
}

function parseRawRowsToPlans(rows: string[][]): LessonPlan[] {
  if (!rows || rows.length < 2) return [];

  // Encontra linha de cabeçalho
  let headerIndex = -1;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const rowStr = rows[r].map((c) => String(c).toLowerCase()).join(' ');
    if (
      rowStr.includes('obra') ||
      rowStr.includes('minuto') ||
      rowStr.includes('atividade') ||
      rowStr.includes('orquestra') ||
      rowStr.includes('plano')
    ) {
      headerIndex = r;
      break;
    }
  }

  const header = headerIndex >= 0 ? rows[headerIndex] : [];
  const mapping = detectMapping(header);
  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows.slice(1);
  const startOffset = headerIndex >= 0 ? headerIndex + 2 : 2;

  // Agrupamento por ID de Plano
  const planGroups = new Map<string, {
    id: string;
    rowIndex: number;
    orquestra: string;
    data: string;
    hora: string;
    notas?: string;
    itens: LessonPlanItem[];
  }>();

  dataRows.forEach((row, i) => {
    const rowIndex = startOffset + i;
    const rawId = (row[mapping.idPlano] ?? '').trim();
    const orquestra = (row[mapping.orquestra] ?? '').trim();
    const data = (row[mapping.data] ?? '').trim();
    const hora = (row[mapping.hora] ?? '').trim();
    const obra = (row[mapping.obra] ?? '').trim();
    const rawMinuto = (row[mapping.minuto] ?? '').trim();
    const atividade = (row[mapping.atividade] ?? '').trim();
    const itemNotas = (row[mapping.notas] ?? '').trim();

    // Ignora linhas vazias
    if (!orquestra && !data && !obra && !atividade) return;
    if (orquestra.toLowerCase() === 'orquestra' || data.toLowerCase() === 'data') return;

    // Se não tiver ID específico, cria chave baseada em orquestra + data + hora
    const planKey = rawId || `plan_${orquestra}_${data}_${hora || 'geral'}`;

    if (!planGroups.has(planKey)) {
      planGroups.set(planKey, {
        id: rawId || `plan-${Date.now()}-${i}`,
        rowIndex,
        orquestra: orquestra || 'Académica',
        data: data || new Date().toISOString().split('T')[0],
        hora: hora || '15:00 - 17:00',
        itens: [],
      });
    }

    const group = planGroups.get(planKey)!;

    // Se a linha tiver dados de obra ou atividade, adiciona aos itens
    if (obra || atividade || rawMinuto) {
      const minNum = parseInt(rawMinuto.replace(/[^0-9]/g, ''), 10);
      group.itens.push({
        id: `item-${planKey}-${group.itens.length + 1}`,
        obra: obra || 'Geral',
        minuto: isNaN(minNum) ? 15 : minNum,
        atividade: atividade || '',
        notas: itemNotas || undefined,
      });
    } else if (itemNotas && !group.notas) {
      group.notas = itemNotas;
    }
  });

  return Array.from(planGroups.values());
}

function plansToRows(plans: LessonPlan[]): string[][] {
  const rows: string[][] = [HEADER];
  plans.forEach((plan) => {
    if (!plan.itens || plan.itens.length === 0) {
      rows.push([
        plan.id,
        plan.orquestra,
        plan.data,
        plan.hora,
        'Ensaio Geral',
        '60',
        'Ensaio de orquestra',
        plan.notas || '',
      ]);
    } else {
      plan.itens.forEach((item, idx) => {
        const itemNote = item.notas || '';
        // Se for o primeiro item e o plano tiver notas gerais, inclui se relevante
        const noteToSave = idx === 0 && plan.notas
          ? (itemNote ? `${plan.notas} | ${itemNote}` : plan.notas)
          : itemNote;

        rows.push([
          plan.id,
          plan.orquestra,
          plan.data,
          plan.hora,
          item.obra || '',
          String(item.minuto || 0),
          item.atividade || '',
          noteToSave,
        ]);
      });
    }
  });
  return rows;
}

function getInitialPlans(): LessonPlan[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA[DEFAULT_TAB] || [];
  return parseRawRowsToPlans(raw);
}

export function useLessonPlans() {
  const { config, sheetsMeta, refreshMeta } = useSheets();
  const [plans, setPlans] = useState<LessonPlan[]>(getInitialPlans);
  const [isLoading, setIsLoading] = useState(false);

  const getTargetTabName = useCallback(() => {
    if (!sheetsMeta?.sheets?.length) return DEFAULT_TAB;
    const found = sheetsMeta.sheets.find((s) => {
      const norm = s.properties.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return norm.includes('plano') && norm.includes('aula');
    });
    return found ? found.properties.title : DEFAULT_TAB;
  }, [sheetsMeta]);

  const ensureTabExists = useCallback(async () => {
    if (!config) return DEFAULT_TAB;
    const tabName = getTargetTabName();
    if (!isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
      if (sheetsMeta && !sheetsMeta.sheets.some((s) => s.properties.title.toLowerCase() === tabName.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, tabName, HEADER);
          await refreshMeta();
        } catch (e) {
          console.warn('Erro ao criar aba de Planos de Aula:', e);
        }
      }
    }
    return tabName;
  }, [config, sheetsMeta, getTargetTabName, refreshMeta]);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const tabName = getTargetTabName();
      const rows = await readRange(config.spreadsheetId, `'${tabName}'!A:H`);
      if (rows && rows.length > 0) {
        const loaded = parseRawRowsToPlans(rows);
        setPlans(loaded);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
      }
    } catch (err) {
      console.warn('Aba Planos de Aula ainda não existe ou erro ao carregar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config, getTargetTabName]);

  // Persiste a lista completa de planos no Sheets e Cache
  const persistPlans = useCallback(
    async (updatedPlans: LessonPlan[], showToast = true) => {
      // 1. Atualização imediata na UI e LocalStorage
      setPlans(updatedPlans);
      safeStorage.setItem(CACHE_KEY, JSON.stringify(updatedPlans));

      if (!config) return;

      const tabName = await ensureTabExists();
      const allRows = plansToRows(updatedPlans);

      try {
        if (isLocalId(config.spreadsheetId)) {
          await updateRange(config.spreadsheetId, `'${tabName}'!A1:H${allRows.length}`, allRows);
          return;
        }

        // Se for Apps Script ou Google Sheets OAuth
        if (isAppsScript(config.spreadsheetId)) {
          await clearTab(config.spreadsheetId, tabName);
          await appendRows(config.spreadsheetId, `'${tabName}'!A:H`, allRows.slice(1));
        } else {
          // Google Sheets OAuth REST
          try {
            await clearTab(config.spreadsheetId, tabName);
          } catch {}
          await updateRange(config.spreadsheetId, `'${tabName}'!A1:H${allRows.length}`, allRows);
        }

        if (showToast) {
          toast.success('Plano guardado com sucesso!');
        }
      } catch (err) {
        console.error('Erro ao persistir planos no Sheets:', err);
        if (showToast) {
          toast.error(`Erro ao guardar no Sheets: ${err instanceof Error ? err.message : 'Erro'}`);
        }
      }
    },
    [config, ensureTabExists]
  );

  const addPlan = useCallback(
    async (planData: Omit<LessonPlan, 'id' | 'rowIndex'>) => {
      const newId = `plano-${Date.now()}`;
      const newPlan: LessonPlan = {
        ...planData,
        id: newId,
        rowIndex: plans.length + 2,
      };

      const next = [newPlan, ...plans];
      const toastId = toast.loading('A guardar novo plano de aula...');
      try {
        await persistPlans(next, false);
        toast.success('Plano de aula criado com sucesso!', { id: toastId });
      } catch (err) {
        toast.error('Erro ao criar plano', { id: toastId });
      }
    },
    [plans, persistPlans]
  );

  const updatePlan = useCallback(
    async (plan: LessonPlan) => {
      const next = plans.map((p) => (p.id === plan.id ? plan : p));
      const toastId = toast.loading('A atualizar plano de aula...');
      try {
        await persistPlans(next, false);
        toast.success('Plano de aula atualizado!', { id: toastId });
      } catch (err) {
        toast.error('Erro ao atualizar plano', { id: toastId });
      }
    },
    [plans, persistPlans]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      const next = plans.filter((p) => p.id !== planId);
      const toastId = toast.loading('A eliminar plano de aula...');
      try {
        await persistPlans(next, false);
        toast.success('Plano eliminado!', { id: toastId });
      } catch (err) {
        toast.error('Erro ao eliminar plano', { id: toastId });
      }
    },
    [plans, persistPlans]
  );

  const duplicatePlan = useCallback(
    async (planId: string) => {
      const existing = plans.find((p) => p.id === planId);
      if (!existing) return;

      const newId = `plano-${Date.now()}`;
      const duplicated: LessonPlan = {
        ...existing,
        id: newId,
        titulo: existing.titulo ? `${existing.titulo} (Cópia)` : 'Ensaio (Cópia)',
        itens: existing.itens.map((it, idx) => ({
          ...it,
          id: `item-${newId}-${idx + 1}`,
        })),
      };

      const next = [duplicated, ...plans];
      const toastId = toast.loading('A duplicar plano...');
      try {
        await persistPlans(next, false);
        toast.success('Plano duplicado com sucesso!', { id: toastId });
      } catch (err) {
        toast.error('Erro ao duplicar plano', { id: toastId });
      }
    },
    [plans, persistPlans]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    try {
      const tabName = getTargetTabName();
      const rows = await readRange(config.spreadsheetId, `'${tabName}'!A1:H1`);
      if (!rows.length || !rows[0][0]) {
        await updateRange(config.spreadsheetId, `'${tabName}'!A1:H1`, [HEADER]);
      }
    } catch {}
  }, [config, getTargetTabName]);

  return {
    plans,
    isLoading,
    load,
    addPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    ensureHeader,
  };
}
