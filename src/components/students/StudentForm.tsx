import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Student } from '../../types';
import { NAIPES } from '../../types';

interface StudentFormProps {
  student?: Student;
  orchestras?: string[];
  onSave: (data: Omit<Student, 'id' | 'rowIndex'>) => void;
  onClose: () => void;
}

const EMPTY: Omit<Student, 'id' | 'rowIndex'> = {
  numero: '',
  nome: '',
  chefeNaipe: '',
  grau: '',
  naipe: '',
  ativo: true,
  orquestra: '',
};

export default function StudentForm({ student, orchestras, onSave, onClose }: StudentFormProps) {
  const [form, setForm] = useState<Omit<Student, 'id' | 'rowIndex'>>(
    student
      ? {
          numero: student.numero || '',
          nome: student.nome,
          chefeNaipe: student.chefeNaipe || '',
          grau: student.grau || '',
          naipe: student.naipe || '',
          ativo: student.ativo,
          orquestra: student.orquestra || (orchestras && orchestras[0]) || '',
        }
      : {
          ...EMPTY,
          orquestra: (orchestras && orchestras[0]) || '',
        }
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSave(form);
    onClose();
  };

  const hasMultipleOrchestras = orchestras && orchestras.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {student ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasMultipleOrchestras && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Orquestra / Aba *
              </label>
              <select
                required
                value={form.orquestra || orchestras[0]}
                onChange={(e) => setForm({ ...form, orquestra: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              >
                {orchestras.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome *
            </label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="ex: Maria Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Naipe *
            </label>
            <input
              type="text"
              list="naipes-list"
              required
              value={form.naipe}
              onChange={(e) => setForm({ ...form, naipe: e.target.value })}
              placeholder="Seleciona ou escreve o naipe (ex: Violino I, Viola d'arco, Flauta...)"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
            <datalist id="naipes-list">
              {NAIPES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chefes de Naipe
            </label>
            <input
              type="text"
              value={form.chefeNaipe}
              onChange={(e) => setForm({ ...form, chefeNaipe: e.target.value })}
              placeholder="ex: Sim, Chefe, Sub-chefe..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grau
            </label>
            <input
              type="text"
              value={form.grau}
              onChange={(e) => setForm({ ...form, grau: e.target.value })}
              placeholder="ex: 1º Grau, 5º Grau..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
            >
              {student ? 'Guardar Alterações' : 'Adicionar Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
