import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Student } from '../../types';

interface DraggableStudentProps {
  student: Student;
  isSelectedSeatActive?: boolean;
  onAssignToSelectedSeat?: () => void;
}

export default function DraggableStudent({
  student,
  isSelectedSeatActive,
  onAssignToSelectedSeat,
}: DraggableStudentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const isChefe =
    !!student.chefeNaipe &&
    !['não', 'nao', 'false', '0', '-'].includes(student.chefeNaipe.toLowerCase());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (isSelectedSeatActive && onAssignToSelectedSeat) {
          onAssignToSelectedSeat();
        }
      }}
      className={`
        px-3 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing select-none
        transition-all border
        ${isDragging
          ? 'opacity-50 scale-95'
          : isSelectedSeatActive
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 hover:bg-amber-100 hover:border-amber-400 cursor-pointer shadow-sm'
            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-orchestra-gold hover:bg-orchestra-gold/10'
        }
      `}
      title={isSelectedSeatActive ? 'Clica para colocar no lugar selecionado ou arrasta para o palco' : 'Arrasta para o palco'}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="font-medium text-gray-900 dark:text-white text-xs truncate">{student.nome}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isChefe && (
            <span className="text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/40 px-1 rounded" title="Chefe de Naipe">
              ★ Chefe
            </span>
          )}
          {isSelectedSeatActive && (
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-800/70 px-1.5 py-0.5 rounded">
              Colocar ↵
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-400 text-[11px]">
        {student.naipe || '—'} {student.grau ? `· ${student.grau}` : ''}
      </p>
    </div>
  );
}
