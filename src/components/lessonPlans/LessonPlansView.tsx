import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Calendar,
  Clock,
  Music2,
  Pencil,
  Trash2,
  Printer,
  Copy,
  FileText,
  ChevronRight,
  Sparkles,
  Timer,
  Mail,
  Share2,
  MapPin,
  Users,
  CheckCircle2,
  CloudUpload,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { LessonPlan, LessonPlanItem, Piece, WeeklyPlan } from '../../types';
import LessonPlanFormModal from './LessonPlanFormModal';
import LessonPlanPrintModal from './LessonPlanPrintModal';
import WeeklyPlanFormModal from './WeeklyPlanFormModal';
import WeeklyPlanPrintModal, { generateWeeklyEmailBody } from './WeeklyPlanPrintModal';
import { useWeeklyPlans } from '../../hooks/useWeeklyPlans';
import { useSheets } from '../../context/SheetsContext';
import { parseDayRepertoire, hasSpecificHoursInRepertoire } from '../../utils/weeklyPlanParser';

interface LessonPlansViewProps {
  plans: LessonPlan[];
  orchestras?: string[];
  pieces?: Piece[];
  isLoading: boolean;
  onAdd: (data: Omit<LessonPlan, 'id' | 'rowIndex'>) => void;
  onUpdate: (plan: LessonPlan) => void;
  onDelete: (planId: string) => void;
  onDuplicate: (planId: string) => void;
}

type ViewMode = 'daily' | 'weekly';
type DateFilter = 'upcoming' | 'today' | 'past' | 'all';

