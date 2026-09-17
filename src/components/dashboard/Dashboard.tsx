import React from 'react';
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

export default function Dashboard({ students, pieces, evaluations }: DashboardProps) {
  const activeStudents = students.filter((s) => s.ativo);

  // Students per naipe
  const naipeCounts = students.reduce((acc, s) => {
    if (!s.naipe) return acc;
    acc[s.naipe] = (acc[s.naipe] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedNaipes = Object.entries(naipeCounts).sort((a, b) => b[1] - a[1]);

  // Repertoire stats
  const emEnsaio = pieces.filter((p) => p.estado === 'em ensaio').length;
  const prontas = pieces.filter((p) => p.estado === 'pronto').length;

  // Evaluation average
  const avgScore = calcAverage(evaluations);

  // Recent evaluations (last 5)
  const recentEvals = [...evaluations]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} className="text-blue-600" />}
          label="Alunos Ativos"
          value={activeStudents.length}
          sub={`${students.length} total`}
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
          label="Naipes"
          value={Object.keys(naipeCounts).length}
          sub="secções na orquestra"
          color="bg-green-50 dark:bg-green-900/30"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alunos por naipe */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-orchestra-gold" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Alunos por Naipe</h2>
          </div>
          {sortedNaipes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum aluno registado.</p>
          ) : (
            <div className="space-y-2">
              {sortedNaipes.map(([naipe, count]) => {
                const max = sortedNaipes[0][1];
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={naipe} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-32 truncate">{naipe}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-orchestra-gold rounded-full h-2 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
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
                        <span key={i} className={i <= ev.pontuacao ? 'text-yellow-400' : 'text-gray-300'}>★</span>
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
        {pieces.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma peça no repertório.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['em ensaio', 'pronto', 'arquivado'] as const).map((estado) => {
              const count = pieces.filter((p) => p.estado === estado).length;
              const colors: Record<string, string> = {
                'em ensaio': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                pronto: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                arquivado: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
              };
              return (
                <div key={estado} className={`rounded-lg px-4 py-3 ${colors[estado]}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm capitalize">{estado}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
