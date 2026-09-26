import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Piece } from '../../types';

interface PieceFormProps {
  piece?: Piece;
  orchestras?: string[];
  onSave: (data: Omit<Piece, 'id' | 'rowIndex'>) => void;
  onClose: () => void;
}

const EMPTY: Omit<Piece, 'id' | 'rowIndex'> = {
  titulo: '',
  compositor: '',
  dificuldade: '',
  duracao: '',
  estado: 'em ensaio',
  notas: '',
  orquestra: 'Académica',
};

export default function PieceForm({ piece, orchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano', 'Todas'], onSave, onClose }: PieceFormProps) {
  // Garante que apenas orquestras musicais reais aparecem
  const validOrchestras = React.useMemo(() => {
    const defaultOrchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'];
    const nonOrchestraPattern = /^alunos?$|chefe|geral/i;
    const filtered = orchestras
      .filter((o) => !nonOrchestraPattern.test(o.trim()))
      .map((o) => (/^10[º°]?\s*ano$/i.test(o.trim()) ? 'Orquestra 10º ano' : o));
    const unique = Array.from(new Set(filtered));
    defaultOrchestras.forEach((def) => {
      if (!unique.includes(def)) unique.push(def);
    });
    if (!unique.includes('Todas')) unique.push('Todas');
    return unique;
  }, [orchestras]);

  const [form, setForm] = useState<Omit<Piece, 'id' | 'rowIndex'>>(
    piece
      ? {
          titulo: piece.titulo,
          compositor: piece.compositor,
          dificuldade: piece.dificuldade,
          duracao: piece.duracao,
          estado: piece.estado,
          notas: piece.notas,
          orquestra: piece.orquestra || 'Académica',
        }
      : EMPTY
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {piece ? 'Editar Peça' : 'Nova Peça'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="Título da peça"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Compositor</label>
            <input
              type="text"
              value={form.compositor}
              onChange={(e) => setForm({ ...form, compositor: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="Nome do compositor"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orquestra *</label>
              <select
                value={form.orquestra || 'Académica'}
                onChange={(e) => setForm({ ...form, orquestra: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold font-medium"
              >
                {validOrchestras.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duração</label>
              <input
                type="text"
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                placeholder="ex: 12min"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold resize-none"
              placeholder="Notas adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-orchestra-navy bg-orchestra-gold rounded-lg hover:bg-orchestra-gold-light transition-all">
              {piece ? 'Guardar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
