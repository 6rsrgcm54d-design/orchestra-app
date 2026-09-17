import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Filter } from 'lucide-react';
import type { Student } from '../../types';
import { NAIPES, NIVEIS } from '../../types';

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
  const [filterNivel, setFilterNivel] = useState('');
  const [filterAtivo, setFilterAtivo] = useState('');

  const filtered = students.filter((s) => {
    const matchSearch =
      !search ||
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchOrquestra = !filterOrquestra || s.orquestra === filterOrquestra;
    const matchNaipe = !filterNaipe || s.naipe === filterNaipe;
    const matchNivel = !filterNivel || s.nivel === filterNivel;
    const matchAtivo =
      !filterAtivo ||
      (filterAtivo === 'ativo' ? s.ativo : !s.ativo);
    return matchSearch && matchOrquestra && matchNaipe && matchNivel && matchAtivo;
  });

  const hasMultipleOrchestras = orchestras && orchestras.length > 1;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Procurar aluno..."
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
              {orchestras.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}

          <select
            value={filterNaipe}
            onChange={(e) => setFilterNaipe(e.target.value)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          >
            <option value="">Todos os naipes</option>
            {NAIPES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          >
            <option value="">Todos os níveis</option>
            {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <select
            value={filterAtivo}
            onChange={(e) => setFilterAtivo(e.target.value)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          >
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nível</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={hasMultipleOrchestras ? 7 : 6} className="px-4 py-10 text-center text-sm text-gray-400">
                    {students.length === 0 ? 'Nenhum aluno registado. Clique em "Adicionar".' : 'Nenhum resultado para os filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{student.nome}</td>
                    {hasMultipleOrchestras && (
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-semibold">
                          {student.orquestra || 'Geral'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {student.naipe || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{student.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{student.nivel || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          student.ativo
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {student.ativo ? 'Ativo' : 'Inativo'}
                      </span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <p className="text-xs text-gray-400">{filtered.length} de {students.length} aluno(s)</p>
            {hasMultipleOrchestras && (
              <p className="text-xs text-gray-400">
                {orchestras.map((o) => `${o}: ${students.filter(s => s.orquestra === o).length}`).join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
