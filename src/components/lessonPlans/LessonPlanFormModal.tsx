import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Clock, Music2, Calendar, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import type { LessonPlan, LessonPlanItem, Piece } from '../../types';

interface LessonPlanFormModalProps {
  plan?: LessonPlan;
  orchestras: string[];
  pieces?: Piece[];
  onSave: (data: Omit<LessonPlan, 'id' | 'rowIndex'>) => void;
  onClose: () => void;
}

// Calcula horários cumulativos a partir da hora de início e dos minutos de cada item
function computeTimeline(startTimeStr: string, items: LessonPlanItem[]): Array<{ timeSlot: string; duration: number }> {
  let startHour = 15;
  let startMinute = 0;

  const match = startTimeStr.match(/(\d{1,2})[:h](\d{2})/i) || startTimeStr.match(/(\d{1,2})/);
  if (match) {
    startHour = parseInt(match[1], 10);
    startMinute = match[2] ? parseInt(match[2], 10) : 0;
  }

  let currentTotalMinutes = startHour * 60 + startMinute;

  return items.map((item) => {
    const dur = typeof item.minuto === 'number' ? item.minuto : parseInt(String(item.minuto), 10) || 0;
    const startH = Math.floor(currentTotalMinutes / 60) % 24;
    const startM = currentTotalMinutes % 60;

    const nextTotalMinutes = currentTotalMinutes + dur;
    const endH = Math.floor(nextTotalMinutes / 60) % 24;
    const endM = nextTotalMinutes % 60;

    currentTotalMinutes = nextTotalMinutes;

    const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return {
      timeSlot: `${fmt(startH, startM)} - ${fmt(endH, endM)}`,
      duration: dur,
    };
  });
}

