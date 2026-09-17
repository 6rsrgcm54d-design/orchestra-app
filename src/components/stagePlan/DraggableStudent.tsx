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
      <p className="font-medium text-gray-900 dark:text-white text-xs">{student.nome}</p>
      <p className="text-gray-400 text-xs">{student.naipe}</p>
    </div>
  );
}
