import React, { useState } from 'react';
import { Plus, Search, Calendar, Clock, MapPin, Music2, Pencil, Trash2, FileText, ChevronRight } from 'lucide-react';
import type { Concert } from '../../types';
import { formatTimeDisplay } from '../../types';
import ConcertFormModal from './ConcertFormModal';

interface ConcertsViewProps {
  concerts: Concert[];
  orchestras?: string[];
  isLoading: boolean;
  onAdd: (data: Omit<Concert, 'id' | 'rowIndex'>) => void;
  onUpdate: (concert: Concert) => void;
  onDelete: (concert: Concert) => void;
}

export default function ConcertsView({
  concerts,
  orchestras = ['Académica', 'Juvenil', 'Artave'],
  isLoading,
  onAdd,
  onUpdate,
  onDelete,
}: ConcertsViewProps) {
  const [search, setSearch] = useState('');
  const [filterOrquestra, setFilterOrquestra] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcert, setEditingConcert] = useState<Concert | undefined>();

  const filtered = concerts
    .filter((c) => {
      // Ignora linhas vazias ou corrompidas
      if (!c.data && !c.local && !c.programa) return false;
      if (String(c.data).toLowerCase().includes('invalid') && !c.local && !c.programa) return false;

      const matchSearch =
        !search ||
        c.local.toLowerCase().includes(search.toLowerCase()) ||
        c.programa.toLowerCase().includes(search.toLowerCase()) ||
        c.orquestra.toLowerCase().includes(search.toLowerCase()) ||
        (c.notas && c.notas.toLowerCase().includes(search.toLowerCase()));
      const matchOrquestra = !filterOrquestra || c.orquestra === filterOrquestra || c.orquestra === 'Todas';
      return matchSearch && matchOrquestra;
    })
    .sort((a, b) => {
      const timeA = new Date(a.data).getTime();
      const timeB = new Date(b.data).getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeA - timeB;
    });

  const handleEdit = (c: Concert) => {
    setEditingConcert(c);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingConcert(undefined);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: Omit<Concert, 'id' | 'rowIndex'>) => {
    if (editingConcert) {
      onUpdate({ ...editingConcert, ...data });
    } else {
      onAdd(data);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !dateStr.trim() || dateStr.toLowerCase().includes('invalid')) {
      return { dia: '—', mes: 'DATA', ano: '', diaSemana: 'A definir', isValid: false };
    }
    try {
      let normalized = dateStr.trim();
      const ptDateMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ptDateMatch) {
        normalized = `${ptDateMatch[3]}-${ptDateMatch[2].padStart(2, '0')}-${ptDateMatch[1].padStart(2, '0')}`;
      }

      const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
      if (isNaN(d.getTime())) {
        return { dia: '—', mes: 'DATA', ano: '', diaSemana: 'A definir', isValid: false };
      }
      return {
        dia: d.toLocaleDateString('pt-PT', { day: '2-digit' }),
        mes: d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase(),
        ano: String(d.getFullYear()),
        diaSemana: d.toLocaleDateString('pt-PT', { weekday: 'long' }),
        isValid: true,
      };
    } catch {
      return { dia: '—', mes: 'DATA', ano: '', diaSemana: 'A definir', isValid: false };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-orchestra-gold" size={24} />
            Agenda de Concertos & Ensaios
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gestão das datas, ensaios gerais, locais e programas musicais por orquestra
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar local, programa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

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

          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
          >
            <Plus size={16} />
            Agendar Concerto
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-500/10 text-orchestra-gold rounded-full flex items-center justify-center mx-auto">
            <Calendar size={24} />
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Nenhum concerto agendado</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            {concerts.length === 0
              ? 'Registe os concertos das suas orquestras para manter horários e programas sempre organizados.'
              : 'Nenhum concerto encontrado com os filtros selecionados.'}
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow"
          >
            <Plus size={16} />
            Agendar Primeiro Concerto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((concert) => {
            const dateObj = formatDateDisplay(concert.data);
            return (
              <div
                key={concert.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of card */}
                  <div className="p-5 pb-3 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800">
                    <div className="flex items-center gap-3.5">
                      {/* Calendar Badge */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-orchestra-gold/15 dark:bg-orchestra-gold/20 border border-orchestra-gold/40 text-orchestra-navy dark:text-orchestra-gold shadow-sm flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-orchestra-gold-dark dark:text-amber-300">
                          {dateObj.mes}
                        </span>
                        <span className="text-xl font-black leading-none mt-0.5">
                          {dateObj.dia}
                        </span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">
                          {dateObj.ano}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            Orquestra {concert.orquestra}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {dateObj.diaSemana}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mt-1">
                          <MapPin size={15} className="text-red-500 flex-shrink-0" />
                          <span className="truncate">{concert.local}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(concert)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                        title="Editar concerto"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(concert)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        title="Eliminar concerto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-4">
                    {/* Horários */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Ensaio Geral</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {formatTimeDisplay(concert.horaEnsaioGeral)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-3">
                        <Clock size={16} className="text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Concerto</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatTimeDisplay(concert.horaConcerto)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Programa Musical */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Music2 size={14} className="text-purple-500" /> Programa
                      </p>
                      <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed font-mono">
                        {concert.programa || 'Programa ainda não especificado.'}
                      </div>
                    </div>

                    {/* Observações / Notas */}
                    {concert.notas && (
                      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1">
                        <FileText size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="italic">{concert.notas}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Concerto agendado</span>
                  <button
                    onClick={() => handleEdit(concert)}
                    className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    Ver detalhes <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ConcertFormModal
          concert={editingConcert}
          orchestras={orchestras}
          onSave={handleSaveModal}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
