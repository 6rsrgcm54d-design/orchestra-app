import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, updateRange, deleteRow } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Student } from '../types';

const TAB = 'Alunos';
const HEADER = ['Nome', 'Naipe', 'Email', 'Nível', 'Ativo'];

function rowToStudent(row: string[], rowIndex: number): Student {
  return {
    id: `student-${rowIndex}`,
    rowIndex,
    nome: row[0] ?? '',
    naipe: row[1] ?? '',
    email: row[2] ?? '',
    nivel: row[3] ?? '',
    ativo: (row[4] ?? 'sim').toLowerCase() === 'sim',
  };
}

function studentToRow(s: Omit<Student, 'id' | 'rowIndex'>): (string | boolean)[] {
  return [s.nome, s.naipe, s.email, s.nivel, s.ativo ? 'sim' : 'não'];
}

export function useStudents() {
  const { config, getSheetId } = useSheets();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A:E`);
      // Skip header row (index 0)
      const data = rows.slice(1).map((row, i) => rowToStudent(row, i + 2)); // +2: header=row1, data starts row2
      setStudents(data);
    } catch (err) {
      toast.error(`Erro ao carregar alunos: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const add = useCallback(
    async (student: Omit<Student, 'id' | 'rowIndex'>) => {
      if (!config) return;
      const toastId = toast.loading('A adicionar aluno...');
      try {
        await appendRows(config.spreadsheetId, `${TAB}!A:E`, [studentToRow(student)]);
        toast.success('Aluno adicionado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, load]
  );

  const update = useCallback(
    async (student: Student) => {
      if (!config) return;
      const toastId = toast.loading('A guardar...');
      try {
        const range = `${TAB}!A${student.rowIndex}:E${student.rowIndex}`;
        await updateRange(config.spreadsheetId, range, [studentToRow(student)]);
        toast.success('Aluno atualizado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, load]
  );

  const remove = useCallback(
    async (student: Student) => {
      if (!config) return;
      const sheetId = getSheetId(TAB);
      if (sheetId === undefined) {
        toast.error('Aba "Alunos" não encontrada');
        return;
      }
      const toastId = toast.loading('A eliminar...');
      try {
        // rowIndex is 1-based (Sheets row), deleteRow expects 0-based index
        await deleteRow(config.spreadsheetId, sheetId, student.rowIndex - 1);
        toast.success('Aluno eliminado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, getSheetId, load]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    const rows = await readRange(config.spreadsheetId, `${TAB}!A1:E1`);
    if (!rows.length || rows[0][0] !== 'Nome') {
      await updateRange(config.spreadsheetId, `${TAB}!A1:E1`, [HEADER]);
    }
  }, [config]);

  return { students, isLoading, load, add, update, remove, ensureHeader };
}
