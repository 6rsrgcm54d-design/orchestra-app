import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Download,
  Trash2,
  Save,
  Search,
  CheckCircle2,
  Filter,
  Users,
  Award,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ProvaRecord, Student } from '../../types';
import { calcClassificacaoFinal } from '../../types';
import { exportProvasToCSV } from '../../utils/csvExport';

interface ProvasViewProps {
  provas: ProvaRecord[];
  students: Student[];
  orchestras?: string[];
  isLoading: boolean;
  onSaveSingleProva?: (
    student: Student,
    params: {
      afinacao?: number | null;
      precisaoRitmica?: number | null;
      tempo?: number | null;
      articulacao?: number | null;
      dinamicas?: number | null;
      fraseado?: number | null;
      timbre?: number | null;
    },
    rowIndex?: number
  ) => Promise<void>;
  onSaveAll?: (provas: ProvaRecord[], allStudents?: Student[]) => Promise<void>;
}

function studentKey(nome: string, orquestra?: string): string {
  return `${(nome || '').trim().toLowerCase()}|${(orquestra || '').trim().toLowerCase()}`;
}

type ParameterKey = 'afinacao' | 'precisaoRitmica' | 'tempo' | 'articulacao' | 'dinamicas' | 'fraseado' | 'timbre';

const PARAM_COLUMNS: { key: ParameterKey; label: string; tooltip: string }[] = [
  { key: 'afinacao', label: 'Afinação', tooltip: 'Precisão e estabilidade de afinação (0-100%)' },
  { key: 'precisaoRitmica', label: 'Precisão Rítmica', tooltip: 'Respeito pelas figuras rítmicas e pulsação (0-100%)' },
  { key: 'tempo', label: 'Tempo', tooltip: 'Manutenção do andamento e consistência do pulso (0-100%)' },
  { key: 'articulacao', label: 'Articulação', tooltip: 'Clareza de ataque, staccato, legato e bowing (0-100%)' },
  { key: 'dinamicas', label: 'Dinâmicas', tooltip: 'Contraste sonoro e expressividade dinâmica (0-100%)' },
  { key: 'fraseado', label: 'Fraseado', tooltip: 'Sentido melódico, respiração e intenção musical (0-100%)' },
  { key: 'timbre', label: 'Timbre', tooltip: 'Qualidade sonora, pureza e riqueza tímbrica (0-100%)' },
];

interface ProvaCellInputProps {
  id: string;
  value: number | null | undefined;
  onCommit: (val: number | null) => void;
  onNavigate: (direction: 'next' | 'prev' | 'up' | 'down' | 'left' | 'right') => void;
  title?: string;
}

