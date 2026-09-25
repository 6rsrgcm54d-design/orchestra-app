import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sparkles,
  Save,
  Search,
  CheckCircle2,
  Filter,
  Users,
  Award,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Evaluation, Student, Criteria } from '../../types';
import { groupByStudent, groupByCriteria, calcAverage, exportEvaluationsToCSV } from '../../utils/csvExport';
import {
  generateObservationText,
  LEVEL_LABELS,
  DEFAULT_LEVEL_TEMPLATES,
  getStoredLevelTemplates,
} from '../../utils/nameParser';
import LevelTemplatesModal from './LevelTemplatesModal';
import EvaluationForm from './EvaluationForm';

interface EvaluationsViewProps {
  evaluations: Evaluation[];
  students: Student[];
  criteria: Criteria[];
  orchestras?: string[];
  levelTemplates?: Record<number, string>;
  isLoading: boolean;
  onUpdateEvaluation?: (ev: Evaluation) => void;
  onSaveSingleEvaluation?: (
    student: Student,
    level: number,
    obs: string,
    rowIndex?: number
  ) => Promise<void>;
  onSaveAll?: (evals: Evaluation[], allStudents?: Student[]) => Promise<void>;
  onSaveLevelTemplates?: (newTemplates: Record<number, string>) => void;
  onAdd: (ev: Omit<Evaluation, 'id' | 'rowIndex'>) => void;
  onDelete: (ev: Evaluation) => void;
}

function studentKey(nome: string, orquestra?: string): string {
  return `${(nome || '').trim().toLowerCase()}|${(orquestra || '').trim().toLowerCase()}`;
}

