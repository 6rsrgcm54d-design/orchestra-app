import React, { useState } from 'react';
import { Users, Music, Star, Theater, Calendar, Clock, MapPin, ChevronRight, Award } from 'lucide-react';
import type { Student, Piece, Evaluation, Concert } from '../../types';
import { formatNaipe, formatTimeDisplay, cleanTimeString } from '../../types';
import { calcAverage } from '../../utils/csvExport';

interface DashboardProps {
  students: Student[];
  pieces: Piece[];
  evaluations: Evaluation[];
  concerts?: Concert[];
  onNavigate?: (module: 'concerts' | 'repertoire' | 'students') => void;
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

function NaipeSectionList({
  students,
  title,
  subtitle,
}: {
  students: Student[];
  title?: string;
  subtitle?: string;
}) {
  // Preserva a ordem exata dos naipes/instrumentos e alunos tal como constam no Google Sheets
  const orderMap = new Map<string, Student[]>();
  students.forEach((s) => {
    const n = formatNaipe(s.naipe) || 'Geral';
    if (!orderMap.has(n)) {
      orderMap.set(n, []);
    }
    orderMap.get(n)!.push(s);
  });

  const naipes = Array.from(orderMap.entries());

  if (naipes.length === 0) {
    return <p className="text-xs text-gray-400 py-3">Sem alunos registados.</p>;
  }

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orchestra-gold inline-block shadow-sm"></span>
            {title}
          </p>
          {subtitle && (
            <span className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-0.5 rounded-full font-semibold">
              {subtitle}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {naipes.map(([naipe, naipeStudents]) => (
          <div
            key={naipe}
            className="bg-white dark:bg-gray-800/90 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-1.5">
              <span className="text-xs font-bold text-orchestra-navy dark:text-orchestra-gold tracking-wide uppercase">
                {naipe}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {naipeStudents.length} {naipeStudents.length === 1 ? 'aluno' : 'alunos'}
              </span>
            </div>

            <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {naipeStudents.map((s) => {
                const isChefe =
                  !!s.chefeNaipe &&
                  !['não', 'nao', 'false', '0', '-'].includes(s.chefeNaipe.toLowerCase());
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate mr-2 flex items-center gap-1">
                      {s.numero && (
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {s.numero}.
                        </span>
                      )}
                      <span>{s.nome}</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isChefe && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/60">
                          ★ Chefe
                        </span>
                      )}
                      {s.grau && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.2 rounded">
                          {s.grau}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ students, pieces, evaluations, concerts = [], onNavigate }: DashboardProps) {
  const orchestras = Array.from(
    new Set(students.map((s) => s.orquestra).filter((o): o is string => !!o))
  );

  const hasMultipleOrchestras = orchestras.length > 1;
  const [selectedOrchestraTab, setSelectedOrchestraTab] = useState<string>('todas');

  const orchestraBreakdown = hasMultipleOrchestras
    ? orchestras.map((o) => `${o}: ${students.filter((s) => s.orquestra === o).length}`).join(' · ')
    : `${students.length} total`;

  const avgScore = calcAverage(evaluations);

  const recentEvals = [...evaluations]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  const upcomingConcerts = [...concerts]
    .filter((c) => c && c.data && !String(c.data).toLowerCase().includes('invalid'))
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 3);

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
          sub={pieces.length === 1 ? '1 peça registada' : `${pieces.length} peças registadas`}
          color="bg-purple-50 dark:bg-purple-900/30"
        />
        <StatCard
          icon={<Calendar size={20} className="text-amber-600" />}
          label="Concertos Agendados"
          value={concerts.length}
          sub={concerts.length > 0 ? `${concerts.length} apresentações marcadas` : 'Sem concertos'}
          color="bg-amber-50 dark:bg-amber-900/30"
        />
        <StatCard
          icon={<Theater size={20} className="text-green-600" />}
          label="Orquestras Ativas"
          value={hasMultipleOrchestras ? orchestras.length : 1}
          sub={hasMultipleOrchestras ? orchestras.join(', ') : 'Orquestra Principal'}
          color="bg-green-50 dark:bg-green-900/30"
        />
      </div>

      {/* Alunos por Naipe (Ordem do Google Sheets, sem números arbitrários) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award size={19} className="text-orchestra-gold" />
              Alunos por Naipe / Instrumento
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Naipes e alunos dispostos na ordem exata definida no Google Sheets
            </p>
          </div>

          {/* Separador de Orquestras */}
          {hasMultipleOrchestras && (
            <div className="flex bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl text-xs gap-1">
              <button
                type="button"
                onClick={() => setSelectedOrchestraTab('todas')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedOrchestraTab === 'todas'
                    ? 'bg-white dark:bg-gray-800 text-orchestra-navy dark:text-white font-bold shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                Todas as Orquestras ({students.length})
              </button>
              {orchestras.map((o) => {
                const count = students.filter((s) => s.orquestra === o).length;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setSelectedOrchestraTab(o)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedOrchestraTab === o
                        ? 'bg-white dark:bg-gray-800 text-orchestra-gold font-bold shadow-sm'
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

        {selectedOrchestraTab !== 'todas' ? (
          <NaipeSectionList
            students={displayedStudents}
            title={`Orquestra ${selectedOrchestraTab}`}
            subtitle={`${displayedStudents.length} alunos`}
          />
        ) : hasMultipleOrchestras ? (
          <div className="space-y-6">
            {orchestras.map((o) => {
              const orqStudents = students.filter((s) => s.orquestra === o);
              return (
                <div
                  key={o}
                  className="p-4 bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700/60"
                >
                  <NaipeSectionList
                    students={orqStudents}
                    title={`Orquestra ${o}`}
                    subtitle={`${orqStudents.length} alunos`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <NaipeSectionList students={students} />
        )}
      </div>

      {/* Two column layout: Próximos Concertos & Avaliações / Repertório */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Concertos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-orchestra-gold" />
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Próximos Concertos</h2>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('concerts')}
                className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
              >
                Ver todos <ChevronRight size={13} />
              </button>
            )}
          </div>

          {upcomingConcerts.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">Nenhum concerto agendado.</p>
          ) : (
            <div className="space-y-3">
              {upcomingConcerts.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-[10px] font-bold rounded">
                        {c.orquestra}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        📅 {c.data}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <MapPin size={12} className="text-red-500 flex-shrink-0" />
                      <span className="truncate">{c.local}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Concerto: {formatTimeDisplay(c.horaConcerto)}
                    </p>
                    {cleanTimeString(c.horaEnsaioGeral) && (
                      <p className="text-[11px] text-gray-400">
                        Ensaio: {formatTimeDisplay(c.horaEnsaioGeral)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avaliações Recentes & Repertório Resumo */}
        <div className="space-y-6">
          {/* Avaliações recentes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Star size={18} className="text-orchestra-gold" />
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Avaliações Recentes</h2>
            </div>
            {recentEvals.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Nenhuma avaliação registada.</p>
            ) : (
              <div className="space-y-2.5">
                {recentEvals.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{ev.nomeAluno}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                        {ev.criterio || (ev.orquestra ? `${ev.orquestra} · ${ev.naipe}` : ev.naipe) || 'Avaliação'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={i <= ev.pontuacao ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}>
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{ev.data}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repertório por Orquestra */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-orchestra-gold" />
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">Repertório por Orquestra</h2>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('repertoire')}
                  className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                >
                  Ver todas <ChevronRight size={13} />
                </button>
              )}
            </div>
            {pieces.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Nenhuma peça registada.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {orchestras.map((o) => {
                  const count = pieces.filter(
                    (p) =>
                      (p.orquestra || '').trim().toLowerCase() === o.toLowerCase() ||
                      p.orquestra === 'Todas'
                  ).length;
                  return (
                    <div
                      key={o}
                      className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-center"
                    >
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{count}</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium truncate">{o}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
