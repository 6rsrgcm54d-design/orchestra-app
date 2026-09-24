import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Save, Trash2, ChevronDown, ArrowLeftRight, UserMinus, X, Check, Download, Upload, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Student, StagePlan, StagePlanData, NaipeSection, Stand } from '../../types';
import { NAIPES } from '../../types';
import DroppableSeat from './DroppableSeat';
import DraggableStudent from './DraggableStudent';

interface StagePlanViewProps {
  plans: StagePlan[];
  students: Student[];
  orchestras?: string[];
  isLoading: boolean;
  onSave: (plan: StagePlan) => void;
  onDelete: (planId: string) => void;
  onExportBackup?: () => void;
  onImportBackup?: (plans: StagePlan[]) => void;
}

function DroppablePool({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool' });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-gray-800 rounded-xl border p-4 sticky top-4 transition-all ${
        isOver
          ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400 shadow-md'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Alunos disponíveis ({count})
        </h3>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
        Arrasta para o palco ou clica num lugar e escolhe o aluno.
      </p>
      <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

function createEmptyStagePlan(students: Student[]): StagePlanData {
  // Group students by naipe
  const byNaipe = students.reduce((acc, s) => {
    if (!s.naipe) return acc;
    if (!acc[s.naipe]) acc[s.naipe] = [];
    acc[s.naipe].push(s);
    return acc;
  }, {} as Record<string, Student[]>);

  const sections: NaipeSection[] = Object.entries(byNaipe).map(([naipe, naipeStudents]) => {
    const numStands = Math.ceil(naipeStudents.length / 2);
    const stands: Stand[] = Array.from({ length: Math.max(numStands, 1) }, (_, i) => ({
      number: i + 1,
      seats: [
        { place: 'A', studentId: naipeStudents[i * 2]?.id ?? null, studentName: naipeStudents[i * 2]?.nome ?? null },
        { place: 'B', studentId: naipeStudents[i * 2 + 1]?.id ?? null, studentName: naipeStudents[i * 2 + 1]?.nome ?? null },
      ],
    }));
    return { naipe, stands };
  });

  return { sections };
}

export default function StagePlanView({
  plans,
  students,
  orchestras,
  isLoading,
  onSave,
  onDelete,
  onExportBackup,
  onImportBackup,
}: StagePlanViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [editingData, setEditingData] = useState<StagePlanData | null>(null);
  const [planName, setPlanName] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [filterOrchestra, setFilterOrchestra] = useState<string>('');
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const relevantStudents = React.useMemo(() => {
    if (!filterOrchestra) return students;
    return students.filter((s) => s.orquestra === filterOrchestra);
  }, [students, filterOrchestra]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const currentData = editingData ?? selectedPlan?.data ?? null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const selectedSeatInfo = useMemo(() => {
    if (!selectedSeatKey || !currentData) return null;
    const [naipe, standStr, place] = selectedSeatKey.split('::');
    const standNum = parseInt(standStr, 10);
    const section = currentData.sections.find((s) => s.naipe === naipe);
    const stand = section?.stands.find((st) => st.number === standNum);
    const seat = stand?.seats.find((se) => se.place === place);
    if (!seat) return null;
    return {
      key: selectedSeatKey,
      naipe,
      standNumber: standNum,
      place: place as 'A' | 'B',
      studentId: seat.studentId,
      studentName: seat.studentName,
    };
  }, [selectedSeatKey, currentData]);

  const handleSeatClick = (naipe: string, standNumber: number, place: 'A' | 'B') => {
    const clickedKey = `${naipe}::${standNumber}::${place}`;

    if (!selectedSeatKey) {
      setSelectedSeatKey(clickedKey);
      return;
    }

    if (selectedSeatKey === clickedKey) {
      setSelectedSeatKey(null);
      return;
    }

    if (!currentData) return;
    const [selNaipe, selStandStr, selPlace] = selectedSeatKey.split('::');
    const selStandNum = parseInt(selStandStr, 10);

    let seat1Data: { id: string | null; name: string | null } | null = null;
    let seat2Data: { id: string | null; name: string | null } | null = null;

    for (const section of currentData.sections) {
      for (const stand of section.stands) {
        for (const seat of stand.seats) {
          if (section.naipe === selNaipe && stand.number === selStandNum && seat.place === selPlace) {
            seat1Data = { id: seat.studentId, name: seat.studentName };
          }
          if (section.naipe === naipe && stand.number === standNumber && seat.place === place) {
            seat2Data = { id: seat.studentId, name: seat.studentName };
          }
        }
      }
    }

    if (!seat1Data || !seat2Data) return;

    const newData: StagePlanData = {
      sections: currentData.sections.map((section) => ({
        ...section,
        stands: section.stands.map((stand) => ({
          ...stand,
          seats: stand.seats.map((seat) => {
            if (section.naipe === selNaipe && stand.number === selStandNum && seat.place === selPlace) {
              return { ...seat, studentId: seat2Data!.id, studentName: seat2Data!.name };
            }
            if (section.naipe === naipe && stand.number === standNumber && seat.place === place) {
              return { ...seat, studentId: seat1Data!.id, studentName: seat1Data!.name };
            }
            return seat;
          }) as [typeof stand.seats[0], typeof stand.seats[1]],
        })),
      })),
    };

    setEditingData(newData);
    setSelectedSeatKey(null);

    if (seat1Data.name && seat2Data.name) {
      showStatus(`Troca efetuada: ${seat1Data.name} ⇄ ${seat2Data.name}`);
    } else if (seat1Data.name) {
      showStatus(`${seat1Data.name} movido para ${naipe} Est. ${standNumber} Lugar ${place}`);
    } else if (seat2Data.name) {
      showStatus(`${seat2Data.name} movido para ${selNaipe} Est. ${selStandNum} Lugar ${selPlace}`);
    } else {
      showStatus('Lugares vazios trocados.');
    }
  };

  const handleClearSeat = (naipe: string, standNumber: number, place: 'A' | 'B') => {
    if (!currentData) return;
    let removedName: string | null = null;

    const newData: StagePlanData = {
      sections: currentData.sections.map((section) => ({
        ...section,
        stands: section.stands.map((stand) => ({
          ...stand,
          seats: stand.seats.map((seat) => {
            if (section.naipe === naipe && stand.number === standNumber && seat.place === place) {
              removedName = seat.studentName;
              return { ...seat, studentId: null, studentName: null };
            }
            return seat;
          }) as [typeof stand.seats[0], typeof stand.seats[1]],
        })),
      })),
    };

    setEditingData(newData);
    if (selectedSeatKey === `${naipe}::${standNumber}::${place}`) {
      setSelectedSeatKey(null);
    }
    if (removedName) {
      showStatus(`${removedName} retirado do lugar e disponível na lista.`);
    }
  };

  const handleAssignStudentToSelectedSeat = (student: Student) => {
    if (!selectedSeatKey || !currentData) return;
    const [selNaipe, selStandStr, selPlace] = selectedSeatKey.split('::');
    const selStandNum = parseInt(selStandStr, 10);

    const newData: StagePlanData = {
      sections: currentData.sections.map((section) => ({
        ...section,
        stands: section.stands.map((stand) => ({
          ...stand,
          seats: stand.seats.map((seat) => {
            if (seat.studentId === student.id) {
              return { ...seat, studentId: null, studentName: null };
            }
            if (section.naipe === selNaipe && stand.number === selStandNum && seat.place === selPlace) {
              return { ...seat, studentId: student.id, studentName: student.nome };
            }
            return seat;
          }) as [typeof stand.seats[0], typeof stand.seats[1]],
        })),
      })),
    };

    setEditingData(newData);
    setSelectedSeatKey(null);
    showStatus(`${student.nome} colocado em ${selNaipe} Est. ${selStandNum} Lugar ${selPlace}`);
  };

  const startNewPlan = () => {
    const data = createEmptyStagePlan(relevantStudents);
    setEditingData(data);
    setSelectedPlanId(null);
    setSelectedSeatKey(null);
    const prefix = filterOrchestra ? `${filterOrchestra} - ` : '';
    setPlanName(`${prefix}Concerto ${new Date().toLocaleDateString('pt-PT')}`);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setEditingData(null);
    setSelectedSeatKey(null);
    setPlanName('');
  };

  const handleSave = () => {
    if (!currentData) return;
    const plan: StagePlan = {
      id: selectedPlanId ?? `plan-${Date.now()}`,
      name: planName || selectedPlan?.name || 'Plano sem nome',
      date: new Date().toISOString().split('T')[0],
      data: currentData,
    };
    onSave(plan);
    setEditingData(null);
    setSelectedPlanId(plan.id);
    setSelectedSeatKey(null);
    showStatus('Plano de palco guardado com sucesso!');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveStudentId(event.active.id as string);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveStudentId(null);
      const { active, over } = event;
      if (!over || !currentData) return;

      // Find active student info
      let activeStudentName: string | null = null;
      let activeStudentSourceId: string | null = null;
      let activeStudentSourceNaipe: string | null = null;
      let activeStudentSourceStand: number | null = null;
      let activeStudentSourcePlace: 'A' | 'B' | null = null;

      for (const section of currentData.sections) {
        for (const stand of section.stands) {
          for (const seat of stand.seats) {
            if (seat.studentId === active.id) {
              activeStudentName = seat.studentName;
              activeStudentSourceId = seat.studentId;
              activeStudentSourceNaipe = section.naipe;
              activeStudentSourceStand = stand.number;
              activeStudentSourcePlace = seat.place;
            }
          }
        }
      }

      // Also check pool students
      if (!activeStudentSourceId) {
        const poolStudent = students.find((s) => s.id === active.id);
        if (poolStudent) {
          activeStudentName = poolStudent.nome;
          activeStudentSourceId = poolStudent.id;
        }
      }

      if (!activeStudentSourceId) return;

      // Dropped onto pool
      if (over.id === 'pool') {
        if (activeStudentSourceNaipe) {
          const newData: StagePlanData = {
            sections: currentData.sections.map((section) => ({
              ...section,
              stands: section.stands.map((stand) => ({
                ...stand,
                seats: stand.seats.map((seat) => {
                  if (
                    activeStudentSourceNaipe === section.naipe &&
                    activeStudentSourceStand === stand.number &&
                    activeStudentSourcePlace === seat.place
                  ) {
                    return { ...seat, studentId: null, studentName: null };
                  }
                  return seat;
                }) as [typeof stand.seats[0], typeof stand.seats[1]],
              })),
            })),
          };
          setEditingData(newData);
          showStatus(`${activeStudentName} retirado do palco para a lista.`);
        }
        return;
      }

      // Dropped onto a seat
      const [overNaipe, overStand, overPlace] = (over.id as string).split('::');
      const overStandNum = parseInt(overStand, 10);

      // Target seat occupant
      let targetStudentId: string | null = null;
      let targetStudentName: string | null = null;

      for (const section of currentData.sections) {
        for (const stand of section.stands) {
          for (const seat of stand.seats) {
            if (section.naipe === overNaipe && stand.number === overStandNum && seat.place === overPlace) {
              targetStudentId = seat.studentId;
              targetStudentName = seat.studentName;
            }
          }
        }
      }

      const newData: StagePlanData = {
        sections: currentData.sections.map((section) => ({
          ...section,
          stands: section.stands.map((stand) => ({
            ...stand,
            seats: stand.seats.map((seat) => {
              // Clear or swap source seat
              if (
                activeStudentSourceNaipe === section.naipe &&
                activeStudentSourceStand === stand.number &&
                activeStudentSourcePlace === seat.place
              ) {
                return {
                  ...seat,
                  studentId: targetStudentId,
                  studentName: targetStudentName,
                };
              }
              // Set target seat
              if (
                overNaipe === section.naipe &&
                overStandNum === stand.number &&
                overPlace === seat.place
              ) {
                return {
                  ...seat,
                  studentId: activeStudentSourceId,
                  studentName: activeStudentName,
                };
              }
              return seat;
            }) as [typeof stand.seats[0], typeof stand.seats[1]],
          })),
        })),
      };

      setEditingData(newData);
      if (targetStudentName && activeStudentSourceNaipe) {
        showStatus(`Troca efetuada: ${activeStudentName} ⇄ ${targetStudentName}`);
      } else {
        showStatus(`${activeStudentName} colocado em ${overNaipe} Est. ${overStandNum} Lugar ${overPlace}`);
      }
    },
    [currentData, students]
  );

  const addStand = (naipe: string) => {
    if (!currentData) return;
    setEditingData({
      sections: currentData.sections.map((s) => {
        if (s.naipe !== naipe) return s;
        const newNum = (s.stands[s.stands.length - 1]?.number ?? 0) + 1;
        return {
          ...s,
          stands: [...s.stands, {
            number: newNum,
            seats: [
              { place: 'A', studentId: null, studentName: null },
              { place: 'B', studentId: null, studentName: null },
            ],
          }],
        };
      }),
    });
  };

  const removeStand = (naipe: string, standNum: number) => {
    if (!currentData) return;
    setEditingData({
      sections: currentData.sections.map((s) => {
        if (s.naipe !== naipe) return s;
        return { ...s, stands: s.stands.filter((st) => st.number !== standNum) };
      }),
    });
  };

  const activeStudent = relevantStudents.find((s) => s.id === activeStudentId);

  // Pool: students not placed anywhere (remove s.ativo requirement)
  const placedIds = new Set(
    currentData?.sections.flatMap((s) => s.stands.flatMap((st) => st.seats.map((seat) => seat.studentId))) ?? []
  );
  const poolStudents = relevantStudents.filter((s) => !placedIds.has(s.id));

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orchestra-gold border-t-transparent" />
      </div>
    );
  }

  const hasMultipleOrchestras = orchestras && orchestras.length > 1;

  return (
    <div className="p-6 space-y-4">
      {/* Status toast message */}
      {statusMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 px-4 py-2 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-emerald-500 flex-shrink-0" />
            {statusMessage}
          </span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white ml-2 text-sm leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Selected Seat Floating Action Bar */}
      {selectedSeatInfo && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-transparent border-2 border-amber-400 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400 text-orchestra-navy flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
              {selectedSeatInfo.place}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-100 uppercase tracking-wide">
                  Lugar Selecionado: {selectedSeatInfo.naipe} · Estante {selectedSeatInfo.standNumber}, Lugar {selectedSeatInfo.place}
                </span>
                {selectedSeatInfo.studentName ? (
                  <span className="px-2 py-0.5 bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 rounded text-xs font-semibold">
                    {selectedSeatInfo.studentName}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">(vazio)</span>
                )}
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 flex items-center gap-1">
                <ArrowLeftRight size={12} className="inline flex-shrink-0 text-amber-600 dark:text-amber-400" />
                Clica noutro lugar para <strong>trocar de posição</strong>, ou clica num aluno disponível à direita para o sentar aqui.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedSeatInfo.studentId && (
              <button
                type="button"
                onClick={() =>
                  handleClearSeat(
                    selectedSeatInfo.naipe,
                    selectedSeatInfo.standNumber,
                    selectedSeatInfo.place
                  )
                }
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm"
              >
                <UserMinus size={13} />
                Desocupar Lugar
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedSeatKey(null)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all shadow-sm"
            >
              <X size={13} />
              Cancelar Seleção
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {hasMultipleOrchestras && (
          <div className="relative">
            <select
              value={filterOrchestra}
              onChange={(e) => setFilterOrchestra(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200 font-semibold focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            >
              <option value="">Todas as Orquestras</option>
              {orchestras.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        <div className="relative">
          <select
            value={selectedPlanId ?? ''}
            onChange={(e) => e.target.value ? handleSelectPlan(e.target.value) : undefined}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          >
            <option value="" disabled>
              {plans.length === 0 ? 'Nenhum plano' : 'Selecionar plano...'}
            </option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.date})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={startNewPlan}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <Plus size={15} />
          Novo Plano
        </button>

        {currentData && (
          <>
            {(editingData || selectedPlanId) && (
              <input
                type="text"
                value={planName || selectedPlan?.name || ''}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Nome do plano..."
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              />
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-medium text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow-sm"
            >
              <Save size={15} />
              Guardar Plano
            </button>
            {selectedPlanId && (
              <button
                onClick={() => { onDelete(selectedPlanId); setSelectedPlanId(null); setEditingData(null); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <Trash2 size={15} />
                Eliminar
              </button>
            )}
          </>
        )}

        {/* Base de Dados de Mapas de Palco (Exportar / Importar) */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {onExportBackup && plans.length > 0 && (
            <button
              type="button"
              onClick={onExportBackup}
              title="Guardar cópia de segurança de todos os mapas de palco (Ficheiro JSON)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
            >
              <Download size={14} className="text-orchestra-gold" />
              <span>Exportar Backup ({plans.length})</span>
            </button>
          )}

          {onImportBackup && (
            <label
              title="Restaurar / Importar mapas de palco a partir de um ficheiro JSON"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-sm"
            >
              <Upload size={14} className="text-blue-500" />
              <span>Importar</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const parsed = JSON.parse(event.target?.result as string);
                      onImportBackup(parsed);
                    } catch {
                      toast.error('Ficheiro JSON de mapas de palco inválido.');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      {!currentData ? (
        <div className="text-center py-20 text-gray-400">
          <p>Seleciona um plano existente ou clica em "Novo Plano".</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4">
            {/* Stage canvas */}
            <div className="flex-1 min-w-0">
              <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl">
                {/* Stage label */}
                <div className="text-center mb-6">
                  <div className="inline-block px-8 py-2 bg-orchestra-gold/20 border border-orchestra-gold/40 rounded-full">
                    <span className="text-orchestra-gold text-sm font-semibold tracking-widest uppercase">Palco</span>
                  </div>
                </div>

                {/* Conductor podium */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-gray-300 text-xs">Maestro</span>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  {currentData.sections.map((section) => (
                    <div key={section.naipe} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-medium text-sm">{section.naipe}</h3>
                        <button
                          onClick={() => addStand(section.naipe)}
                          className="text-xs text-white/50 hover:text-orchestra-gold transition-colors flex items-center gap-1"
                        >
                          <Plus size={12} /> Estante
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {section.stands.map((stand) => (
                          <div key={stand.number} className="relative">
                            <div className="text-center text-white/40 text-xs mb-1">Est. {stand.number}</div>
                            <div className="flex gap-1.5">
                              {stand.seats.map((seat) => {
                                const seatStudent = students.find((s) => s.id === seat.studentId);
                                const isChefe =
                                  !!seatStudent?.chefeNaipe &&
                                  !['não', 'nao', 'false', '0', '-'].includes(seatStudent.chefeNaipe.toLowerCase());
                                const seatKey = `${section.naipe}::${stand.number}::${seat.place}`;
                                const isSelected = selectedSeatKey === seatKey;
                                const isPendingTarget = !!selectedSeatKey && !isSelected;

                                return (
                                  <DroppableSeat
                                    key={seatKey}
                                    id={seatKey}
                                    seat={seat}
                                    isSelected={isSelected}
                                    isPendingTarget={isPendingTarget}
                                    isChefe={isChefe}
                                    onClick={() => handleSeatClick(section.naipe, stand.number, seat.place)}
                                    onClear={() => handleClearSeat(section.naipe, stand.number, seat.place)}
                                  />
                                );
                              })}
                            </div>
                            {section.stands.length > 1 && (
                              <button
                                onClick={() => removeStand(section.naipe, stand.number)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                title="Remover estante"
                              >
                                <span className="text-white text-xs leading-none">×</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Audience */}
                <div className="mt-6 text-center">
                  <div className="inline-block px-8 py-1.5 bg-blue-900/30 border border-blue-500/20 rounded-full">
                    <span className="text-blue-300/60 text-xs tracking-widest uppercase">Audiência</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pool of unplaced students */}
            <div className="w-64 flex-shrink-0">
              <DroppablePool count={poolStudents.length}>
                {poolStudents.length === 0 ? (
                  <p className="text-xs text-gray-400">Todos os alunos estão colocados.</p>
                ) : (
                  poolStudents.map((s) => (
                    <DraggableStudent
                      key={s.id}
                      student={s}
                      isSelectedSeatActive={!!selectedSeatKey}
                      onAssignToSelectedSeat={() => handleAssignStudentToSelectedSeat(s)}
                    />
                  ))
                )}
              </DroppablePool>
            </div>
          </div>

          <DragOverlay>
            {activeStudent && (
              <div className="px-3 py-2 bg-orchestra-gold text-orchestra-navy rounded-lg text-sm font-medium shadow-lg opacity-90">
                {activeStudent.nome}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
