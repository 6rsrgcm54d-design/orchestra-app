import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  readRange,
  updateRange,
  deleteRow,
  INITIAL_LOCAL_DATA,
  ensureSheetExists,
  isAppsScript,
  isLocalId,
} from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { WeeklyPlan, WeeklyPlanDay, LessonPlan } from '../types';
import { safeStorage } from '../utils/storage';

const DEFAULT_TAB = 'Planos Semanais';
const CACHE_KEY = 'orchestra_cache_weekly_plans';

const HEADER = [
  'ID Plano Semanal',
  'Orquestra',
  'Ano Letivo',
  'Semana Inicio',
  'Semana Fim',
  'Titulo',
  'Dia Semana',
  'Data Ensaio',
  'Horario',
  'Local',
  'Naipes',
  'Obras',
  'Observacoes Dia',
  'Avisos Gerais',
  'Notas Rodape',
];

export function getInitialWeeklyPlans(): WeeklyPlan[] {
  try {
    const saved = safeStorage.getItem(CACHE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  // Plano de demonstração inicial para a Orquestra Artave
  const today = new Date();
  // Encontra a segunda-feira da semana corrente
  const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  return [
    {
      id: 'semana-demo-artave',
      orquestra: 'Orquestra Artave',
      anoLetivo: '2026-2027',
      semanaInicio: fmt(monday),
      semanaFim: fmt(sunday),
      titulo: 'Plano Semanal de Ensaios — Preparação de Programa',
      dias: [
        {
          id: 'dia-1',
          diaSemana: 'Segunda-feira',
          data: fmt(monday),
          horario: '17:30 - 19:30',
          local: 'Sala de Orquestra',
          naipes: 'Tutti',
          obras: 'L. v. Beethoven: Sinfonia nº 5 em Dó menor, Op. 67\n• Andamento I (Allegro con brio) — Estudo dos compassos 1 a 124\n• Foco: precisão rítmica dos motivos e ataques em tutti',
          observacoes: '',
        },
        {
          id: 'dia-2',
          diaSemana: 'Quarta-feira',
          data: (() => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + 2);
            return fmt(d);
          })(),
          horario: '17:30 - 19:30',
          local: 'Sala de Orquestra',
          naipes: 'Cordas',
          obras: 'Arturo Márquez: Danzón nº 2\n• Trabalho de articulação, balance e dinâmicas nos solos de clarinete e oboé',
          observacoes: 'Trazer surdinas para os naipes de cordas.',
        },
        {
          id: 'dia-3',
          diaSemana: 'Quarta-feira',
          data: (() => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + 2);
            return fmt(d);
          })(),
          horario: '19:30 - 20:30',
          local: 'Sala de Orquestra',
          naipes: 'Tutti',
          obras: 'Ensaio Geral do Programa Completo:\n• 1. Beethoven: Sinfonia nº 5\n• 2. Márquez: Danzón nº 2',
          observacoes: '',
        },
      ],
      avisosGerais: '',
      notasRodape: 'Escola Profissional Artística do Vale do Ave  - Luís Machado',
    },
  ];
}

