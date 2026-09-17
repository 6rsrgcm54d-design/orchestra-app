import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { StandSeat } from '../../types';

interface DroppableSeatProps {
  id: string;
  seat: StandSeat;
}

export default function DroppableSeat({ id, seat }: DroppableSeatProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        w-20 h-12 rounded-lg border-2 flex flex-col items-center justify-center transition-all
        text-xs
        ${seat.studentId
          ? 'bg-orchestra-gold/20 border-orchestra-gold/60 text-white'
          : isOver
            ? 'bg-green-500/30 border-green-400 border-dashed'
            : 'bg-white/5 border-white/20 border-dashed text-white/30'
        }
      `}
    >
      <span className="text-white/40 text-[10px] leading-none mb-0.5">Lugar {seat.place}</span>
      {seat.studentName ? (
        <span className="text-white text-[11px] font-medium text-center leading-tight px-1 truncate w-full text-center">
          {seat.studentName.split(' ')[0]}
        </span>
      ) : (
        <span className="text-white/20 text-[10px]">vazio</span>
      )}
    </div>
  );
}
