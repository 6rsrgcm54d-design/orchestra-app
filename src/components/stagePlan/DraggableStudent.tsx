import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Student } from '../../types';

interface DraggableStudentProps {
  student: Student;
}

export default function DraggableStudent({ student }: DraggableStudentProps) {
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
      className={`
        px-3 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing select-none
        transition-all border
        ${isDragging
          ? 'opacity-50 scale-95'
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-orchestra-gold hover:bg-orchestra-gold/10'
        }
      `}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="font-medium text-gray-900 dark:text-white text-xs truncate">{student.nome}</p>
        {isChefe && (
          <span className="text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/40 px-1 rounded flex-shrink-0" title="Chefe de Naipe">
            ★ Chefe
          </span>
        )}
      </div>
      <p className="text-gray-400 text-[11px]">
        {student.naipe || '—'} {student.grau ? `· ${student.grau}` : ''}
      </p>
    </div>
  );
}