export function compileWeeklyPlanFromDailyPlans(
  dailyPlans: LessonPlan[],
  weekStart: string,
  orchestra: string = 'Orquestra Artave'
): WeeklyPlan {
  const start = new Date(weekStart.includes('T') ? weekStart : `${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  // Filtra planos diários que caem nesta semana
  const weekDailyPlans = dailyPlans
    .filter((p) => {
      if (!p.data) return false;
      const d = p.data.trim();
      const matchOrch =
        !orchestra ||
        orchestra === 'Todas' ||
        p.orquestra.toLowerCase().includes(orchestra.toLowerCase()) ||
        orchestra.toLowerCase().includes(p.orquestra.toLowerCase());
      return matchOrch && d >= startStr && d <= endStr;
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const days: WeeklyPlanDay[] = weekDailyPlans.map((dp, idx) => {
    let weekday = 'Ensaio';
    try {
      const dObj = new Date(`${dp.data}T00:00:00`);
      weekday = dObj.toLocaleDateString('pt-PT', { weekday: 'long' });
      weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    } catch {}

    const obrasText = (dp.itens || [])
      .map((it) => {
        let line = `• ${it.obra || 'Obra a definir'}`;
        if (it.minuto) line += ` (${it.minuto} min)`;
        if (it.atividade) line += `: ${it.atividade}`;
        return line;
      })
      .join('\n');

    return {
      id: `day-${idx + 1}-${Date.now()}`,
      diaSemana: weekday,
      data: dp.data,
      horario: dp.hora || '17:30 - 19:30',
      local: 'Auditório / Sala de Orquestra',
      naipes: `Orquestra ${dp.orquestra}`,
      obras: obrasText || 'Trabalho de repertório geral da orquestra',
      observacoes: dp.notas || '',
    };
  });

  // Se não houver planos diários, cria estrutura base para preenchimento
  if (days.length === 0) {
    const daysOfWeekNames = ['Segunda-feira', 'Quarta-feira', 'Sábado'];
    const offsets = [0, 2, 5];
    offsets.forEach((offset, idx) => {
      const curDate = new Date(start);
      curDate.setDate(start.getDate() + offset);
      const curDateStr = curDate.toISOString().split('T')[0];
      days.push({
        id: `day-default-${idx + 1}-${Date.now()}`,
        diaSemana: daysOfWeekNames[idx],
        data: curDateStr,
        horario: idx === 2 ? '10:00 - 13:00' : '17:30 - 19:30',
        local: 'Sala de Orquestra',
        naipes: 'Tutti',
        obras: 'Indicar as obras, andamentos e compassos a ensaiar...',
        observacoes: '',
      });
    });
  }

  return {
    id: `semana-${Date.now()}`,
    orquestra: orchestra || 'Orquestra Artave',
    anoLetivo: '2026-2027',
    semanaInicio: startStr,
    semanaFim: endStr,
    titulo: `Plano Semanal de Ensaios — Semana de ${startStr}`,
    dias: days,
    avisosGerais: undefined,
    notasRodape: 'Escola Profissional Artística do Vale do Ave  - Luís Machado',
  };
}

function parseRowsToWeeklyPlans(rows: string[][]): WeeklyPlan[] {
  if (!rows || rows.length < 2) return [];

  // Encontra cabeçalho
  let headerIndex = -1;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const rowStr = rows[r].map((c) => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('semana') || rowStr.includes('orquestra') || rowStr.includes('ensaios')) {
      headerIndex = r;
      break;
    }
  }

  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows.slice(1);
  const planMap = new Map<string, WeeklyPlan>();

  dataRows.forEach((row, i) => {
    const id = (row[0] ?? '').trim();
    const orquestra = (row[1] ?? '').trim();
    const anoLetivo = (row[2] ?? '').trim() || '2026-2027';
    const semanaInicio = (row[3] ?? '').trim();
    const semanaFim = (row[4] ?? '').trim();
    const titulo = (row[5] ?? '').trim();
    const diaSemana = (row[6] ?? '').trim();
    const dataEnsaio = (row[7] ?? '').trim();
    const horario = (row[8] ?? '').trim();
    const local = (row[9] ?? '').trim();
    const naipes = (row[10] ?? '').trim();
    const obras = (row[11] ?? '').trim();
    const obsDia = (row[12] ?? '').trim();
    const avisosGerais = (row[13] ?? '').trim();
    const notasRodape = (row[14] ?? '').trim() || 'Escola Profissional Artística do Vale do Ave  - Luís Machado';

    if (!id && !orquestra && !semanaInicio && !obras) return;

    const planId = id || `weekly-${semanaInicio}-${orquestra}`;

    if (!planMap.has(planId)) {
      planMap.set(planId, {
        id: planId,
        orquestra: orquestra || 'Orquestra Artave',
        anoLetivo,
        semanaInicio,
        semanaFim,
        titulo,
        dias: [],
        avisosGerais,
        notasRodape,
      });
    }

    const currentPlan = planMap.get(planId)!;

    if (diaSemana || dataEnsaio || horario || obras) {
      currentPlan.dias.push({
        id: `day-${planId}-${currentPlan.dias.length + 1}`,
        diaSemana: diaSemana || 'Dia de Ensaio',
        data: dataEnsaio || semanaInicio,
        horario: horario || '17:30 - 19:30',
        local,
        naipes,
        obras,
        observacoes: obsDia,
      });
    }
  });

  return Array.from(planMap.values());
}

function weeklyPlansToRows(plans: WeeklyPlan[]): string[][] {
  const rows: string[][] = [HEADER];

  plans.forEach((plan) => {
    if (!plan.dias || plan.dias.length === 0) {
      rows.push([
        plan.id,
        plan.orquestra,
        plan.anoLetivo,
        plan.semanaInicio,
        plan.semanaFim,
        plan.titulo || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        plan.avisosGerais || '',
        plan.notasRodape || 'Escola Profissional Artística do Vale do Ave  - Luís Machado',
      ]);
    } else {
      plan.dias.forEach((d) => {
        rows.push([
          plan.id,
          plan.orquestra,
          plan.anoLetivo,
          plan.semanaInicio,
          plan.semanaFim,
          plan.titulo || '',
          d.diaSemana || '',
          d.data || '',
          d.horario || '',
          d.local || '',
          d.naipes || '',
          d.obras || '',
          d.observacoes || '',
          plan.avisosGerais || '',
          plan.notasRodape || 'Escola Profissional Artística do Vale do Ave  - Luís Machado',
        ]);
      });
    }
  });

  return rows;
}

export function useWeeklyPlans() {
  const { config, sheetsMeta, refreshMeta } = useSheets();
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>(getInitialWeeklyPlans);
  const [isLoading, setIsLoading] = useState(false);

  const getTargetTabName = useCallback((): string => {
    if (sheetsMeta?.sheets) {
      const match = sheetsMeta.sheets.find(
        (s: { properties: { title: string } }) =>
          s.properties.title.toLowerCase().includes('semanal') ||
          s.properties.title.toLowerCase().includes('semana') ||
          s.properties.title.toLowerCase().includes('convocatoria')
      );
      if (match) return match.properties.title;
    }
    return DEFAULT_TAB;
  }, [sheetsMeta]);

  const ensureTabExists = useCallback(async () => {
    if (!config) return DEFAULT_TAB;
    const tabName = getTargetTabName();
    if (!isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
      if (sheetsMeta?.sheets && !sheetsMeta.sheets.some((s: { properties: { title: string } }) => s.properties.title.toLowerCase() === tabName.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, tabName, HEADER);
          await refreshMeta();
        } catch (e) {
          console.warn('Erro ao criar aba de Planos Semanais:', e);
        }
      }
    }
    return tabName;
  }, [config, sheetsMeta, getTargetTabName, refreshMeta]);

  const load = useCallback(async () => {
    if (!config) return;

    if (isLocalId(config.spreadsheetId)) {
      setWeeklyPlans(getInitialWeeklyPlans());
      return;
    }

    setIsLoading(true);
    try {
      const tabName = await ensureTabExists();

      const rows = await readRange(config.spreadsheetId, `'${tabName}'!A1:O150`);
      if (rows && rows.length > 1) {
        const parsed = parseRowsToWeeklyPlans(rows);
        setWeeklyPlans(parsed);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      } else {
        const initial = getInitialWeeklyPlans();
        setWeeklyPlans(initial);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(initial));
        const initialRows = weeklyPlansToRows(initial);
        await updateRange(config.spreadsheetId, `'${tabName}'!A1:O${initialRows.length}`, initialRows);
      }
    } catch (err) {
      console.warn('Erro ao carregar planos semanais do Sheets, a usar cache local:', err);
      setWeeklyPlans(getInitialWeeklyPlans());
    } finally {
      setIsLoading(false);
    }
  }, [config, ensureTabExists]);

  const persistWeeklyPlans = useCallback(
    async (next: WeeklyPlan[], showToast = true) => {
      setWeeklyPlans(next);
      safeStorage.setItem(CACHE_KEY, JSON.stringify(next));

      if (!config) return;

      const toastId = showToast ? toast.loading('A guardar plano semanal no Google Sheets...') : undefined;

      try {
        const tabName = await ensureTabExists();
        const rows = weeklyPlansToRows(next);

        if (isLocalId(config.spreadsheetId)) {
          await updateRange(config.spreadsheetId, `'${tabName}'!A1:O${rows.length}`, rows);
          if (showToast && toastId) toast.success('Plano semanal guardado com sucesso!', { id: toastId });
          return;
        }

        // Pad para limpar linhas residuais
        const currentRows = await readRange(config.spreadsheetId, `'${tabName}'!A1:O150`);
        const existingLen = currentRows ? currentRows.length : 0;

        if (existingLen > rows.length) {
          const padded = [...rows];
          while (padded.length < existingLen) {
            padded.push(new Array(15).fill(''));
          }
          await updateRange(config.spreadsheetId, `'${tabName}'!A1:O${padded.length}`, padded);
        } else {
          await updateRange(config.spreadsheetId, `'${tabName}'!A1:O${rows.length}`, rows);
        }

        if (showToast && toastId) toast.success('Plano semanal guardado com sucesso no Sheets!', { id: toastId });
      } catch (err) {
        console.error('Erro ao persistir plano semanal:', err);
        if (showToast && toastId) {
          toast.error(`Erro ao guardar no Sheets: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
        }
      }
    },
    [config, ensureTabExists]
  );

  const addWeeklyPlan = useCallback(
    async (data: Omit<WeeklyPlan, 'id' | 'rowIndex'>) => {
      const newPlan: WeeklyPlan = {
        ...data,
        id: `weekly-${Date.now()}`,
      };
      const next = [newPlan, ...weeklyPlans];
      await persistWeeklyPlans(next);
    },
    [weeklyPlans, persistWeeklyPlans]
  );

  const updateWeeklyPlan = useCallback(
    async (updated: WeeklyPlan) => {
      const next = weeklyPlans.map((p) => (p.id === updated.id ? updated : p));
      await persistWeeklyPlans(next);
    },
    [weeklyPlans, persistWeeklyPlans]
  );

  const deleteWeeklyPlan = useCallback(
    async (planId: string) => {
      const next = weeklyPlans.filter((p) => p.id !== planId);
      const toastId = toast.loading('A eliminar plano semanal...');
      try {
        await persistWeeklyPlans(next, false);
        toast.success('Plano semanal eliminado com sucesso!', { id: toastId });
      } catch (err) {
        toast.error('Erro ao eliminar plano semanal', { id: toastId });
      }
    },
    [weeklyPlans, persistWeeklyPlans]
  );

  const duplicateWeeklyPlan = useCallback(
    async (planId: string) => {
      const existing = weeklyPlans.find((p) => p.id === planId);
      if (!existing) return;

      const newId = `weekly-${Date.now()}`;
      // Avança a semana em 7 dias automaticamente
      let nextStart = existing.semanaInicio;
      let nextEnd = existing.semanaFim;
      try {
        const s = new Date(`${existing.semanaInicio}T00:00:00`);
        s.setDate(s.getDate() + 7);
        nextStart = s.toISOString().split('T')[0];
        const e = new Date(s);
        e.setDate(s.getDate() + 6);
        nextEnd = e.toISOString().split('T')[0];
      } catch {}

      const duplicated: WeeklyPlan = {
        ...existing,
        id: newId,
        semanaInicio: nextStart,
        semanaFim: nextEnd,
        titulo: existing.titulo ? `${existing.titulo} (Próxima Semana)` : 'Plano Semanal',
        dias: existing.dias.map((d, idx) => {
          let dayDate = d.data;
          try {
            const curD = new Date(`${d.data}T00:00:00`);
            curD.setDate(curD.getDate() + 7);
            dayDate = curD.toISOString().split('T')[0];
          } catch {}
          return {
            ...d,
            id: `day-${newId}-${idx + 1}`,
            data: dayDate,
          };
        }),
      };

      const next = [duplicated, ...weeklyPlans];
      const toastId = toast.loading('A duplicar plano semanal para a semana seguinte...');
      try {
        await persistWeeklyPlans(next, false);
        toast.success('Plano semanal duplicado com sucesso!', { id: toastId });
      } catch (err) {
        toast.error('Erro ao duplicar plano semanal', { id: toastId });
      }
    },
    [weeklyPlans, persistWeeklyPlans]
  );

  return {
    weeklyPlans,
    isLoading,
    load,
    addWeeklyPlan,
    updateWeeklyPlan,
    deleteWeeklyPlan,
    duplicateWeeklyPlan,
  };
}
