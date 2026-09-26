import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import type { Evaluation, Student, Criteria } from '../../types';
import { isCbOrchestra } from '../../hooks/useEvaluations';

interface EvaluationFormProps {
  students: Student[];
  criteria: Criteria[];
  onSave: (ev: Omit<Evaluation, 'id' | 'rowIndex'>) => void;
  onClose: () => void;
}

export default function EvaluationForm({ students, criteria, onSave, onClose }: EvaluationFormProps) {
  const [form, setForm] = useState({
    nomeAluno: '',
    naipe: '',
    criterio: '',
    pontuacao: 0,
    data: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  const selectedStudent = students.find((s) => s.nome === form.nomeAluno);
  const isCB = !selectedStudent?.orquestra || isCbOrchestra(selectedStudent.orquestra);

  const handleStudentChange = (nome: string) => {
    const student = students.find((s) => s.nome === nome);
    setForm({ ...form, nomeAluno: nome, naipe: student?.naipe ?? '', criterio: !criteria.length ? 'Classificação Final' : form.criterio });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeAluno || !form.criterio || form.pontuacao === 0) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Avaliação</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aluno *</label>
            <select
              required
              value={form.nomeAluno}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            >
              <option value="">Selecionar aluno...</option>
              {students.filter(s => s.ativo !== false).map((s) => (
                <option key={s.id} value={s.nome}>
                  {s.nome} — {s.naipe}{s.orquestra ? ` (${s.orquestra})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Critério *</label>
            <select
              required
              value={form.criterio}
              onChange={(e) => setForm({ ...form, criterio: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            >
              <option value="">Selecionar critério...</option>
              {criteria.map((c) => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            {criteria.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Nenhum critério encontrado. Adicione critérios na aba "Critérios" do Sheets.
              </p>
            )}
          </div>

          {/* Pontuação / Classificação */}
          <div>
            {isCB ? (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pontuação (1 a 5) *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, pontuacao: star })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={star <= form.pontuacao ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                      />
                    </button>
                  ))}
                </div>
                {form.pontuacao > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {['', 'Insuficiente', 'Suficiente', 'Bom', 'Muito Bom', 'Excelente'][form.pontuacao]}
                  </p>
                )}
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Classificação Final (0 a 20 valores) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={form.pontuacao > 0 ? form.pontuacao : ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setForm({ ...form, pontuacao: isNaN(val) ? 0 : Math.min(20, Math.max(0, val)) });
                    }}
                    placeholder="Ex: 16"
                    className="w-28 px-3 py-2 text-base font-bold font-mono text-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  />
                  {form.pontuacao > 0 && (
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        form.pontuacao >= 18
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : form.pontuacao >= 14
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          : form.pontuacao >= 10
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {form.pontuacao >= 18
                        ? 'Excelente (18-20)'
                        : form.pontuacao >= 14
                        ? 'Bom (14-17)'
                        : form.pontuacao >= 10
                        ? 'Suficiente (10-13)'
                        : 'Insuficiente (<10)'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold resize-none"
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={form.pontuacao === 0}
              className="flex-1 py-2 px-4 text-sm font-medium text-orchestra-navy bg-orchestra-gold rounded-lg hover:bg-orchestra-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