export default function EvaluationsView({
  evaluations,
  students,
  criteria,
  orchestras = ['Académica', 'Juvenil', 'Artave'],
  levelTemplates: propLevelTemplates,
  isLoading,
  onUpdateEvaluation,
  onSaveSingleEvaluation,
  onSaveAll,
  onSaveLevelTemplates,
  onAdd,
  onDelete,
}: EvaluationsViewProps) {
  // Modal de edição de modelos de níveis 1 a 5
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'pauta' | 'byStudent' | 'byCriteria'>('pauta');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Filtros
  const [selectedOrchestra, setSelectedOrchestra] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [selectedNaipe, setSelectedNaipe] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'avaliados' | 'pendentes'>('todos');

  // Estado de gravação
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modelos de observação (1 a 5)
  const [templates, setTemplates] = useState<Record<number, string>>(() => {
    return propLevelTemplates || getStoredLevelTemplates();
  });

  useEffect(() => {
    if (propLevelTemplates) {
      setTemplates(propLevelTemplates);
    }
  }, [propLevelTemplates]);

  // Mapa local de avaliações indexado por aluno
  const [evalMap, setEvalMap] = useState<Record<string, Evaluation>>({});

  // Sincroniza evalMap inicial com as avaliações recebidas
  useEffect(() => {
    const map: Record<string, Evaluation> = {};
    evaluations.forEach((ev) => {
      if ((ev.pontuacao && ev.pontuacao > 0) || (ev.observacoes && ev.observacoes.trim().length > 0)) {
        const key = studentKey(ev.nomeAluno, ev.orquestra);
        map[key] = ev;
        // Indexa também só pelo nome caso a orquestra não venha definida na avaliação
        const keyNameOnly = studentKey(ev.nomeAluno, '');
        if (!map[keyNameOnly]) {
          map[keyNameOnly] = ev;
        }
      }
    });
    setEvalMap(map);
  }, [evaluations]);

  // Orquestras musicais disponíveis
  const availableOrchestras = useMemo(() => {
    const set = new Set<string>();
    orchestras.forEach((o) => {
      if (o && !/^alunos?$|chefe|geral/i.test(o.trim())) {
        set.add(o.trim());
      }
    });
    students.forEach((s) => {
      if (s.orquestra && !/^alunos?$|chefe|geral/i.test(s.orquestra.trim())) {
        set.add(s.orquestra.trim());
      }
    });
    return Array.from(set);
  }, [orchestras, students]);

  // Alunos filtrados por orquestra
  const orchestraStudents = useMemo(() => {
    if (selectedOrchestra === 'todas') {
      return students;
    }
    return students.filter(
      (s) => (s.orquestra || '').trim().toLowerCase() === selectedOrchestra.trim().toLowerCase()
    );
  }, [students, selectedOrchestra]);

  // Naipes disponíveis na orquestra atual
  const availableNaipes = useMemo(() => {
    const set = new Set<string>();
    orchestraStudents.forEach((s) => {
      if (s.naipe) set.add(s.naipe.trim());
    });
    return Array.from(set).sort();
  }, [orchestraStudents]);

  // Alunos filtrados pela pesquisa, naipe e estado
  const filteredStudents = useMemo(() => {
    return orchestraStudents.filter((s) => {
      // Pesquisa
      if (search) {
        const query = search.toLowerCase();
        const matchesName = s.nome.toLowerCase().includes(query);
        const matchesNaipe = s.naipe.toLowerCase().includes(query);
        const matchesGrau = (s.grau || '').toLowerCase().includes(query);
        if (!matchesName && !matchesNaipe && !matchesGrau) return false;
      }

      // Naipe
      if (selectedNaipe !== 'todos' && s.naipe.trim().toLowerCase() !== selectedNaipe.toLowerCase()) {
        return false;
      }

      // Estado de avaliação
      const ev = evalMap[studentKey(s.nome, s.orquestra)] || evalMap[studentKey(s.nome, '')];
      const isEvaluated = !!(ev && ev.pontuacao > 0);

      if (statusFilter === 'avaliados' && !isEvaluated) return false;
      if (statusFilter === 'pendentes' && isEvaluated) return false;

      return true;
    });
  }, [orchestraStudents, search, selectedNaipe, statusFilter, evalMap]);

  const saveTimeoutsRef = React.useRef<Record<string, any>>({});

  // Atribuição rápida de nível (1 a 5) com gravação IMEDIATA no Google Sheets
  const handleAssignLevel = (student: Student, level: number) => {
    const key = studentKey(student.nome, student.orquestra);
    const existing = evalMap[key] || evalMap[studentKey(student.nome, '')];

    const generatedObs = generateObservationText(templates[level], student, level);

    const updated: Evaluation = {
      id: existing?.id || `eval-${student.id || student.nome.toLowerCase().replace(/\s+/g, '-')}`,
      rowIndex: existing?.rowIndex ?? -1,
      ordem: student.numero || existing?.ordem || '',
      nomeAluno: student.nome,
      grau: student.grau || existing?.grau || '',
      naipe: student.naipe || existing?.naipe || '',
      orquestra: student.orquestra || existing?.orquestra || (selectedOrchestra !== 'todas' ? selectedOrchestra : ''),
      pontuacao: level,
      data: new Date().toISOString().split('T')[0],
      observacoes: generatedObs,
    };

    setEvalMap((prev) => ({
      ...prev,
      [key]: updated,
      [studentKey(student.nome, '')]: updated,
    }));

    // Cancela qualquer timeout pendente para este aluno
    if (saveTimeoutsRef.current[key]) {
      clearTimeout(saveTimeoutsRef.current[key]);
      delete saveTimeoutsRef.current[key];
    }

    // Grava imediatamente no Google Sheets
    if (onSaveSingleEvaluation) {
      onSaveSingleEvaluation(student, level, generatedObs, existing?.rowIndex).catch((e) => {
        console.error('Erro ao gravar no Google Sheets:', e);
      });
    } else if (onUpdateEvaluation) {
      onUpdateEvaluation(updated);
    }
  };

  // Alteração manual da observação pelo professor com auto-save em background
  const handleObservationChange = (student: Student, text: string) => {
    const key = studentKey(student.nome, student.orquestra);
    const existing = evalMap[key] || evalMap[studentKey(student.nome, '')];

    const updated: Evaluation = {
      id: existing?.id || `eval-${student.id || student.nome.toLowerCase().replace(/\s+/g, '-')}`,
      rowIndex: existing?.rowIndex ?? -1,
      ordem: student.numero || existing?.ordem || '',
      nomeAluno: student.nome,
      grau: student.grau || existing?.grau || '',
      naipe: student.naipe || existing?.naipe || '',
      orquestra: student.orquestra || existing?.orquestra || (selectedOrchestra !== 'todas' ? selectedOrchestra : ''),
      pontuacao: existing?.pontuacao || 0,
      data: existing?.data || new Date().toISOString().split('T')[0],
      observacoes: text,
    };

    setEvalMap((prev) => ({
      ...prev,
      [key]: updated,
      [studentKey(student.nome, '')]: updated,
    }));

    if (onSaveSingleEvaluation) {
      if (saveTimeoutsRef.current[key]) {
        clearTimeout(saveTimeoutsRef.current[key]);
      }
      saveTimeoutsRef.current[key] = setTimeout(() => {
        onSaveSingleEvaluation(student, existing?.pontuacao || 0, text, existing?.rowIndex).catch((e) => {
          console.error('Erro no auto-save:', e);
        });
      }, 700);
    } else if (onUpdateEvaluation) {
      onUpdateEvaluation(updated);
    }
  };

  const handleObservationBlur = (student: Student) => {
    const key = studentKey(student.nome, student.orquestra);
    const ev = evalMap[key] || evalMap[studentKey(student.nome, '')];
    if (ev && onSaveSingleEvaluation) {
      if (saveTimeoutsRef.current[key]) {
        clearTimeout(saveTimeoutsRef.current[key]);
        delete saveTimeoutsRef.current[key];
      }
      onSaveSingleEvaluation(student, ev.pontuacao, ev.observacoes, ev.rowIndex).catch((e) => {
        console.error('Erro no blur save:', e);
      });
    }
  };

  // Limpar a avaliação de um aluno
  const handleClearEvaluation = (student: Student) => {
    const key = studentKey(student.nome, student.orquestra);
    const keyNameOnly = studentKey(student.nome, '');
    const existing = evalMap[key] || evalMap[keyNameOnly];

    if (!existing || (!existing.pontuacao && !existing.observacoes)) return;

    if (window.confirm(`Deseja limpar a avaliação de ${student.nome}?`)) {
      // 1. Cancela qualquer temporizador pendente de auto-save
      if (saveTimeoutsRef.current[key]) {
        clearTimeout(saveTimeoutsRef.current[key]);
        delete saveTimeoutsRef.current[key];
      }
      if (saveTimeoutsRef.current[keyNameOnly]) {
        clearTimeout(saveTimeoutsRef.current[keyNameOnly]);
        delete saveTimeoutsRef.current[keyNameOnly];
      }

      // 2. Remove do mapa local da pauta imediatamente
      setEvalMap((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next[keyNameOnly];
        return next;
      });

      // 3. Limpa no Google Sheets e no estado global
      if (onSaveSingleEvaluation) {
        onSaveSingleEvaluation(student, 0, '', existing.rowIndex);
      } else if (onDelete) {
        onDelete(existing);
      }
      toast.success(`Avaliação de ${student.nome} limpa.`);
    }
  };

  // Guardar todas as avaliações no Google Sheets sincronizando todos os 183 alunos
  const handleSaveToSheets = async () => {
    if (!onSaveAll) return;
    setIsSaving(true);
    try {
      const evalsList = Object.values(evalMap).filter(
        (ev) => (ev.pontuacao && ev.pontuacao > 0) || (ev.observacoes && ev.observacoes.trim().length > 0)
      );
      await onSaveAll(evalsList, students);
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar modelos alterados
  const handleSaveTemplates = (newTemplates: Record<number, string>) => {
    setTemplates(newTemplates);
    if (onSaveLevelTemplates) {
      onSaveLevelTemplates(newTemplates);
    }
  };

  // Estatísticas da pauta atual
  const stats = useMemo(() => {
    const totalStudents = orchestraStudents.length;
    let evaluatedCount = 0;
    let sumScore = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    orchestraStudents.forEach((s) => {
      const ev = evalMap[studentKey(s.nome, s.orquestra)] || evalMap[studentKey(s.nome, '')];
      if (ev && ev.pontuacao > 0) {
        evaluatedCount++;
        sumScore += ev.pontuacao;
        distribution[ev.pontuacao] = (distribution[ev.pontuacao] || 0) + 1;
      }
    });

    const average = evaluatedCount > 0 ? (sumScore / evaluatedCount).toFixed(1) : '—';
    const percent = totalStudents > 0 ? Math.round((evaluatedCount / totalStudents) * 100) : 0;

    return { totalStudents, evaluatedCount, average, percent, distribution };
  }, [orchestraStudents, evalMap]);

  // Listas agrupadas para as outras abas
  const byStudent = groupByStudent(evaluations);
  const byCriteria = groupByCriteria(evaluations);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Barra de Topo: Abas de Visualização & Ações Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pauta')}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg font-bold transition-all ${
              activeTab === 'pauta'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Pauta por Orquestra
          </button>
          <button
            onClick={() => setActiveTab('byStudent')}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg font-bold transition-all ${
              activeTab === 'byStudent'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Resumo por Aluno
          </button>
          {criteria.length > 0 && (
            <button
              onClick={() => setActiveTab('byCriteria')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg font-bold transition-all ${
                activeTab === 'byCriteria'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Por Critério
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Configurar Textos dos Níveis (1 a 5) */}
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm"
            title="Personalize a frase gerada automaticamente para os níveis 1, 2, 3, 4 e 5"
          >
            <Settings2 size={15} className="text-orchestra-gold" />
            <span>Configurar Textos (1 a 5)</span>
          </button>

          {/* Botão Guardar no Google Sheets */}
          {onSaveAll && (
            <button
              onClick={handleSaveToSheets}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  : 'bg-orchestra-gold hover:bg-orchestra-gold-light text-orchestra-navy'
              } disabled:opacity-50`}
            >
              <Save size={15} />
              <span>{isSaving ? 'A guardar...' : hasUnsavedChanges ? 'Guardar no Sheets *' : 'Guardar no Sheets'}</span>
            </button>
          )}

          {/* Botão Exportar CSV */}
          <button
            onClick={() => {
              const currentList = Object.values(evalMap);
              exportEvaluationsToCSV(currentList.length > 0 ? currentList : evaluations);
            }}
            disabled={evaluations.length === 0 && Object.keys(evalMap).length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all disabled:opacity-40"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 bg-gray-100 dark:bg-gray-800 rounded-xl transition-all"
            title="Adicionar avaliação avulsa com formulário"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nova</span>
          </button>
        </div>
      </div>

      {activeTab === 'pauta' ? (
        <div className="space-y-4">
          {/* Seletor de Orquestras */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => {
                setSelectedOrchestra('todas');
                setSelectedNaipe('todos');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedOrchestra === 'todas'
                  ? 'bg-orchestra-gold text-orchestra-navy shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Todas as Orquestras ({students.length})
            </button>
            {availableOrchestras.map((orch) => {
              const count = students.filter(
                (s) => (s.orquestra || '').trim().toLowerCase() === orch.toLowerCase()
              ).length;
              return (
                <button
                  key={orch}
                  onClick={() => {
                    setSelectedOrchestra(orch);
                    setSelectedNaipe('todos');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedOrchestra === orch
                      ? 'bg-orchestra-gold text-orchestra-navy shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {orch} ({count})
                </button>
              );
            })}
          </div>

          {/* Cards de Resumo Estatístico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-gray-400">Total Alunos</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-gray-400">Avaliados</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {stats.evaluatedCount} <span className="text-xs font-semibold text-gray-400">({stats.percent}%)</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-gray-400">Média Global</p>
                <p className="text-xl font-black text-amber-500 mt-0.5 flex items-center gap-1">
                  {stats.average} <span className="text-xs">★</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
                <Award size={18} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col justify-center">
              <p className="text-[10px] font-medium text-gray-400 mb-1">Distribuição de Níveis</p>
              <div className="flex items-center gap-1">
                {[5, 4, 3, 2, 1].map((lvl) => (
                  <span
                    key={lvl}
                    className="flex-1 text-center text-[10px] font-bold py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300"
                    title={`Nível ${lvl}: ${stats.distribution[lvl] || 0} alunos`}
                  >
                    {lvl}: {stats.distribution[lvl] || 0}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Filtros Secundários: Pesquisa, Naipe, Estado */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar por aluno, naipe ou grau..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orchestra-gold"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Dropdown de Naipe */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter size={13} className="text-gray-400" />
                <select
                  value={selectedNaipe}
                  onChange={(e) => setSelectedNaipe(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orchestra-gold"
                >
                  <option value="todos">Todos os Naipes ({availableNaipes.length})</option>
                  {availableNaipes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Estado */}
              <div className="inline-flex bg-gray-100 dark:bg-gray-700/50 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('todos')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    statusFilter === 'todos'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('avaliados')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    statusFilter === 'avaliados'
                      ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Avaliados
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pendentes')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    statusFilter === 'pendentes'
                      ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Por Avaliar
                </button>
              </div>
            </div>
          </div>

          {/* Tabela Pauta de Avaliação */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-4 min-w-[180px]">Nome do Aluno</th>
                    <th className="py-3 px-3 min-w-[90px]">Grau</th>
                    <th className="py-3 px-3 min-w-[120px]">Naipe</th>
                    <th className="py-3 px-3 min-w-[100px]">Orquestra</th>
                    <th className="py-3 px-4 min-w-[190px] text-center">Classificação (1 a 5)</th>
                    <th className="py-3 px-4 min-w-[280px]">Observações (Gerada Automaticamente)</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        A carregar alunos e avaliações...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        Nenhum aluno encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const key = studentKey(student.nome, student.orquestra);
                      const ev = evalMap[key] || evalMap[studentKey(student.nome, '')];
                      const currentScore = ev?.pontuacao || 0;
                      const currentObs = ev?.observacoes || '';
                      const isChefe = student.chefeNaipe && /chefe|sim/i.test(student.chefeNaipe);

                      return (
                        <tr
                          key={`${student.id || student.nome}-${idx}`}
                          className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors ${
                            currentScore > 0 ? 'bg-amber-500/[0.02]' : ''
                          }`}
                        >
                          {/* Ordem */}
                          <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {student.numero || idx + 1}
                          </td>

                          {/* Nome do Aluno */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {student.nome}
                              </span>
                              {isChefe && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  Chefe
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Grau */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {student.grau || '—'}
                            </span>
                          </td>

                          {/* Naipe */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                              {student.naipe || '—'}
                            </span>
                          </td>

                          {/* Orquestra */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-orchestra-gold border border-amber-200 dark:border-amber-800/40">
                              {student.orquestra || selectedOrchestra}
                            </span>
                          </td>

                          {/* Classificação (1 a 5) com botões interativos */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((lvl) => {
                                const isSelected = currentScore === lvl;
                                let btnClasses =
                                  'w-7 h-7 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ';

                                if (isSelected) {
                                  if (lvl === 5) {
                                    btnClasses +=
                                      'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105';
                                  } else if (lvl === 4) {
                                    btnClasses +=
                                      'bg-blue-600 text-white border-blue-700 shadow-md scale-105';
                                  } else if (lvl === 3) {
                                    btnClasses +=
                                      'bg-amber-500 text-white border-amber-600 shadow-md scale-105';
                                  } else if (lvl === 2) {
                                    btnClasses +=
                                      'bg-orange-500 text-white border-orange-600 shadow-md scale-105';
                                  } else {
                                    btnClasses +=
                                      'bg-rose-600 text-white border-rose-700 shadow-md scale-105';
                                  }
                                } else {
                                  btnClasses +=
                                    'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orchestra-gold hover:text-orchestra-gold hover:bg-amber-50/50 dark:hover:bg-amber-950/20';
                                }

                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => handleAssignLevel(student, lvl)}
                                    className={btnClasses}
                                    title={`Atribuir nível ${lvl} (${LEVEL_LABELS[lvl]?.label}) e gerar observação`}
                                  >
                                    {lvl}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Observações editável */}
                          <td className="py-2 px-4">
                            <div className="relative group">
                              <input
                                type="text"
                                value={currentObs}
                                onChange={(e) => handleObservationChange(student, e.target.value)}
                                onBlur={() => handleObservationBlur(student)}
                                placeholder="Clique num nível (1-5) para gerar ou escreva aqui..."
                                className="w-full px-2.5 py-1.5 text-xs bg-transparent hover:bg-white dark:hover:bg-gray-700/60 focus:bg-white dark:focus:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-orchestra-gold rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orchestra-gold transition-all"
                              />
                              {currentScore > 0 && (
                                <Sparkles
                                  size={12}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                                />
                              )}
                            </div>
                          </td>

                          {/* Ação Limpar */}
                          <td className="py-3 px-2 text-center">
                            {currentScore > 0 || currentObs ? (
                              <button
                                type="button"
                                onClick={() => handleClearEvaluation(student)}
                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                title="Limpar avaliação deste aluno"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'byStudent' ? (
        // Resumo agrupado por aluno
        <div className="space-y-3">
          {Object.entries(byStudent)
            .sort()
            .map(([studentName, evs]) => {
              const avg = calcAverage(evs);
              const isExpanded = expandedStudent === studentName;
              return (
                <div
                  key={studentName}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedStudent(isExpanded ? null : studentName)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-left text-sm">
                        {studentName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {evs[0]?.naipe} · {evs[0]?.orquestra || ''} · {evs.length} registo(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-amber-400 text-sm font-bold">
                          ★ {avg > 0 ? avg.toFixed(1) : '—'}
                        </span>
                        <p className="text-[10px] text-gray-400">{evs.length} avaliações</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                      {evs.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between px-4 py-3 text-xs">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {ev.criterio || `Classificação: Nível ${ev.pontuacao}`}
                            </p>
                            {ev.observacoes && (
                              <p className="text-gray-500 dark:text-gray-400 mt-0.5 italic">
                                "{ev.observacoes}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-amber-500">
                              Nível {ev.pontuacao}
                            </span>
                            <button
                              onClick={() => onDelete(ev)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        // Resumo por Critério
        <div className="space-y-3">
          {Object.entries(byCriteria)
            .sort()
            .map(([criteriaName, evs]) => {
              const avg = calcAverage(evs);
              return (
                <div
                  key={criteriaName}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{criteriaName}</p>
                      <p className="text-xs text-gray-400">{evs.length} avaliações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-amber-400 font-bold">Média: {avg.toFixed(1)} / 5</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {evs
                      .sort((a, b) => b.pontuacao - a.pontuacao)
                      .map((ev) => (
                        <div key={ev.id} className="flex items-center gap-3 text-xs">
                          <span className="text-gray-700 dark:text-gray-300 flex-1">
                            {ev.nomeAluno}
                          </span>
                          <span className="font-bold text-amber-500">Nível {ev.pontuacao}</span>
                          <span className="text-gray-400 text-[10px] w-20 text-right">{ev.data}</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modal de Configuração dos Níveis 1 a 5 */}
      {showTemplatesModal && (
        <LevelTemplatesModal
          templates={templates}
          onSave={handleSaveTemplates}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      {/* Formulário modal para nova avaliação avulsa */}
      {showAddForm && (
        <EvaluationForm
          students={students}
          criteria={criteria}
          onSave={onAdd}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

