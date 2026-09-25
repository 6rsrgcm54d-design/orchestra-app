import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Filter, Crown } from 'lucide-react';
import type { Student } from '../../types';
import { NAIPES, formatNaipe } from '../../types';

interface StudentListProps {
  students: Student[];
  orchestras?: string[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export default function StudentList({
  students,
  orchestras,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: StudentListProps) {
  const [search, setSearch] = useState('');
  const [filterOrquestra, setFilterOrquestra] = useState('');
  const [filterNaipe, setFilterNaipe] = useState('');
  const [filterChefe, setFilterChefe] = useState('');

  const filtered = students.filter((s) => {
    const formattedNaipe = formatNaipe(s.naipe);
    const hasValidNaipe =
      !!formattedNaipe &&
      formattedNaipe !== '—' &&
      formattedNaipe !== '-' &&
      formattedNaipe.trim() !== '';

    // REGRA DO UTILIZADOR:
    // Na aba alunos e na aba chefes de naipe, só aparecem aqueles que têm naipe definido nessa aba
    const isFromAlunosOrChefesTab =
      s.orquestra &&
      (/^alunos?$/i.test(s.orquestra.trim()) || /chefe/i.test(s.orquestra.trim()));

    if (isFromAlunosOrChefesTab && !hasValidNaipe) {
      return false;
    }

    const matchSearch =
      !search ||
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      (s.numero && s.numero.includes(search)) ||
      s.grau.toLowerCase().includes(search.toLowerCase()) ||
      s.chefeNaipe.toLowerCase().includes(search.toLowerCase()) ||
      formattedNaipe.toLowerCase().includes(search.toLowerCase());

    const matchOrquestra = !filterOrquestra || s.orquestra === filterOrquestra;
    const matchNaipe = !filterNaipe || formattedNaipe === filterNaipe;
    const isChefe =
      (!!s.chefeNaipe && !['não', 'nao', 'false', '0', '-'].includes(s.chefeNaipe.toLowerCase())) ||
      (s.orquestra && /chefe/i.test(s.orquestra));
    const matchChefe =
      !filterChefe || (filterChefe === 'chefe' ? isChefe && hasValidNaipe : !isChefe);

    return matchSearch && matchOrquestra && matchNaipe && matchChefe;
  });

  const validOrchestras = React.useMemo(() => {
    const list = orchestras && orchestras.length > 0 ? orchestras : ['Académica', 'Juvenil', 'Artave'];
    const filtered = list.filter((o) => !/^alunos?$|chefe|geral|todos/i.test(o.trim()));
    return filtered.length > 0 ? filtered : ['Académica', 'Juvenil', 'Artave'];
  }, [orchestras]);

  const hasMultipleOrchestras = validOrchestras.length > 1;

  // Lista única de naipes existentes nos alunos para o filtro
  const existingNaipes = Array.from(
    new Set([...students.map((s) => formatNaipe(s.naipe)).filter(Boolean), ...NAIPES])
  );

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {[...Array(hasMultipleOrchestras ? 7 : 6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Abas / Orquestras (Navegação Rápida entre Orquestras) */}
      {hasMultipleOrchestras && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setFilterOrquestra('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              !filterOrquestra
                ? 'bg-orchestra-gold text-orchestra-navy shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span>Todas as Orquestras</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                !filterOrquestra
                  ? 'bg-orchestra-navy/20 text-orchestra-navy font-bold'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {students.length}
            </span>
          </button>
          {validOrchestras.map((o) => {
            const count = students.filter((s) => s.orquestra === o).length;
            const isSelected = filterOrquestra === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setFilterOrquestra(o)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orchestra-gold text-orchestra-navy shadow-sm font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{o}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-orchestra-navy/20 text-orchestra-navy font-bold'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Procurar por nome, naipe, grau..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-gray-400" />

          {/* Filtro de Orquestras */}
          {hasMultipleOrchestras && (
            <select
              value={filterOrquestra}
              onChange={(e) => setFilterOrquestra(e.target.value)}
              className="text-sm bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-amber-900 dark:text-amber-200 font-semibold focus:outline-none focus:ring-2 focus:ring-orchestra-gold shadow-sm"
            >
              <option value="">Todas as Orquestras</option>
              {validOrchestras.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}

          {/* Filtro de Naipe */}
          <select
            value={filterNaipe}
            onChange={(e) => setFilterNaipe(e.target.value)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          >
            <option value="">Todos os naipes</option>
            {existingNaipes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Filtro Chefes de Naipe */}
          <select
            value={filterChefe}
            onChange={(e) => setFilterChefe(e.target.value)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          >
            <option value="">Chefes de Naipe (Todos)</option>
            <option value="chefe">Apenas Chefes de Naipe</option>
          </select>

          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-medium text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                {hasMultipleOrchestras && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Orquestra</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Naipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chefes de Naipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grau</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                [...Array(hasMultipleOrchestras ? 6 : 5)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={hasMultipleOrchestras ? 6 : 5} className="px-4 py-10 text-center text-sm text-gray-400">
                    {students.length === 0 ? 'Nenhum aluno registado. Clique em "Adicionar".' : 'Nenhum resultado para os filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  const isChefe =
                    (!!student.chefeNaipe &&
                      !['não', 'nao', 'false', '0', '-'].includes(student.chefeNaipe.toLowerCase())) ||
                    (student.orquestra && /chefe/i.test(student.orquestra));

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        {student.numero && (
                          <span className="text-xs text-gray-400 font-mono min-w-[1.5rem] text-right mr-0.5 flex-shrink-0">
                            {student.numero}.
                          </span>
                        )}
                        {isChefe && (
                          <span title="Chefe de Naipe">
                            <Crown size={14} className="text-amber-500 flex-shrink-0" />
                          </span>
                        )}
                        <span>{student.nome}</span>
                      </td>

                      {hasMultipleOrchestras && (
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-semibold">
                            {student.orquestra || 'Geral'}
                          </span>
                        </td>
                      )}

                      {/* Naipe */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                          {formatNaipe(student.naipe) || '—'}
                        </span>
                      </td>

                      {/* Chefes de Naipe */}
                      <td className="px-4 py-3">
                        {isChefe ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-flex items-center gap-1">
                            <Crown size={12} className="text-amber-600 dark:text-amber-400" />
                            {student.chefeNaipe || 'Chefe'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Grau */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        {student.grau || '—'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(student)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => onDelete(student)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <p className="text-xs text-gray-400">{filtered.length} de {students.length} aluno(s)</p>
            {hasMultipleOrchestras && (
              <p className="text-xs text-gray-400">
                {validOrchestras.map((o) => `${o}: ${students.filter(s => s.orquestra === o).length}`).join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
