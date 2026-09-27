import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Calendar, Clock, MapPin, Users, Music2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WeeklyPlan, WeeklyPlanDay, LessonPlan } from '../../types';

interface WeeklyPlanFormModalProps {
  plan?: WeeklyPlan;
  orchestras?: string[];
  dailyPlans?: LessonPlan[];
  onSave: (data: Omit<WeeklyPlan, 'id' | 'rowIndex'>) => void;
  onClose: () => void;
}

const DIAS_SEMANA_DEFAULT = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export default function WeeklyPlanFormModal({
  plan,
  orchestras = ['Orquestra Artave', 'Académica', 'Juvenil', 'Orquestra 10º ano'],
  dailyPlans = [],
  onSave,
  onClose,
}: WeeklyPlanFormModalProps) {
  // Predefinição de datas para a próxima segunda-feira se for novo
  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  const getNextSunday = (mondayStr: string) => {
    try {
      const monday = new Date(`${mondayStr}T00:00:00`);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return sunday.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const initialStart = plan?.semanaInicio || getNextMonday();
  const initialEnd = plan?.semanaFim || getNextSunday(initialStart);

  const [orquestra, setOrquestra] = useState(plan?.orquestra || 'Orquestra Artave');
  const [anoLetivo, setAnoLetivo] = useState(plan?.anoLetivo || '2026-2027');
  const [semanaInicio, setSemanaInicio] = useState(initialStart);
  const [semanaFim, setSemanaFim] = useState(initialEnd);
  const [titulo, setTitulo] = useState(plan?.titulo || '');
  const [avisosGerais, setAvisosGerais] = useState(plan?.avisosGerais || '');
  const [notasRodape, setNotasRodape] = useState(
    plan?.notasRodape || 'Escola Profissional Artística do Vale do Ave  - Luís Machado'
  );

  const [dias, setDias] = useState<WeeklyPlanDay[]>(() => {
    if (plan?.dias && plan.dias.length > 0) return plan.dias;
    return [
      {
        id: `day-${Date.now()}-1`,
        diaSemana: 'Segunda-feira',
        data: initialStart,
        horario: '17:30 - 19:30',
        local: 'Sala de Orquestra',
        naipes: 'Tutti',
        obras: '',
        observacoes: '',
      },
    ];
  });

  const handleStartDateChange = (newStart: string) => {
    setSemanaInicio(newStart);
    const newEnd = getNextSunday(newStart);
    setSemanaFim(newEnd);
  };

  const handleAddDay = () => {
    const nextOffset = dias.length;
    let nextDate = semanaInicio;
    let nextWeekday = DIAS_SEMANA_DEFAULT[nextOffset % DIAS_SEMANA_DEFAULT.length];

    try {
      const s = new Date(`${semanaInicio}T00:00:00`);
      s.setDate(s.getDate() + nextOffset);
      nextDate = s.toISOString().split('T')[0];
      const name = s.toLocaleDateString('pt-PT', { weekday: 'long' });
      nextWeekday = name.charAt(0).toUpperCase() + name.slice(1);
    } catch {}

    setDias((prev) => [
      ...prev,
      {
        id: `day-${Date.now()}-${prev.length + 1}`,
        diaSemana: nextWeekday,
        data: nextDate,
        horario: '17:30 - 19:30',
        local: 'Sala de Orquestra',
        naipes: 'Tutti',
        obras: '',
        observacoes: '',
      },
    ]);
  };

  const handleRemoveDay = (id: string) => {
    if (dias.length <= 1) {
      toast.error('O plano semanal deve ter pelo menos um dia de ensaio.');
      return;
    }
    setDias((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateDay = (id: string, field: keyof WeeklyPlanDay, value: string) => {
    setDias((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        if (field === 'data' && value) {
          try {
            const dt = new Date(`${value}T00:00:00`);
            const name = dt.toLocaleDateString('pt-PT', { weekday: 'long' });
            updated.diaSemana = name.charAt(0).toUpperCase() + name.slice(1);
          } catch {}
        }
        return updated;
      })
    );
  };

  // Botão Mágico: Compilar a partir dos Planos de Aula Diários existentes
  const handleAutoCompileFromDailyPlans = () => {
    if (!dailyPlans || dailyPlans.length === 0) {
      toast.error('Não existem planos de aula diários registados para compilar.');
      return;
    }

    const matching = dailyPlans.filter((dp) => {
      if (!dp.data) return false;
      const isWithinWeek = dp.data >= semanaInicio && dp.data <= semanaFim;
      const matchOrch =
        !orquestra ||
        orquestra === 'Todas' ||
        dp.orquestra.toLowerCase().includes(orquestra.toLowerCase()) ||
        orquestra.toLowerCase().includes(dp.orquestra.toLowerCase());
      return isWithinWeek && matchOrch;
    });

    if (matching.length === 0) {
      toast.error(
        `Nenhum plano de aula diário encontrado para a ${orquestra} entre ${semanaInicio} e ${semanaFim}.`
      );
      return;
    }

    const compiledDays: WeeklyPlanDay[] = matching.map((dp, idx) => {
      let weekday = 'Ensaio';
      try {
        const dObj = new Date(`${dp.data}T00:00:00`);
        const name = dObj.toLocaleDateString('pt-PT', { weekday: 'long' });
        weekday = name.charAt(0).toUpperCase() + name.slice(1);
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
        id: `compiled-${idx + 1}-${Date.now()}`,
        diaSemana: weekday,
        data: dp.data,
        horario: dp.hora || '17:30 - 19:30',
        local: 'Auditório / Sala de Orquestra',
        naipes: `Orquestra ${dp.orquestra}`,
        obras: obrasText || 'Trabalho de repertório geral',
        observacoes: dp.notas || '',
      };
    });

    setDias(compiledDays);
    toast.success(`✨ ${compiledDays.length} ensaio(s) importado(s) com sucesso dos planos de aula diários!`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!semanaInicio || !semanaFim) {
      toast.error('Por favor defina as datas de início e fim da semana.');
      return;
    }

    if (dias.length === 0) {
      toast.error('Adicione pelo menos um dia de ensaio.');
      return;
    }

    onSave({
      orquestra: orquestra || 'Orquestra Artave',
      anoLetivo: anoLetivo || '2026-2027',
      semanaInicio,
      semanaFim,
      titulo: titulo.trim() || undefined,
      dias,
      avisosGerais: avisosGerais.trim() || undefined,
      notasRodape: notasRodape.trim() || 'Escola Profissional Artística do Vale do Ave  - Luís Machado',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {plan ? 'Editar Plano Semanal de Ensaios' : 'Novo Plano Semanal de Ensaios'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Convocatória oficial para afixar no placard e enviar aos alunos e encarregados de educação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Dados Gerais do Plano Semanal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            {/* Orquestra */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Orquestra Convocada *
              </label>
              <input
                type="text"
                list="orchestras-list-weekly"
                value={orquestra}
                onChange={(e) => setOrquestra(e.target.value)}
                placeholder="ex: Orquestra Artave"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
                required
              />
              <datalist id="orchestras-list-weekly">
                {orchestras.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </div>

            {/* Ano Letivo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Ano Letivo *
              </label>
              <input
                type="text"
                value={anoLetivo}
                onChange={(e) => setAnoLetivo(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
                required
              />
            </div>

            {/* Título da Semana */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Título / Tema (Opcional)
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ex: Semana 4 — Preparação de Concerto"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
              />
            </div>

            {/* Início da Semana */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Início da Semana (Segunda-feira) *
              </label>
              <input
                type="date"
                value={semanaInicio}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
                required
              />
            </div>

            {/* Fim da Semana */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Fim da Semana (Domingo) *
              </label>
              <input
                type="date"
                value={semanaFim}
                onChange={(e) => setSemanaFim(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
                required
              />
            </div>

            {/* Botão de Auto-compilação inteligente */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAutoCompileFromDailyPlans}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-lg font-bold text-xs transition-colors"
                title="Puxar automaticamente todos os ensaios individuais registados para estas datas"
              >
                <Sparkles size={14} className="text-amber-500" />
                Compilar dos Planos de Aula
              </button>
            </div>
          </div>

          {/* Lista de Dias de Ensaio da Semana */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Calendar size={16} className="text-amber-500" /> Dias de Ensaio Convocados ({dias.length})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Defina os horários, locais, naipes e as obras que os alunos devem estudar para cada dia
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDay}
                className="flex items-center gap-1 px-3 py-1.5 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-amber-900 dark:text-amber-200 border border-amber-400/50 rounded-lg font-bold text-xs transition-all shadow-sm"
              >
                <Plus size={14} />
                Adicionar Dia
              </button>
            </div>

            <div className="space-y-4">
              {dias.map((dia, idx) => (
                <div
                  key={dia.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 inline-flex items-center justify-center text-[11px] font-black">
                        {idx + 1}
                      </span>
                      {dia.diaSemana || 'Dia de Ensaio'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDay(dia.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Remover este dia"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Dia da Semana */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Dia da Semana
                      </label>
                      <input
                        type="text"
                        value={dia.diaSemana}
                        onChange={(e) => handleUpdateDay(dia.id, 'diaSemana', e.target.value)}
                        placeholder="Segunda-feira"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-orchestra-gold"
                        required
                      />
                    </div>

                    {/* Data */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Data do Ensaio
                      </label>
                      <input
                        type="date"
                        value={dia.data}
                        onChange={(e) => handleUpdateDay(dia.id, 'data', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-orchestra-gold"
                        required
                      />
                    </div>

                    {/* Horário */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Horário
                      </label>
                      <input
                        type="text"
                        value={dia.horario}
                        onChange={(e) => handleUpdateDay(dia.id, 'horario', e.target.value)}
                        placeholder="17:30 - 19:30"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-orchestra-gold"
                        required
                      />
                    </div>

                    {/* Sala / Local */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Sala / Local
                      </label>
                      <input
                        type="text"
                        value={dia.local || ''}
                        onChange={(e) => handleUpdateDay(dia.id, 'local', e.target.value)}
                        placeholder="Auditório / Sala de Orquestra"
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-orchestra-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Convocatória / Naipes */}
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Naipes Convocados
                      </label>
                      <input
                        type="text"
                        value={dia.naipes || ''}
                        onChange={(e) => handleUpdateDay(dia.id, 'naipes', e.target.value)}
                        placeholder="ex: Tutti, Cordas, Madeiras..."
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-orchestra-gold"
                      />
                    </div>

                    {/* Observações / Recomendações */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        Observações Específicas
                      </label>
                      <input
                        type="text"
                        value={dia.observacoes || ''}
                        onChange={(e) => handleUpdateDay(dia.id, 'observacoes', e.target.value)}
                        placeholder="ex: Afinação pontual às 17h25; trazer surdinas..."
                        className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-orchestra-gold"
                      />
                    </div>
                  </div>

                  {/* Obras a Ensaiar & Programa de Estudo */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                      Obras a Ensaiar & Programa de Estudo * (Uma obra por linha)
                    </label>
                    <textarea
                      rows={2}
                      value={dia.obras}
                      onChange={(e) => handleUpdateDay(dia.id, 'obras', e.target.value)}
                      placeholder="• Beethoven: Sinfonia nº 5 (Andamento I - Comp. 1 a 124)&#10;• Márquez: Danzón nº 2"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white leading-relaxed focus:ring-1 focus:ring-orchestra-gold"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avisos Gerais e Rodapé */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Avisos aos Alunos & Famílias (Opcional)
              </label>
              <textarea
                rows={3}
                value={avisosGerais}
                onChange={(e) => setAvisosGerais(e.target.value)}
                placeholder="Avisos importantes sobre material, pontualidade ou faltas..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Texto do Rodapé Oficial
              </label>
              <input
                type="text"
                value={notasRodape}
                onChange={(e) => setNotasRodape(e.target.value)}
                placeholder="Escola Profissional Artística do Vale do Ave  - Luís Machado"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orchestra-gold focus:outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Aparece no fundo da folha oficial A4 e no e-mail aos alunos.
              </p>
            </div>
          </div>

          {/* Botões de Ação do Fundo */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orchestra-gold text-orchestra-navy font-bold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
            >
              {plan ? 'Guardar Alterações' : 'Criar Plano Semanal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