function parseDateForSort(dateStr: string): number {
  try {
    let normalized = dateStr.trim();
    const ptDateMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ptDateMatch) {
      normalized = `${ptDateMatch[3]}-${ptDateMatch[2].padStart(2, '0')}-${ptDateMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr || !dateStr.trim()) {
    return { dia: '—', mes: 'DATA', ano: '', diaSemana: 'A definir', isToday: false };
  }
  try {
    let normalized = dateStr.trim();
    const ptDateMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ptDateMatch) {
      normalized = `${ptDateMatch[3]}-${ptDateMatch[2].padStart(2, '0')}-${ptDateMatch[1].padStart(2, '0')}`;
    }

    const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
    if (isNaN(d.getTime())) {
      return { dia: '—', mes: 'DATA', ano: '', diaSemana: 'A definir', isToday: false };
    }

    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    return {
      dia: d.toLocaleDateString('pt-PT', { day: '2-digit' }),
      mes: d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase(),
      ano: String(d.getFullYear()),
      diaSemana: d.toLocaleDateString('pt-PT', { weekday: 'long' }),
      isToday,
    };
  } catch {
    return { dia: '—', mes: 'DATA', ano: '', diaSemana: 'A definir', isToday: false };
  }
}

function formatDatePTShort(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

function calcTotalMinutes(items: LessonPlanItem[] = []): number {
  return items.reduce((acc, it) => {
    const m = typeof it.minuto === 'number' ? it.minuto : parseInt(String(it.minuto), 10) || 0;
    return acc + m;
  }, 0);
}

function computeItemTimeSlots(startTimeStr: string, items: LessonPlanItem[] = []): string[] {
  let currentMinutes = 15 * 60;
  const match = (startTimeStr || '').match(/(\d{1,2})[:h](\d{2})/i) || (startTimeStr || '').match(/(\d{1,2})/);
  if (match) {
    currentMinutes = parseInt(match[1], 10) * 60 + (match[2] ? parseInt(match[2], 10) : 0);
  }

  return items.map((item) => {
    const dur = typeof item.minuto === 'number' ? item.minuto : parseInt(String(item.minuto), 10) || 0;
    const sH = Math.floor(currentMinutes / 60) % 24;
    const sM = currentMinutes % 60;
    const endMinutes = currentMinutes + dur;
    const eH = Math.floor(endMinutes / 60) % 24;
    const eM = endMinutes % 60;
    currentMinutes = endMinutes;

    const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return `${fmt(sH, sM)} - ${fmt(eH, eM)}`;
  });
}

export default function LessonPlansView({
  plans,
  orchestras,
  pieces = [],
  isLoading,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
}: LessonPlansViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [search, setSearch] = useState('');
  const [filterOrquestra, setFilterOrquestra] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Modals diários
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | undefined>();
  const [printPlan, setPrintPlan] = useState<LessonPlan | undefined>();

  // Hook e Modals semanais
  const {
    weeklyPlans,
    isLoading: weeklyLoading,
    addWeeklyPlan,
    updateWeeklyPlan,
    deleteWeeklyPlan,
    duplicateWeeklyPlan,
    syncWithSheets,
  } = useWeeklyPlans();

  const { isLocalMode } = useSheets();

  const [isWeeklyFormModalOpen, setIsWeeklyFormModalOpen] = useState(false);
  const [editingWeeklyPlan, setEditingWeeklyPlan] = useState<WeeklyPlan | undefined>();
  const [printWeeklyPlan, setPrintWeeklyPlan] = useState<WeeklyPlan | undefined>();

  const validOrchestras = React.useMemo(() => {
    const defaultOrchestras = ['Orquestra Artave', 'Académica', 'Juvenil', 'Orquestra 10º ano'];
    const list = orchestras && orchestras.length > 0 ? orchestras : defaultOrchestras;
    const filtered = list
      .filter((o) => !/^alunos?$|chefe|geral|todos/i.test(o.trim()))
      .map((o) => (/^10[º°]?\s*ano$/i.test(o.trim()) ? 'Orquestra 10º ano' : o));
    const unique = Array.from(new Set(filtered));
    defaultOrchestras.forEach((def) => {
      if (!unique.includes(def)) unique.push(def);
    });
    return unique;
  }, [orchestras]);

  // Filtros de Planos Diários
  const filteredDaily = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    return plans
      .filter((p) => {
        if (filterOrquestra && p.orquestra !== filterOrquestra && p.orquestra !== 'Todas') {
          return false;
        }

        const pTime = parseDateForSort(p.data);
        if (dateFilter === 'today') {
          const isToday = pTime >= todayTime && pTime < todayTime + 86400000;
          if (!isToday) return false;
        } else if (dateFilter === 'upcoming') {
          if (pTime < todayTime) return false;
        } else if (dateFilter === 'past') {
          if (pTime >= todayTime) return false;
        }

        if (search.trim()) {
          const s = search.toLowerCase();
          const matchOrch = p.orquestra.toLowerCase().includes(s);
          const matchData = p.data.toLowerCase().includes(s);
          const matchHora = p.hora.toLowerCase().includes(s);
          const matchTitulo = (p.titulo || '').toLowerCase().includes(s);
          const matchNotas = (p.notas || '').toLowerCase().includes(s);
          const matchItens = (p.itens || []).some(
            (it) =>
              it.obra.toLowerCase().includes(s) ||
              it.atividade.toLowerCase().includes(s) ||
              (it.notas && it.notas.toLowerCase().includes(s))
          );
          if (!matchOrch && !matchData && !matchHora && !matchTitulo && !matchNotas && !matchItens) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => parseDateForSort(a.data) - parseDateForSort(b.data));
  }, [plans, filterOrquestra, dateFilter, search]);

  // Filtros de Planos Semanais
  const filteredWeekly = React.useMemo(() => {
    return weeklyPlans
      .filter((wp) => {
        if (filterOrquestra && wp.orquestra !== filterOrquestra && wp.orquestra !== 'Todas') {
          return false;
        }

        if (search.trim()) {
          const s = search.toLowerCase();
          const matchOrch = wp.orquestra.toLowerCase().includes(s);
          const matchTitulo = (wp.titulo || '').toLowerCase().includes(s);
          const matchDatas = `${wp.semanaInicio} ${wp.semanaFim}`.toLowerCase().includes(s);
          const matchAvisos = (wp.avisosGerais || '').toLowerCase().includes(s);
          const matchDias = (wp.dias || []).some(
            (d) =>
              d.diaSemana.toLowerCase().includes(s) ||
              d.obras.toLowerCase().includes(s) ||
              (d.naipes && d.naipes.toLowerCase().includes(s)) ||
              (d.observacoes && d.observacoes.toLowerCase().includes(s))
          );
          if (!matchOrch && !matchTitulo && !matchDatas && !matchAvisos && !matchDias) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => parseDateForSort(b.semanaInicio) - parseDateForSort(a.semanaInicio));
  }, [weeklyPlans, filterOrquestra, search]);

  const stats = React.useMemo(() => {
    const totalMinutes = plans.reduce((acc, p) => acc + calcTotalMinutes(p.itens), 0);
    return {
      totalPlans: plans.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalWeekly: weeklyPlans.length,
    };
  }, [plans, weeklyPlans]);

  const handleAddDaily = () => {
    setEditingPlan(undefined);
    setIsFormModalOpen(true);
  };

  const handleEditDaily = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setIsFormModalOpen(true);
  };

  const handleSaveDailyModal = (data: Omit<LessonPlan, 'id' | 'rowIndex'>) => {
    if (editingPlan) {
      onUpdate({ ...editingPlan, ...data });
    } else {
      onAdd(data);
    }
    setIsFormModalOpen(false);
  };

  const handleDeleteDaily = (plan: LessonPlan) => {
    if (
      window.confirm(
        `Eliminar o plano de aula de "${plan.orquestra}" (${plan.data})? Esta ação irá também removê-lo da folha de cálculo Google Sheets.`
      )
    ) {
      onDelete(plan.id);
    }
  };

  // Handlers para Planos Semanais
  const handleAddWeekly = () => {
    setEditingWeeklyPlan(undefined);
    setIsWeeklyFormModalOpen(true);
  };

  const handleEditWeekly = (wp: WeeklyPlan) => {
    setEditingWeeklyPlan(wp);
    setIsWeeklyFormModalOpen(true);
  };

  const handleSaveWeeklyModal = (data: Omit<WeeklyPlan, 'id' | 'rowIndex'>) => {
    if (editingWeeklyPlan) {
      updateWeeklyPlan({ ...editingWeeklyPlan, ...data });
    } else {
      addWeeklyPlan(data);
    }
    setIsWeeklyFormModalOpen(false);
  };

  const handleDeleteWeekly = (wp: WeeklyPlan) => {
    if (
      window.confirm(
        `Eliminar o plano semanal de "${wp.orquestra}" (Semana de ${wp.semanaInicio})?`
      )
    ) {
      deleteWeeklyPlan(wp.id);
    }
  };

  const handleSendEmailDirect = (wp: WeeklyPlan) => {
    const orch = wp.orquestra || 'Orquestra Artave';
    const range = `${formatDatePTShort(wp.semanaInicio)} a ${formatDatePTShort(wp.semanaFim)}`;
    const subject = encodeURIComponent(
      `[${orch}] Plano Semanal de Ensaios (${range})`
    );
    const body = encodeURIComponent(generateWeeklyEmailBody(wp));
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
    toast.success(
      'Gmail aberto num novo separador! Lembre-se de anexar o PDF clicando no clipe (📎) no Gmail.',
      { duration: 7000 }
    );
  };

  const handleCopyWhatsAppDirect = async (wp: WeeklyPlan) => {
    try {
      const text = generateWeeklyEmailBody(wp);
      await navigator.clipboard.writeText(text);
      toast.success('Texto copiado! Pronto para colar no WhatsApp ou Teams.');
    } catch {
      toast.error('Não foi possível copiar o texto automaticamente.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header com Seletor de Modo: Diário vs Semanal */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="text-orchestra-gold" size={24} />
            {viewMode === 'daily' ? 'Planos de Aula & Ensaios (Maestro)' : 'Planos Semanais de Ensaios'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {viewMode === 'daily'
              ? 'Organização detalhada ao minuto para o maestro na estante: obras, tempos e atividades'
              : 'Planos semanais de ensaios aos alunos: dias, horas, locais e repertório de estudo'}
          </p>
        </div>

        {/* Seletor Diário / Semanal */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 dark:bg-gray-800 rounded-xl self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock size={14} className={viewMode === 'daily' ? 'text-amber-500' : 'text-gray-400'} />
            <span>Por Aula / Ensaio</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
              {plans.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'weekly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar size={14} className={viewMode === 'weekly' ? 'text-amber-500' : 'text-gray-400'} />
            <span>Plano Semanal</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
              {weeklyPlans.length}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Pesquisa */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={viewMode === 'daily' ? 'Pesquisar obra, atividade...' : 'Pesquisar semana, obra, dia...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

          {/* Filtro por Orquestra */}
          <select
            value={filterOrquestra}
            onChange={(e) => setFilterOrquestra(e.target.value)}
            className="text-sm bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-amber-900 dark:text-amber-200 font-semibold focus:outline-none focus:ring-2 focus:ring-orchestra-gold shadow-sm"
          >
            <option value="">Todas as Orquestras</option>
            {validOrchestras.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          {/* Abas de data no modo diário */}
          {viewMode === 'daily' && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  dateFilter === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setDateFilter('upcoming')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  dateFilter === 'upcoming'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Próximos
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  dateFilter === 'today'
                    ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Hoje
              </button>
            </div>
          )}
        </div>

        {/* Botão de Criação Conforme Modo */}
        {viewMode === 'daily' ? (
          <button
            onClick={handleAddDaily}
            className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-bold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
          >
            <Plus size={16} />
            Novo Plano de Aula
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncWithSheets()}
              disabled={weeklyLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer"
              title="Guardar e sincronizar os planos semanais com a folha Google Sheets"
            >
              <CloudUpload size={15} className={weeklyLoading ? 'animate-bounce text-amber-500' : 'text-amber-600'} />
              <span>Guardar no Sheets</span>
            </button>

            <button
              onClick={handleAddWeekly}
              className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-bold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow cursor-pointer"
            >
              <Plus size={16} />
              Novo Plano Semanal
            </button>
          </div>
        )}
      </div>

      {/* ──────────────── MODO 1: PLANOS POR AULA / ENSAIO (DIÁRIO) ──────────────── */}
      {viewMode === 'daily' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 space-y-4"
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700/60 rounded w-2/3" />
                  <div className="h-24 bg-gray-50 dark:bg-gray-700/40 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredDaily.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-amber-500/10 text-orchestra-gold rounded-full flex items-center justify-center mx-auto">
                <CalendarCheck size={28} />
              </div>
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">
                Nenhum plano de aula encontrado
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                {plans.length === 0
                  ? 'Comece por estruturar o seu próximo ensaio de orquestra com obras, duração em minutos e objetivos de trabalho.'
                  : 'Nenhum plano corresponde aos filtros ou pesquisa selecionada.'}
              </p>
              <button
                onClick={handleAddDaily}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
              >
                <Plus size={16} />
                Criar Primeiro Plano de Aula
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredDaily.map((plan) => {
                const dateObj = formatDateDisplay(plan.data);
                const totalMin = calcTotalMinutes(plan.itens);
                const timeSlots = computeItemTimeSlots(plan.hora, plan.itens);

                return (
                  <div
                    key={plan.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Top Header */}
                      <div className="p-5 pb-4 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-800/80 dark:to-gray-800">
                        <div className="flex items-center gap-3.5">
                          {/* Calendar Badge */}
                          <div
                            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border flex-shrink-0 shadow-sm ${
                              dateObj.isToday
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-orchestra-gold/15 dark:bg-orchestra-gold/20 border-orchestra-gold/40 text-orchestra-navy dark:text-orchestra-gold'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                              {dateObj.mes}
                            </span>
                            <span className="text-xl font-black leading-none mt-0.5">
                              {dateObj.dia}
                            </span>
                            <span className="text-[9px] opacity-70 leading-none mt-0.5">
                              {dateObj.ano}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                Orquestra {plan.orquestra}
                              </span>
                              {dateObj.isToday && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse">
                                  Hoje
                                </span>
                              )}
                              <span className="text-xs text-gray-400 capitalize">
                                {dateObj.diaSemana}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1.5">
                              <Clock size={14} className="text-amber-500" />
                              <span>{plan.hora}</span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-gray-500 dark:text-gray-400 font-normal">
                                Duração: <strong>{totalMin} min</strong>
                              </span>
                            </div>

                            {plan.titulo && (
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                {plan.titulo}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setPrintPlan(plan)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                            title="Modo Estante & Imprimir"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => onDuplicate(plan.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            title="Duplicar para outro ensaio"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleEditDaily(plan)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                            title="Editar plano"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDaily(plan)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            title="Eliminar plano"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body: Timeline & Activities */}
                      <div className="p-5 space-y-4">
                        <div className="space-y-2.5">
                          {(plan.itens || []).map((item, idx) => {
                            const slot = timeSlots[idx] || '';
                            return (
                              <div
                                key={item.id || idx}
                                className="p-3 bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:border-amber-200 dark:hover:border-amber-900/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-[11px] flex items-center justify-center shadow-xs">
                                      {idx + 1}
                                    </span>
                                    <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                      <Music2 size={13} className="text-orchestra-gold" />
                                      {item.obra}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {slot && (
                                      <span className="font-mono text-[11px] text-gray-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                        {slot}
                                      </span>
                                    )}
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
                                      {item.minuto} min
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-line pl-7">
                                  {item.atividade}
                                </p>

                                {item.notas && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80 italic mt-1.5 pl-7">
                                    📌 {item.notas}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Observações Gerais */}
                        {plan.notas && (
                          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <FileText size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="leading-relaxed whitespace-pre-line italic">
                              {plan.notas}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
                      <span>{(plan.itens || []).length} atividades programadas</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPrintPlan(plan)}
                          className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1.5"
                        >
                          <Printer size={14} />
                          Imprimir / PDF
                        </button>
                        <button
                          onClick={() => handleEditDaily(plan)}
                          className="text-gray-600 dark:text-gray-300 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          Editar <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ──────────────── MODO 2: PLANOS SEMANAIS DE ENSAIOS (ALUNOS) ──────────────── */}
      {viewMode === 'weekly' && (
        <>
          {isLocalMode && (
            <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 animate-ping" />
                <span>
                  <strong>Modo Local:</strong> Os planos estão guardados neste navegador. Para os gravar e sincronizar com o Google Sheets, ligue a sua folha no botão <strong>"Ligar ao Google Sheets"</strong> ou <strong>"Alterar"</strong> no topo da página.
                </span>
              </div>
            </div>
          )}

          {weeklyLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 space-y-4"
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700/60 rounded w-1/2" />
                  <div className="h-32 bg-gray-50 dark:bg-gray-700/40 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredWeekly.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-amber-500/10 text-orchestra-gold rounded-full flex items-center justify-center mx-auto">
                <Calendar size={28} />
              </div>
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">
                Nenhum plano semanal encontrado
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Crie um plano semanal com os diferentes dias de ensaio e as obras a estudar para afixar no placard ou enviar diretamente por email aos alunos e famílias.
              </p>
              <button
                onClick={handleAddWeekly}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-bold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
              >
                <Plus size={16} />
                Criar Primeiro Plano Semanal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredWeekly.map((wp) => {
                return (
                  <div
                    key={wp.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700/60 bg-gradient-to-r from-amber-50/40 to-white dark:from-gray-800/80 dark:to-gray-800 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              {wp.orquestra || 'Orquestra Artave'}
                            </span>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                              Ano letivo {wp.anoLetivo || '2026-2027'}
                            </span>
                          </div>

                          <h2 className="text-base font-bold text-gray-900 dark:text-white pt-1">
                            {wp.titulo || 'Plano Semanal de Ensaios'}
                          </h2>

                          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Calendar size={13} className="text-amber-600" />
                            <span>
                              Semana de {formatDatePTShort(wp.semanaInicio)} a {formatDatePTShort(wp.semanaFim)}
                            </span>
                          </p>
                        </div>

                        {/* Ações de Topo do Card */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setPrintWeeklyPlan(wp)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                            title="Gerar PDF A4 Limpo"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleSendEmailDirect(wp)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            title="Enviar no Gmail"
                          >
                            <Mail size={16} />
                          </button>
                          <button
                            onClick={() => handleCopyWhatsAppDirect(wp)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                            title="Copiar texto para WhatsApp"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => duplicateWeeklyPlan(wp.id)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Duplicar para a Próxima Semana (+7 dias)"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => handleEditWeekly(wp)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                            title="Editar plano semanal"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteWeekly(wp)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            title="Eliminar plano semanal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body: Dias da Semana */}
                      <div className="p-5 space-y-3">
                        <div className="space-y-2.5">
                          {(wp.dias || []).map((dia, idx) => (
                            <div
                              key={dia.id || idx}
                              className="p-3 bg-stone-50/80 dark:bg-gray-900/50 rounded-xl border border-stone-200/80 dark:border-gray-700/60"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-stone-200/50 dark:border-gray-700/50">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs uppercase tracking-wider text-stone-900 dark:text-white">
                                    {dia.diaSemana}
                                  </span>
                                  <span className="text-[11px] text-stone-500 dark:text-gray-400 font-medium">
                                    {formatDatePTShort(dia.data)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                                    {dia.horario || 'A definir'}
                                  </span>
                                  {dia.naipes && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                                      {dia.naipes.replace(/tutti\s+geral/gi, 'Tutti')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {(() => {
                                const repItems = parseDayRepertoire(dia.obras, dia.horario);
                                const hasSpecific = hasSpecificHoursInRepertoire(repItems);

                                if (hasSpecific && repItems.length > 0) {
                                  return (
                                    <div className="pt-2 space-y-1.5">
                                      {repItems.map((it, itemIdx) => (
                                        <div
                                          key={it.id || itemIdx}
                                          className="flex items-start gap-2 p-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30"
                                        >
                                          {it.horario && (
                                            <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-200 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-2xs border border-amber-200 dark:border-amber-800 flex-shrink-0">
                                              {it.horario}
                                            </span>
                                          )}
                                          <span className="text-xs font-bold text-stone-900 dark:text-white leading-snug">
                                            {it.obra}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }

                                return (
                                  <div className="pt-2 text-xs text-stone-800 dark:text-gray-200 whitespace-pre-line leading-relaxed font-medium">
                                    {dia.obras}
                                  </div>
                                );
                              })()}

                              {dia.observacoes && (
                                <p className="text-[11px] text-stone-500 dark:text-gray-400 italic mt-1.5">
                                  {dia.observacoes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Avisos Gerais */}
                        {wp.avisosGerais && (
                          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300 mb-0.5">
                              Avisos Importantes:
                            </span>
                            <p className="whitespace-pre-line leading-relaxed">{wp.avisosGerais}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3 bg-stone-50 dark:bg-gray-900/30 border-t border-stone-200/80 dark:border-gray-700/60 flex items-center justify-between text-xs text-stone-500 dark:text-gray-400">
                      <span>{(wp.dias || []).length} dia(s) nesta semana</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPrintWeeklyPlan(wp)}
                          className="text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-1.5"
                        >
                          <Printer size={14} />
                          Imprimir / PDF
                        </button>
                        <button
                          onClick={() => handleEditWeekly(wp)}
                          className="text-stone-700 dark:text-gray-300 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          Editar <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ──────────────── MODALS DIÁRIOS ──────────────── */}
      {isFormModalOpen && (
        <LessonPlanFormModal
          plan={editingPlan}
          orchestras={validOrchestras}
          pieces={pieces}
          onSave={handleSaveDailyModal}
          onClose={() => setIsFormModalOpen(false)}
        />
      )}

      {printPlan && (
        <LessonPlanPrintModal
          plan={printPlan}
          onClose={() => setPrintPlan(undefined)}
        />
      )}

      {/* ──────────────── MODALS SEMANAIS ──────────────── */}
      {isWeeklyFormModalOpen && (
        <WeeklyPlanFormModal
          plan={editingWeeklyPlan}
          orchestras={validOrchestras}
          dailyPlans={plans}
          onSave={handleSaveWeeklyModal}
          onClose={() => setIsWeeklyFormModalOpen(false)}
        />
      )}

      {printWeeklyPlan && (
        <WeeklyPlanPrintModal
          plan={printWeeklyPlan}
          onClose={() => setPrintWeeklyPlan(undefined)}
        />
      )}
    </div>
  );
}