function ProvaCellInput({ id, value, onCommit, onNavigate, title }: ProvaCellInputProps) {
  const formatVal = (v: number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const n = v > 0 && v <= 1 ? Math.round(v * 100) : Math.round(v);
    return String(n);
  };

  const [text, setText] = useState<string>(formatVal(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(formatVal(value));
    }
  }, [value, isFocused]);

  const commitValue = (valStr: string) => {
    const clean = valStr.trim().replace(',', '.');
    if (clean === '') {
      setText('');
      onCommit(null);
      return;
    }
    let num = parseFloat(clean);
    if (isNaN(num)) {
      setText(formatVal(value));
      return;
    }
    // Se veio ou foi digitado decimal <= 1 (ex: 0.45 para 45, ou 0.7 para 70)
    if (num > 0 && num <= 1 && (clean.includes('.') || clean === '1')) {
      num = num * 100;
    } else if (num > 1 && num <= 10 && clean.includes('.')) {
      // Se o utilizador digitou na escala 0-10 com decimal (ex: 8.5 ou 7.5), converte para 85 ou 75
      num = num * 10;
    }
    const clamped = Math.min(100, Math.max(0, num));
    const rounded = Math.round(clamped / 5) * 5;
    setText(String(rounded));
    onCommit(rounded);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(text);
      onNavigate('next');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitValue(text);
      if (e.shiftKey) {
        onNavigate('prev');
      } else {
        onNavigate('next');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      commitValue(text);
      onNavigate('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commitValue(text);
      onNavigate('up');
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (
        input.selectionStart === input.value.length ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        e.preventDefault();
        commitValue(text);
        onNavigate('right');
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (
        input.selectionStart === 0 ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        e.preventDefault();
        commitValue(text);
        onNavigate('left');
      }
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      const current = parseFloat(text.replace(',', '.')) || (value ?? 0);
      const nextVal = Math.min(100, Math.round(current / 5) * 5 + 5);
      setText(String(nextVal));
      onCommit(nextVal);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      const current = parseFloat(text.replace(',', '.')) || (value ?? 0);
      const nextVal = Math.max(0, Math.round(current / 5) * 5 - 5);
      setText(String(nextVal));
      onCommit(nextVal);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setText(value !== null && value !== undefined ? String(value) : '');
      e.currentTarget.blur();
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      value={text}
      placeholder="—"
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={(e) => {
        setIsFocused(false);
        commitValue(e.target.value);
      }}
      onChange={(e) => {
        const val = e.target.value;
        if (/^[0-9.,]*$/.test(val)) {
          setText(val);
        }
      }}
      onKeyDown={handleKeyDown}
      className="w-14 text-center px-1 py-1.5 text-xs font-bold bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold focus:border-orchestra-gold transition-all select-all font-mono"
      title={title}
    />
  );
}

export default function ProvasView({
  provas,
  students,
  orchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'],
  isLoading,
  onSaveSingleProva,
  onSaveAll,
}: ProvasViewProps) {
  // Filtros
  const [selectedOrchestra, setSelectedOrchestra] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [selectedNaipe, setSelectedNaipe] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'avaliados' | 'pendentes'>('todos');

  // Gravação
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mapa local indexado por aluno
  const [provaMap, setProvaMap] = useState<Record<string, ProvaRecord>>({});
  const saveTimeoutsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const map: Record<string, ProvaRecord> = {};
    provas.forEach((p) => {
      const key = studentKey(p.nomeAluno, p.orquestra);
      map[key] = p;
      const keyNameOnly = studentKey(p.nomeAluno, '');
      if (!map[keyNameOnly]) map[keyNameOnly] = p;
    });
    setProvaMap(map);
  }, [provas]);

  // Orquestras musicais disponíveis
  const availableOrchestras = useMemo(() => {
    const set = new Set<string>();
    orchestras.forEach((o) => {
      if (o && !/^alunos?$|chefe|geral/i.test(o.trim())) {
        const canonical = /^10[º°]?\s*ano$/i.test(o.trim()) ? 'Orquestra 10º ano' : o.trim();
        set.add(canonical);
      }
    });
    students.forEach((s) => {
      if (s.orquestra && !/^alunos?$|chefe|geral/i.test(s.orquestra.trim())) {
        const canonical = /^10[º°]?\s*ano$/i.test(s.orquestra.trim()) ? 'Orquestra 10º ano' : s.orquestra.trim();
        set.add(canonical);
      }
    });
    const defaultOrchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'];
    defaultOrchestras.forEach((def) => set.add(def));
    return Array.from(set);
  }, [orchestras, students]);

  // Alunos da orquestra selecionada
  const orchestraStudents = useMemo(() => {
    if (selectedOrchestra === 'todas') return students;
    return students.filter(
      (s) => (s.orquestra || '').trim().toLowerCase() === selectedOrchestra.trim().toLowerCase()
    );
  }, [students, selectedOrchestra]);

  // Naipes disponíveis
  const availableNaipes = useMemo(() => {
    const set = new Set<string>();
    orchestraStudents.forEach((s) => {
      if (s.naipe) set.add(s.naipe.trim());
    });
    return Array.from(set).sort();
  }, [orchestraStudents]);

  // Alunos filtrados
  const filteredStudents = useMemo(() => {
    return orchestraStudents.filter((s) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesName = s.nome.toLowerCase().includes(query);
        const matchesNaipe = s.naipe.toLowerCase().includes(query);
        if (!matchesName && !matchesNaipe) return false;
      }

      if (selectedNaipe !== 'todos' && s.naipe.trim().toLowerCase() !== selectedNaipe.toLowerCase()) {
        return false;
      }

      const p = provaMap[studentKey(s.nome, s.orquestra)] || provaMap[studentKey(s.nome, '')];
      const isEvaluated = p && p.classificacaoFinal !== null && p.classificacaoFinal !== undefined;

      if (statusFilter === 'avaliados' && !isEvaluated) return false;
      if (statusFilter === 'pendentes' && isEvaluated) return false;

      return true;
    });
  }, [orchestraStudents, search, selectedNaipe, statusFilter, provaMap]);

  // Alteração de um parâmetro (0 a 100%, em incrementos de 5%)
  const handleParamChange = (student: Student, paramKey: ParameterKey, numVal: number | null) => {
    const key = studentKey(student.nome, student.orquestra);
    const existing = provaMap[key] || provaMap[studentKey(student.nome, '')];

    const currentParams = {
      afinacao: existing?.afinacao ?? null,
      precisaoRitmica: existing?.precisaoRitmica ?? null,
      tempo: existing?.tempo ?? null,
      articulacao: existing?.articulacao ?? null,
      dinamicas: existing?.dinamicas ?? null,
      fraseado: existing?.fraseado ?? null,
      timbre: existing?.timbre ?? null,
      [paramKey]: numVal,
    };

    const finalScore = calcClassificacaoFinal(currentParams);

    const updated: ProvaRecord = {
      id: existing?.id || `prova-${student.id || student.nome.toLowerCase().replace(/\s+/g, '-')}`,
      rowIndex: existing?.rowIndex ?? -1,
      ordem: student.numero || existing?.ordem || '',
      nomeAluno: student.nome,
      naipe: student.naipe || existing?.naipe || '',
      orquestra: student.orquestra || existing?.orquestra || (selectedOrchestra !== 'todas' ? selectedOrchestra : ''),
      ...currentParams,
      classificacaoFinal: finalScore,
    };

    setProvaMap((prev) => ({
      ...prev,
      [key]: updated,
      [studentKey(student.nome, '')]: updated,
    }));
    setHasUnsavedChanges(true);

    // Auto-save debounced no Google Sheets
    if (onSaveSingleProva) {
      if (saveTimeoutsRef.current[key]) {
        clearTimeout(saveTimeoutsRef.current[key]);
      }
      saveTimeoutsRef.current[key] = setTimeout(() => {
        onSaveSingleProva(student, currentParams, existing?.rowIndex).catch((e) => {
          console.error('Erro ao guardar prova:', e);
        });
      }, 700);
    }
  };

  // Navegação no teclado numérico entre células da pauta
  const handleNavigate = (
    currentRow: number,
    currentCol: number,
    direction: 'next' | 'prev' | 'up' | 'down' | 'left' | 'right'
  ) => {
    let nextRow = currentRow;
    let nextCol = currentCol;
    const totalCols = PARAM_COLUMNS.length;
    const totalRows = filteredStudents.length;

    switch (direction) {
      case 'next':
      case 'right':
        if (currentCol < totalCols - 1) {
          nextCol = currentCol + 1;
        } else if (currentRow < totalRows - 1) {
          nextRow = currentRow + 1;
          nextCol = 0;
        }
        break;
      case 'prev':
      case 'left':
        if (currentCol > 0) {
          nextCol = currentCol - 1;
        } else if (currentRow > 0) {
          nextRow = currentRow - 1;
          nextCol = totalCols - 1;
        }
        break;
      case 'down':
        if (currentRow < totalRows - 1) {
          nextRow = currentRow + 1;
        }
        break;
      case 'up':
        if (currentRow > 0) {
          nextRow = currentRow - 1;
        }
        break;
    }

    if (nextRow !== currentRow || nextCol !== currentCol) {
      const el = document.getElementById(`prova-cell-${nextRow}-${nextCol}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Limpar a prova de um aluno
  const handleClearProva = (student: Student) => {
    const key = studentKey(student.nome, student.orquestra);
    const keyNameOnly = studentKey(student.nome, '');
    const existing = provaMap[key] || provaMap[keyNameOnly];

    if (!existing || existing.classificacaoFinal === null) return;

    if (
      window.confirm(
        `Deseja limpar os parâmetros e a classificação final da prova de ${student.nome}?\n\n(O aluno será mantido na base de dados)`
      )
    ) {
      if (saveTimeoutsRef.current[key]) {
        clearTimeout(saveTimeoutsRef.current[key]);
        delete saveTimeoutsRef.current[key];
      }
      if (saveTimeoutsRef.current[keyNameOnly]) {
        clearTimeout(saveTimeoutsRef.current[keyNameOnly]);
        delete saveTimeoutsRef.current[keyNameOnly];
      }

      setProvaMap((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next[keyNameOnly];
        return next;
      });

      if (onSaveSingleProva) {
        onSaveSingleProva(
          student,
          {
            afinacao: null,
            precisaoRitmica: null,
            tempo: null,
            articulacao: null,
            dinamicas: null,
            fraseado: null,
            timbre: null,
          },
          existing.rowIndex
        );
      }
      toast.success(`Prova de ${student.nome} limpa. Aluno mantido na folha.`);
    }
  };

  // Guardar todas as provas no Google Sheets
  const handleSaveToSheets = async () => {
    if (!onSaveAll) return;
    setIsSaving(true);
    try {
      const provasList = Object.values(provaMap).filter(
        (p) => p.classificacaoFinal !== null || p.afinacao !== null
      );
      await onSaveAll(provasList, students);
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Estatísticas
  const stats = useMemo(() => {
    const total = orchestraStudents.length;
    let evaluated = 0;
    let sumFinal = 0;
    let maxScore = 0;

    orchestraStudents.forEach((s) => {
      const p = provaMap[studentKey(s.nome, s.orquestra)] || provaMap[studentKey(s.nome, '')];
      if (p && p.classificacaoFinal !== null && p.classificacaoFinal !== undefined) {
        evaluated++;
        sumFinal += p.classificacaoFinal;
        if (p.classificacaoFinal > maxScore) maxScore = p.classificacaoFinal;
      }
    });

    const avg = evaluated > 0 ? Math.round(sumFinal / evaluated) : 0;
    const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

    return { total, evaluated, percent, avg, maxScore };
  }, [orchestraStudents, provaMap]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Barra de Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="text-orchestra-gold" size={24} />
            <span>Pauta de Provas</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Avaliação por parâmetros musicais (0 a 100%) com cálculo automático da média arredondada a 5%
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Guardar no Sheets */}
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
              const currentList = Object.values(provaMap);
              exportProvasToCSV(currentList.length > 0 ? currentList : provas);
            }}
            disabled={provas.length === 0 && Object.keys(provaMap).length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all disabled:opacity-40"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

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

      {/* Resumo Estatístico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-400">Total Alunos</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-400">Provas Avaliadas</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.evaluated} <span className="text-xs font-semibold text-gray-400">({stats.percent}%)</span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-400">Média Geral</p>
            <p className="text-xl font-black text-amber-500 mt-0.5">
              {stats.evaluated > 0 ? `${stats.avg}%` : '—'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-400">Nota Mais Alta</p>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {stats.evaluated > 0 ? `${stats.maxScore}%` : '—'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Secundários */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar aluno ou naipe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orchestra-gold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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

      {/* Atalhos do Teclado Numérico */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-amber-800 dark:text-amber-300">
        <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
          ⌨️ Teclado Numérico Ativo:
        </span>
        <span className="flex items-center gap-1">
          Digita a nota (<code className="font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded border border-amber-300 dark:border-amber-700">0–100</code>)
        </span>
        <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">•</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">Enter</kbd> ou <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">Tab</kbd> para avançar
        </span>
        <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">•</span>
        <span className="flex items-center gap-1">
          Setas <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">↑ ↓ ← →</kbd> para navegar
        </span>
        <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">•</span>
        <span className="flex items-center gap-1">
          Teclas <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">+</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">-</kbd> para ajustar ±5%
        </span>
      </div>

      {/* Tabela de Provas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[170px]">Nome do Aluno</th>
                <th className="py-3 px-2 min-w-[110px]">Naipe</th>
                <th className="py-3 px-2 min-w-[90px]">Orquestra</th>
                {PARAM_COLUMNS.map((p) => (
                  <th key={p.key} className="py-3 px-2 text-center min-w-[70px]" title={p.tooltip}>
                    {p.label}
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[110px]">Classificação Final</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-gray-400">
                    A carregar alunos e provas...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-gray-400">
                    Nenhum aluno encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const key = studentKey(student.nome, student.orquestra);
                  const p = provaMap[key] || provaMap[studentKey(student.nome, '')];
                  const rawScore = p?.classificacaoFinal;
                  const finalScore =
                    rawScore !== null && rawScore !== undefined
                      ? rawScore > 0 && rawScore <= 1
                        ? Math.round(rawScore * 100)
                        : Math.round(rawScore)
                      : null;
                  const isEvaluated = finalScore !== null;

                  let scoreBadgeClass =
                    'px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center justify-center min-w-[50px] ';
                  if (finalScore !== null) {
                    if (finalScore >= 90) {
                      scoreBadgeClass += 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
                    } else if (finalScore >= 75) {
                      scoreBadgeClass += 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
                    } else if (finalScore >= 60) {
                      scoreBadgeClass += 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
                    } else {
                      scoreBadgeClass += 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
                    }
                  } else {
                    scoreBadgeClass += 'text-gray-400';
                  }

                  return (
                    <tr
                      key={`${student.id || student.nome}-${idx}`}
                      className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors ${
                        isEvaluated ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      {/* Ordem */}
                      <td className="py-3 px-2 text-center text-gray-400 font-mono text-[11px]">
                        {student.numero || idx + 1}
                      </td>

                      {/* Nome Aluno */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {student.nome}
                        </span>
                      </td>

                      {/* Naipe */}
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                          {student.naipe || '—'}
                        </span>
                      </td>

                      {/* Orquestra */}
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-orchestra-gold border border-amber-200 dark:border-amber-800/40">
                          {student.orquestra || selectedOrchestra}
                        </span>
                      </td>

                      {/* 7 Parâmetros (0 a 100%, incrementos de 5%) com Teclado Numérico */}
                      {PARAM_COLUMNS.map((param, colIdx) => {
                        const val = p?.[param.key];
                        return (
                          <td key={param.key} className="py-2 px-1 text-center">
                            <ProvaCellInput
                              id={`prova-cell-${idx}-${colIdx}`}
                              value={val}
                              onCommit={(newVal) => handleParamChange(student, param.key, newVal)}
                              onNavigate={(dir) => handleNavigate(idx, colIdx, dir)}
                              title={`${param.label}: ${val !== null && val !== undefined ? (val > 0 && val <= 1 ? Math.round(val * 100) : Math.round(val)) : 'Sem nota'}`}
                            />
                          </td>
                        );
                      })}

                      {/* Classificação Final */}
                      <td className="py-2 px-3 text-center">
                        <span className={scoreBadgeClass}>
                          {finalScore !== null ? finalScore : '—'}
                        </span>
                      </td>

                      {/* Limpar Prova */}
                      <td className="py-3 px-2 text-center">
                        {isEvaluated ? (
                          <button
                            type="button"
                            onClick={() => handleClearProva(student)}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            title="Limpar notas da prova (o aluno é mantido na folha)"
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
  );
}
