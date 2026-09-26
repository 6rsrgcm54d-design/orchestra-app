import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Music2, FileText } from 'lucide-react';
import type { Concert } from '../../types';
import { cleanTimeString } from '../../types';

interface ConcertFormModalProps {
  concert?: Concert;
  orchestras?: string[];
  onSave: (data: Omit<Concert, 'id' | 'rowIndex'>) => void;
  onClose: () => void;
}

const EMPTY: Omit<Concert, 'id' | 'rowIndex'> = {
  orquestra: 'Académica',
  data: new Date().toISOString().split('T')[0],
  horaEnsaioGeral: '15:00',
  horaConcerto: '21:00',
  local: '',
  programa: '',
  notas: '',
};

function normalizeDateForInput(d?: string): string {
  if (!d) return new Date().toISOString().split('T')[0];
  const str = d.trim();
  const ptMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ptMatch) {
    return `${ptMatch[3]}-${ptMatch[2].padStart(2, '0')}-${ptMatch[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
}

export default function ConcertFormModal({
  concert,
  orchestras = ['Académica', 'Juvenil', 'Artave', 'Orquestra 10º ano'],
  onSave,
  onClose,
}: ConcertFormModalProps) {
  const [form, setForm] = useState<Omit<Concert, 'id' | 'rowIndex'>>(() => {
    if (concert) {
      return {
        orquestra: concert.orquestra || 'Académica',
        data: normalizeDateForInput(concert.data),
        horaEnsaioGeral: cleanTimeString(concert.horaEnsaioGeral) || '15:00',
        horaConcerto: cleanTimeString(concert.horaConcerto) || '21:00',
        local: concert.local || '',
        programa: concert.programa || '',
        notas: concert.notas || '',
      };
    }
    return EMPTY;
  });

  useEffect(() => {
    if (concert) {
      setForm({
        orquestra: concert.orquestra || 'Académica',
        data: normalizeDateForInput(concert.data),
        horaEnsaioGeral: cleanTimeString(concert.horaEnsaioGeral) || '15:00',
        horaConcerto: cleanTimeString(concert.horaConcerto) || '21:00',
        local: concert.local || '',
        programa: concert.programa || '',
        notas: concert.notas || '',
      });
    }
  }, [concert]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.data || !form.local.trim()) return;
    onSave(form);
    onClose();
  };

  const validOrchestras = orchestras.filter((o) => !/^alunos?$|chefe|geral/i.test(o.trim()));
  const orqOptions = Array.from(new Set([...validOrchestras, 'Todas']));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-orchestra-gold rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {concert ? 'Editar Concerto' : 'Agendar Novo Concerto'}
              </h2>
              <p className="text-xs text-gray-400">Preencha os dados e horários da apresentação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Orquestra & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Orquestra *
              </label>
              <select
                value={form.orquestra}
                onChange={(e) => setForm({ ...form, orquestra: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              >
                {orqOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Data do Concerto *
              </label>
              <input
                type="date"
                required
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              />
            </div>
          </div>

          {/* Horários: Ensaio Geral & Concerto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={13} className="text-amber-500" /> Hora Ensaio Geral
              </label>
              <input
                type="time"
                value={form.horaEnsaioGeral}
                onChange={(e) => setForm({ ...form, horaEnsaioGeral: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                placeholder="15:00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={13} className="text-emerald-500" /> Hora Concerto *
              </label>
              <input
                type="time"
                required
                value={form.horaConcerto}
                onChange={(e) => setForm({ ...form, horaConcerto: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                placeholder="21:00"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin size={13} className="text-red-500" /> Local da Apresentação *
            </label>
            <input
              type="text"
              required
              value={form.local}
              onChange={(e) => setForm({ ...form, local: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="ex: Theatro Circo, Auditório do Conservatório Bomfim..."
            />
          </div>

          {/* Programa */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Music2 size={13} className="text-purple-500" /> Programa Musical *
            </label>
            <textarea
              required
              rows={3}
              value={form.programa}
              onChange={(e) => setForm({ ...form, programa: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold resize-none"
              placeholder="Ex:&#10;L. v. Beethoven: Sinfonia nº 5 em Dó Menor&#10;P. I. Tchaikovsky: Suíte O Quebra-Nozes"
            />
          </div>

          {/* Notas Adicionais */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText size={13} className="text-gray-400" /> Notas / Fardamento / Avisos
            </label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold resize-none"
              placeholder="Ex: Fardamento todo preto. Chegada 30 min antes do ensaio geral para afinação."
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 text-sm font-medium text-orchestra-navy bg-orchestra-gold rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
            >
              {concert ? 'Guardar Alterações' : 'Agendar Concerto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
