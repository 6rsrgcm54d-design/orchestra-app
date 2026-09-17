import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { StandSeat } from '../../types';

interface DroppableSeatProps {
  id: string;
  seat: StandSeat;
  isSelected?: boolean;
  isPendingTarget?: boolean;
  isChefe?: boolean;
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
}

export default function DroppableSeat({
  id,
  seat,
  isSelected = false,
  isPendingTarget = false,
  isChefe = false,
  onClick,
  onClear,
}: DroppableSeatProps) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: seat.studentId || `seat-dummy-${id}`,
    disabled: !seat.studentId,
  });

  return (
    <div
      ref={setDropRef}
      onClick={onClick}
      className={`
        relative group w-24 h-14 rounded-lg border-2 flex flex-col items-center justify-center
        transition-all cursor-pointer select-none
        ${isSelected
          ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900 scale-105 z-10 shadow-lg shadow-amber-500/20'
          : isOver
            ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400 scale-105 z-10 border-dashed'
            : isPendingTarget
              ? 'border-amber-400/70 border-dashed hover:bg-amber-400/10 hover:border-amber-400'
              : seat.studentId
                ? 'bg-orchestra-gold/20 border-orchestra-gold/60 text-white hover:border-orchestra-gold hover:bg-orchestra-gold/30'
                : 'bg-white/5 border-white/20 border-dashed text-white/40 hover:border-white/40 hover:bg-white/10'
        }
      `}
      title={
        isSelected
          ? 'Lugar selecionado (clica noutro lugar para trocar ou no aluno da lista)'
          : isPendingTarget
            ? 'Clica aqui para trocar com o lugar selecionado'
            : seat.studentName
              ? `${seat.studentName} (Lugar ${seat.place})`
              : `Lugar ${seat.place} vazio (clica para selecionar)`
      }
    >
      {/* Quick clear button on hover if occupied */}
      {seat.studentId && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-20"
          title="Desocupar lugar"
        >
          ×
        </button>
      )}

      {seat.studentId ? (
        <div
          ref={setDragRef}
          {...listeners}
          {...attributes}
          className={`w-full h-full flex flex-col items-center justify-center px-1.5 cursor-grab active:cursor-grabbing ${
            isDragging ? 'opacity-30' : ''
          }`}
        >
          <div className="flex items-center gap-1 w-full justify-center">
            {isSelected ? (
              <span className="text-amber-300 text-[9px] font-bold uppercase tracking-wider leading-none">
                ✓ Selecionado
              </span>
            ) : (
              <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold leading-none">
                Lugar {seat.place}
              </span>
            )}
            {isChefe && (
              <span className="text-[9px] font-bold text-amber-400" title="Chefe de Naipe">
                ★
              </span>
            )}
          </div>
          <span className="text-white text-[11px] font-medium text-center leading-tight truncate w-full mt-0.5">
            {seat.studentName}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pointer-events-none">
          {isSelected ? (
            <span className="text-amber-300 text-[9px] font-bold uppercase tracking-wider leading-none">
              ✓ Selecionado
            </span>
          ) : (
            <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold leading-none">
              Lugar {seat.place}
            </span>
          )}
          <span className="text-white/30 text-[10px] mt-0.5">vazio</span>
        </div>
      )}
    </div>
  );
}
