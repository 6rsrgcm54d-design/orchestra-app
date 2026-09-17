import React, { useState, useCallback } from 'react';
import { Plus, Save, Trash2, ChevronDown } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
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
  isLoading: boolean;
  onSave: (plan: StagePlan) => void;
  onDelete: (planId: string) => void;
}

function createEmptyStagePlan(students: Student[]): StagePlanData {
  // Group students by naipe
  const byNaipe = students.reduce((acc, s) => {
    if (!s.naipe || !s.ativo) return acc;
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

export default function StagePlanView({ plans, students, isLoading, onSave, onDelete }: StagePlanViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [editingData, setEditingData] = useState<StagePlanData | null>(null);
  const [planName, setPlanName] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const currentData = editingData ?? selectedPlan?.data ?? null;

  const startNewPlan = () => {
    const data = createEmptyStagePlan(students);
    setEditingData(data);
    setSelectedPlanId(null);
    setPlanName(`Concerto ${new Date().toLocaleDateString('pt-PT')}`);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setEditingData(null);
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
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveStudentId(event.active.id as string);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveStudentId(null);
      const { active, over } = event;
      if (!over || !currentData) return;

      const [overNaipe, overStand, overPlace] = (over.id as string).split('::');

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

      const newData: StagePlanData = {
        sections: currentData.sections.map((section) => ({
          ...section,
          stands: section.stands.map((stand) => ({
            ...stand,
            seats: stand.seats.map((seat) => {
              // Clear source seat
              if (
                activeStudentSourceNaipe === section.naipe &&
                activeStudentSourceStand === stand.number &&
                activeStudentSourcePlace === seat.place
              ) {
                return { ...seat, studentId: null, studentName: null };
              }
              // Set target seat
              if (
                overNaipe === section.naipe &&
                parseInt(overStand) === stand.number &&
                overPlace === seat.place
              ) {
                return { ...seat, studentId: activeStudentSourceId, studentName: activeStudentName };
              }
              return seat;
            }) as [typeof stand.seats[0], typeof stand.seats[1]],
          })),
        })),
      };

      setEditingData(newData);
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

  const activeStudent = students.find((s) => s.id === activeStudentId);

  // Pool: students not placed anywhere
  const placedIds = new Set(
    currentData?.sections.flatMap((s) => s.stands.flatMap((st) => st.seats.map((seat) => seat.studentId))) ?? []
  );
  const poolStudents = students.filter((s) => s.ativo && !placedIds.has(s.id));

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orchestra-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
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
              className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-medium text-sm rounded-lg hover:bg-orchestra-gold-light transition-all"
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
                            <div className="flex gap-1">
                              {stand.seats.map((seat) => (
                                <DroppableSeat
                                  key={`${section.naipe}::${stand.number}::${seat.place}`}
                                  id={`${section.naipe}::${stand.number}::${seat.place}`}
                                  seat={seat}
                                />
                              ))}
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
            <div className="w-56 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Alunos disponíveis ({poolStudents.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {poolStudents.length === 0 ? (
                    <p className="text-xs text-gray-400">Todos os alunos estão colocados.</p>
                  ) : (
                    poolStudents.map((s) => (
                      <DraggableStudent key={s.id} student={s} />
                    ))
                  )}
                </div>
              </div>
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
