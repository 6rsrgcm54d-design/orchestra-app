import React, { useState } from 'react';
import { Users, Music, Star, Theater, TrendingUp } from 'lucide-react';
import type { Student, Piece, Evaluation } from '../../types';
import { calcAverage } from '../../utils/csvExport';

interface DashboardProps {
  students: Student[];
  pieces: Piece[];
  evaluations: Evaluation[];
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function NaipeBarList({
  students,
  title,
  subtitle,
}: {
  students: Student[];
  title?: string;
  subtitle?: string;
}) {
  const counts = students.reduce((acc, s) => {
    if (!s.naipe) return acc;
    acc[s.naipe] = (acc[s.naipe] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return <p className="text-xs text-gray-400 py-2">Sem alunos registados.</p>;
  }

  const max = sorted[0][1];

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between pb-1 mb-2 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-900 dark:text-white">{title}</p>
          {subtitle && <span className="text-[11px] text-gray-400">{subtitle}</span>}
        </div>
      )}
      {sorted.map(([naipe, count]) => {
        const pct = Math.round((count / max) * 100);
        return (
          <div key={naipe} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400 w-28 truncate">{naipe}</span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-orchestra-gold rounded-full h-2 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-6 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ students, pieces, evaluations }: DashboardProps) {
  const orchestras = Array.from(
    new Set(students.map((s) => s.orquestra).filter((o): o is string => !!o))
  );

  const hasMultipleOrchestras = orchestras.length > 1;
  const [selectedOrchestraTab, setSelectedOrchestraTab] = useState<string>('todas');

  // Subtitle for total students
  const orchestraBreakdown = hasMultipleOrchestras
    ? orchestras.map((o) => `${o}: ${students.filter((s) => s.orquestra === o).length}`).join(' · ')
    : `${students.length} total`;

  // Repertoire stats
  const emEnsaio = pieces.filter((p) => p.estado === 'em ensaio').length;
  const prontas = pieces.filter((p) => p.estado === 'pronto').length;

  // Evaluation average
  const avgScore = calcAverage(evaluations);

  // Recent evaluations (last 5)
  const recentEvals = [...evaluations]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  const displayedStudents =
    selectedOrchestraTab === 'todas'
      ? students
      : students.filter((s) => s.orquestra === selectedOrchestraTab);

  return (
    <div className="p-6 space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} className="text-blue-600" />}
          label="Total de Alunos"
          value={students.length}
          sub={orchestraBreakdown}
          color="bg-blue-50 dark:bg-blue-900/30"
        />
        <StatCard
          icon={<Music size={20} className="text-purple-600" />}
          label="Repertório"
          value={pieces.length}
          sub={`${emEnsaio} em ensaio · ${prontas} prontas`}
          color="bg-purple-50 dark:bg-purple-900/30"
        />
        <StatCard
          icon={<Star size={20} className="text-yellow-600" />}
          label="Avaliações"
          value={evaluations.length}
          sub={avgScore > 0 ? `Média: ${avgScore.toFixed(1)} ⭐` : 'Sem avaliações'}
          color="bg-yellow-50 dark:bg-yellow-900/30"
        />
        <StatCard
          icon={<Theater size={20} className="text-green-600" />}
          label="Orquestras"
          value={hasMultipleOrchestras ? orchestras.length : 1}
          sub={hasMultipleOrchestras ? orchestras.join(', ') : 'Orquestra Principal'}
          color="bg-green-50 dark:bg-green-900/30"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alunos por naipe (Separados por Orquestra) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-orchestra-gold" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Alunos por Naipe</h2>
            </div>

            {/* Separador de Orquestras */}
            {hasMultipleOrchestras && (
              <div className="flex bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedOrchestraTab('todas')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    selectedOrchestraTab === 'todas'
                      ? 'bg-white dark:bg-gray-800 text-orchestra-navy dark:text-white font-semibold shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                  }`}
                >
                  Todas ({students.length})
                </button>
                {orchestras.map((o) => {
                  const count = students.filter((s) => s.orquestra === o).length;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setSelectedOrchestraTab(o)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        selectedOrchestraTab === o
                          ? 'bg-white dark:bg-gray-800 text-orchestra-gold font-semibold shadow-sm'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {o} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Se a opção for ver individual ou geral */}
          {selectedOrchestraTab !== 'todas' ? (
            <NaipeBarList
              students={displayedStudents}
              title={`Orquestra ${selectedOrchestraTab}`}
              subtitle={`${displayedStudents.length} alunos`}
            />
          ) : hasMultipleOrchestras ? (
            /* Vista separada lado a lado das duas orquestras */
            <div className="space-y-5">
              {orchestras.map((o) => {
                const orqStudents = students.filter((s) => s.orquestra === o);
                return (
                  <div
                    key={o}
                    className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60"
                  >
                    <NaipeBarList
                      students={orqStudents}
                      title={`Orquestra ${o}`}
                      subtitle={`${orqStudents.length} alunos`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <NaipeBarList students={students} />
          )}
        </div>

        {/* Avaliações recentes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} className="text-orchestra-gold" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Avaliações Recentes</h2>
          </div>
          {recentEvals.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma avaliação registada.</p>
          ) : (
            <div className="space-y-3">
              {recentEvals.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.nomeAluno}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ev.criterio}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={i <= ev.pontuacao ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{ev.data}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repertoire status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Music size={18} className="text-orchestra-gold" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Estado do Repertório</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{emEnsaio}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Em Ensaio</p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{prontas}</p>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Pronto</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
              {pieces.filter((p) => p.estado === 'arquivado').length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Arquivado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
