import React, { useState } from 'react';
import { Plus, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Evaluation, Student, Criteria } from '../../types';
import { groupByStudent, groupByCriteria, calcAverage } from '../../utils/csvExport';
import { exportEvaluationsToCSV } from '../../utils/csvExport';
import EvaluationForm from './EvaluationForm';

interface EvaluationsViewProps {
  evaluations: Evaluation[];
  students: Student[];
  criteria: Criteria[];
  isLoading: boolean;
  onAdd: (ev: Omit<Evaluation, 'id' | 'rowIndex'>) => void;
  onDelete: (ev: Evaluation) => void;
}

function StarDisplay({ score }: { score: number }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= score ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>★</span>
      ))}
    </span>
  );
}

export default function EvaluationsView({ evaluations, students, criteria, isLoading, onAdd, onDelete }: EvaluationsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'byStudent' | 'byCriteria'>('byStudent');

  const byStudent = groupByStudent(evaluations);
  const byCriteria = groupByCriteria(evaluations);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('byStudent')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all ${activeTab === 'byStudent' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Por Aluno
          </button>
          <button
            onClick={() => setActiveTab('byCriteria')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all ${activeTab === 'byCriteria' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Por Critério
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportEvaluationsToCSV(evaluations)}
            disabled={evaluations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-40"
          >
            <Download size={15} />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-medium text-sm rounded-lg hover:bg-orchestra-gold-light transition-all"
          >
            <Plus size={16} />
            Nova Avaliação
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-16" />
          ))}
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Nenhuma avaliação registada. Clique em "Nova Avaliação".
        </div>
      ) : activeTab === 'byStudent' ? (
        // By Student view
        <div className="space-y-3">
          {Object.entries(byStudent).sort().map(([studentName, evs]) => {
            const avg = calcAverage(evs);
            const isExpanded = expandedStudent === studentName;
            return (
              <div key={studentName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setExpandedStudent(isExpanded ? null : studentName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-left">{studentName}</p>
                      <p className="text-xs text-gray-400">{evs[0]?.naipe} · {evs.length} avaliação(ões)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <StarDisplay score={Math.round(avg)} />
                      <p className="text-xs text-gray-400">{avg.toFixed(1)} / 5</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                    {evs.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.criterio}</p>
                          {ev.observacoes && <p className="text-xs text-gray-400 mt-0.5">{ev.observacoes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <StarDisplay score={ev.pontuacao} />
                            <p className="text-xs text-gray-400">{ev.data}</p>
                          </div>
                          <button
                            onClick={() => onDelete(ev)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                          >
                            <Trash2 size={14} />
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
        // By Criteria view
        <div className="space-y-3">
          {Object.entries(byCriteria).sort().map(([criteriaName, evs]) => {
            const avg = calcAverage(evs);
            return (
              <div key={criteriaName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{criteriaName}</p>
                    <p className="text-xs text-gray-400">{evs.length} avaliação(ões)</p>
                  </div>
                  <div className="text-right">
                    <StarDisplay score={Math.round(avg)} />
                    <p className="text-xs text-gray-400">Média: {avg.toFixed(1)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {evs.sort((a, b) => b.pontuacao - a.pontuacao).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex-1">{ev.nomeAluno}</span>
                      <StarDisplay score={ev.pontuacao} />
                      <span className="text-gray-400 text-xs w-20 text-right">{ev.data}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <EvaluationForm
          students={students}
          criteria={criteria}
          onSave={onAdd}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