export default function LessonPlanFormModal({
  plan,
  orchestras,
  pieces = [],
  onSave,
  onClose,
}: LessonPlanFormModalProps) {
  const [orquestra, setOrquestra] = useState(plan?.orquestra || orchestras[0] || 'Académica');
  const [data, setData] = useState(plan?.data || new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(plan?.hora || '15:00 - 17:00');
  const [titulo, setTitulo] = useState(plan?.titulo || '');
  const [notas, setNotas] = useState(plan?.notas || '');

  const [itens, setItens] = useState<LessonPlanItem[]>(() => {
    if (plan?.itens && plan.itens.length > 0) {
      return plan.itens.map((it, idx) => ({ ...it, id: it.id || `item-${idx}` }));
    }
    return [
      {
        id: 'item-1',
        obra: 'Afinação e Aquecimento',
        minuto: 15,
        atividade: 'Afinação por naipes e exercícios de sonoridade e arpejos',
        notas: '',
      },
      {
        id: 'item-2',
        obra: '',
        minuto: 45,
        atividade: 'Trabalho de compassos específicos e precisão rítmica',
        notas: '',
      },
    ];
  });

  // Obras disponíveis para a orquestra selecionada ou de repertório geral
  const availablePieces = React.useMemo(() => {
    return pieces.filter(
      (p) => !p.orquestra || p.orquestra === orquestra || p.orquestra === 'Todas'
    );
  }, [pieces, orquestra]);

  const totalMinutos = React.useMemo(() => {
    return itens.reduce((sum, it) => {
      const m = typeof it.minuto === 'number' ? it.minuto : parseInt(String(it.minuto), 10) || 0;
      return sum + m;
    }, 0);
  }, [itens]);

  const timeline = React.useMemo(() => {
    return computeTimeline(hora, itens);
  }, [hora, itens]);

  const handleAddItem = () => {
    const newItem: LessonPlanItem = {
      id: `item-${Date.now()}`,
      obra: '',
      minuto: 30,
      atividade: '',
      notas: '',
    };
    setItens([...itens, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof LessonPlanItem, value: any) => {
    setItens(
      itens.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (itens.length <= 1) {
      handleUpdateItem(id, 'obra', '');
      handleUpdateItem(id, 'atividade', '');
      return;
    }
    setItens(itens.filter((it) => it.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...itens];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setItens(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === itens.length - 1) return;
    const next = [...itens];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setItens(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orquestra.trim() || !data.trim()) return;

    // Filtra itens vazios
    const validItens = itens.filter((it) => it.obra.trim() || it.atividade.trim());

    onSave({
      orquestra,
      data,
      hora: hora.trim() || '15:00 - 17:00',
      titulo: titulo.trim() || undefined,
      itens: validItens.length > 0 ? validItens : itens,
      notas: notas.trim() || undefined,
    });
    onClose();
  };

  const setDateToToday = () => {
    setData(new Date().toISOString().split('T')[0]);
  };

  const setDateToNextSaturday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setData(d.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 shadow-2xl my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orchestra-gold/20 text-orchestra-gold flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {plan ? 'Editar Plano de Aula' : 'Novo Plano de Aula / Ensaio'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Define a orquestra, data, hora e as obras com duração e atividades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form id="lesson-plan-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Seção 1: Dados Gerais do Ensaio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
            {/* Orquestra */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                Orquestra *
              </label>
              <select
                value={orquestra}
                onChange={(e) => setOrquestra(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-orchestra-gold outline-none"
              >
                {orchestras.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Data *
                </label>
                <div className="flex gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={setDateToToday}
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Hoje
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={setDateToNextSaturday}
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Sábado
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold outline-none"
              />
            </div>

            {/* Hora */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Horário *</span>
                <span className="text-[10px] text-gray-400 normal-case">ex: 15:00 - 17:00</span>
              </label>
              <input
                type="text"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                placeholder="15:00 - 17:00"
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold outline-none"
              />
            </div>

            {/* Título ou Tema Opcional */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                Título ou Tema do Ensaio (Opcional)
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ex: Ensaio Tutti - Preparação Concerto de Natal"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold outline-none"
              />
            </div>
          </div>

          {/* Seção 2: Atividades / Obras / Minutos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music2 size={16} className="text-orchestra-gold" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Estrutura do Ensaio (Obra / Duração / Atividade)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  Total: {totalMinutos} min ({Math.floor(totalMinutos / 60)}h{' '}
                  {totalMinutos % 60 > 0 ? `${totalMinutos % 60}m` : '00m'})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-orchestra-gold text-orchestra-navy rounded-lg hover:bg-orchestra-gold-light transition-colors shadow-sm"
                >
                  <Plus size={14} /> Adicionar Obra
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {itens.map((item, idx) => {
                const timeInfo = timeline[idx];
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3 relative group"
                  >
                    {/* Item Top Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orchestra-gold/20 text-orchestra-navy dark:text-orchestra-gold font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {timeInfo && (
                          <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {timeInfo.timeSlot}
                          </span>
                        )}
                      </div>

                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Mover para cima"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === itens.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Mover para baixo"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Remover atividade"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Inputs Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Obra / Título */}
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          Obra ou Seção de Ensaio *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            list={`pieces-list-${idx}`}
                            value={item.obra}
                            onChange={(e) => handleUpdateItem(item.id, 'obra', e.target.value)}
                            placeholder="ex: Sinfonia nº 5, ou Afinação / Aquecimento"
                            required
                            className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold outline-none"
                          />
                          <datalist id={`pieces-list-${idx}`}>
                            <option value="Afinação e Aquecimento" />
                            <option value="Pausa / Intervalo" />
                            <option value="Trabalho de Cordas" />
                            <option value="Trabalho de Sopros e Percussão" />
                            <option value="Leitura à primeira vista" />
                            {availablePieces.map((p, pIdx) => (
                              <option key={pIdx} value={p.titulo}>
                                {p.compositor ? `${p.titulo} (${p.compositor})` : p.titulo}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* Minuto / Duração */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          Duração (Minutos) *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="240"
                            value={item.minuto}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'minuto', parseInt(e.target.value, 10) || 0)
                            }
                            required
                            className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-orchestra-gold outline-none"
                          />
                          <span className="text-xs text-gray-400">min</span>
                        </div>
                      </div>

                      {/* Atividade / Compassos / Foco */}
                      <div className="sm:col-span-12">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          Atividade & Foco no Ensaio *
                        </label>
                        <textarea
                          rows={2}
                          value={item.atividade}
                          onChange={(e) => handleUpdateItem(item.id, 'atividade', e.target.value)}
                          placeholder="Compassos a trabalhar, articulações, afinação, dinâmicas, entradas de naipes..."
                          required
                          className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold outline-none resize-none"
                        />
                      </div>

                      {/* Notas Específicas do Item */}
                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          value={item.notas || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'notas', e.target.value)}
                          placeholder="Observações da obra (ex: chamada de solista, divisão de arcadas, etc.)"
                          className="w-full px-3 py-1 text-xs bg-transparent border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:border-orchestra-gold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 3: Observações Gerais */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-gray-400" />
              Observações Gerais do Ensaio
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Avisos aos alunos, fardamento, entrega de material, presença de encarregados de educação..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold outline-none resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total planeado: <strong className="text-gray-900 dark:text-white">{totalMinutos} min</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="lesson-plan-form"
              className="px-5 py-2 text-sm font-semibold bg-orchestra-gold text-orchestra-navy hover:bg-orchestra-gold-light rounded-lg transition-colors shadow"
            >
              {plan ? 'Atualizar Plano' : 'Criar Plano de Aula'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
