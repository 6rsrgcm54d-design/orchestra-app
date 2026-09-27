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
  ListOrdered,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { LessonPlan, LessonPlanItem, Piece } from '../../types';
import LessonPlanFormModal from './LessonPlanFormModal';
import LessonPlanPrintModal from './LessonPlanPrintModal';

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
  orchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'],
  pieces = [],
  isLoading,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
}: LessonPlansViewProps) {
  const [search, setSearch] = useState('');
  const [filterOrquestra, setFilterOrquestra] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | undefined>();
  const [printPlan, setPrintPlan] = useState<LessonPlan | undefined>();

  const validOrchestras = React.useMemo(() => {
    const defaultOrchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'];
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

  // Filtros e ordenação
  const filtered = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    return plans
      .filter((p) => {
        // Filtro por Orquestra
        if (filterOrquestra && p.orquestra !== filterOrquestra && p.orquestra !== 'Todas') {
          return false;
        }

        // Filtro por Data
        const pTime = parseDateForSort(p.data);
        if (dateFilter === 'today') {
          const isToday = pTime >= todayTime && pTime < todayTime + 86400000;
          if (!isToday) return false;
        } else if (dateFilter === 'upcoming') {
          if (pTime < todayTime) return false;
        } else if (dateFilter === 'past') {
          if (pTime >= todayTime) return false;
        }

        // Filtro por Pesquisa de Texto
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
      .sort((a, b) => {
        const timeA = parseDateForSort(a.data);
        const timeB = parseDateForSort(b.data);
        return timeA - timeB;
      });
  }, [plans, filterOrquestra, dateFilter, search]);

  const stats = React.useMemo(() => {
    const totalMinutes = plans.reduce((acc, p) => acc + calcTotalMinutes(p.itens), 0);
    const now = new Date().getTime();
    const upcoming = plans
      .filter((p) => parseDateForSort(p.data) >= now)
      .sort((a, b) => parseDateForSort(a.data) - parseDateForSort(b.data))[0];

    return {
      totalPlans: plans.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      nextRehearsal: upcoming ? `${upcoming.orquestra} (${upcoming.data})` : 'Nenhum agendado',
    };
  }, [plans]);

  const handleAdd = () => {
    setEditingPlan(undefined);
    setIsFormModalOpen(true);
  };

  const handleEdit = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setIsFormModalOpen(true);
  };

  const handleSaveModal = (data: Omit<LessonPlan, 'id' | 'rowIndex'>) => {
    if (editingPlan) {
      onUpdate({ ...editingPlan, ...data });
    } else {
      onAdd(data);
    }
  };

  const handleDelete = (plan: LessonPlan) => {
    if (
      window.confirm(
        `Tem a certeza de que deseja eliminar o plano de aula da ${plan.orquestra} de ${plan.data}?`
      )
    ) {
      onDelete(plan.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="text-orchestra-gold" size={24} />
            Planos de Aula & Ensaios
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Organização detalhada por orquestra: obras, tempos previstos e atividades de ensaio
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar obra, atividade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

          {/* Orchestra filter */}
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

          {/* Add Plan button */}
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
          >
            <Plus size={16} />
            Novo Plano de Aula
          </button>
        </div>
      </div>

      {/* Date Filter Tabs & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        {/* Date Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dateFilter === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todos ({plans.length})
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dateFilter === 'upcoming'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Próximos
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dateFilter === 'today'
                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter('past')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dateFilter === 'past'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Anteriores
          </button>
        </div>

        {/* Quick summary metrics */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Timer size={14} className="text-orchestra-gold" />
            Total: <strong className="text-gray-800 dark:text-gray-200">{stats.totalHours} horas</strong> planeadas
          </span>
        </div>
      </div>

      {/* Main Content Area */}
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
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3">
          <div className="w-14 h-14 bg-amber-500/10 text-orchestra-gold rounded-full flex items-center justify-center mx-auto">
            <CalendarCheck size={28} />
          </div>
          <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">
            Nenhum plano de aula encontrado
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {plans.length === 0
              ? 'Comece por estruturar a sua próxima aula ou ensaio de orquestra com obras, duração em minutos e objetivos de trabalho.'
              : 'Nenhum plano corresponde aos filtros ou pesquisa selecionada.'}
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
          >
            <Plus size={16} />
            Criar Primeiro Plano de Aula
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map((plan) => {
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
                        onClick={() => handleEdit(plan)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                        title="Editar plano"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
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

                    {/* General Conductor Notes */}
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
                      onClick={() => handleEdit(plan)}
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

      {/* Form Modal (Add / Edit) */}
      {isFormModalOpen && (
        <LessonPlanFormModal
          plan={editingPlan}
          orchestras={validOrchestras}
          pieces={pieces}
          onSave={handleSaveModal}
          onClose={() => setIsFormModalOpen(false)}
        />
      )}

      {/* Print / Stand Modal */}
      {printPlan && (
        <LessonPlanPrintModal
          plan={printPlan}
          onClose={() => setPrintPlan(undefined)}
        />
      )}
    </div>
  );
}
