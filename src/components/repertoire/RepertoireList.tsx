import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import type { Piece } from '../../types';

interface RepertoireListProps {
  pieces: Piece[];
  orchestras?: string[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (piece: Piece) => void;
  onDelete: (piece: Piece) => void;
}

export default function RepertoireList({ pieces, orchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'], isLoading, onAdd, onEdit, onDelete }: RepertoireListProps) {
  const [search, setSearch] = useState('');
  const [filterOrquestra, setFilterOrquestra] = useState('');

  // Garante que apenas orquestras musicais reais aparecem (exclui abas administrativas como "Alunos", "Chefes de Naipe")
  const validOrchestras = React.useMemo(() => {
    const defaultOrchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'];
    const list = orchestras && orchestras.length > 0 ? orchestras : defaultOrchestras;
    const filtered = list
      .filter((o) => !/^alunos?$|chefe|geral|todos/i.test(o.trim()))
      .map((o) => (/^10[º°]?\s*ano$/i.test(o.trim()) ? 'Orquestra 10º ano' : o));
    const unique = Array.from(new Set(filtered));
    defaultOrchestras.forEach((def) => {
      if (!unique.includes(def)) unique.push(def);
    });
    return unique;
  }, [orchestras]);

  const filtered = pieces.filter((p) => {
    const matchSearch =
      !search ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.compositor.toLowerCase().includes(search.toLowerCase()) ||
      (p.orquestra && p.orquestra.toLowerCase().includes(search.toLowerCase()));
    const matchOrquestra = !filterOrquestra || p.orquestra === filterOrquestra || p.orquestra === 'Todas';
    return matchSearch && matchOrquestra;
  });

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-20" />
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar peça ou compositor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Orquestra */}
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


          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-medium text-sm rounded-lg hover:bg-orchestra-gold-light transition-all"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Grid of cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {pieces.length === 0 ? 'Nenhuma peça no repertório. Clique em "Adicionar".' : 'Nenhum resultado para a pesquisa.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((piece) => {
            return (
              <div
                key={piece.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{piece.titulo}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{piece.compositor}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(piece)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                      title="Editar peça"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(piece)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                      title="Eliminar peça"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {piece.orquestra && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      🎻 {piece.orquestra}
                    </span>
                  )}
                  {piece.duracao && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      ⏱ {piece.duracao}
                    </span>
                  )}
                </div>

                {piece.notas && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{piece.notas}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-gray-400">{filtered.length} de {pieces.length} peça(s)</p>
      )}
    </div>
  );
}
