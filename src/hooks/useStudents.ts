import { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, updateRange, deleteRow } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Student } from '../types';

const NON_STUDENT_TABS = new Set([
  'repertório',
  'repertorio',
  'avaliações',
  'avaliacoes',
  'critérios',
  'criterios',
  'planospalco',
  'planos palco',
  'planos',
]);

function detectMapping(headerRow: string[]) {
  // Ordem predefinida: Nome, Chefes de Naipe, Grau, Naipe, Ativo
  const mapping = { nome: 0, chefeNaipe: 1, grau: 2, naipe: 3, ativo: 4 };
  if (!headerRow || headerRow.length === 0) return mapping;

  headerRow.forEach((col, idx) => {
    const text = String(col).toLowerCase().trim();
    if (/chefe/i.test(text)) {
      mapping.chefeNaipe = idx;
    } else if (/grau|ano|classe|curso/i.test(text)) {
      mapping.grau = idx;
    } else if (/naipe|instrumento|se[cç][cç][aã]o/i.test(text)) {
      mapping.naipe = idx;
    } else if (/nome|aluno|estudante/i.test(text)) {
      mapping.nome = idx;
    } else if (/email|e-mail|correio|contacto/i.test(text)) {
      mapping.grau = idx;
    } else if (/n[ií]vel/i.test(text)) {
      mapping.naipe = idx;
    } else if (/ativo|ativa|estado|status/i.test(text)) {
      mapping.ativo = idx;
    }
  });

  return mapping;
}

function parseStudentRow(
  row: string[],
  rowIndex: number,
  tabName: string,
  mapping: { nome: number; chefeNaipe: number; grau: number; naipe: number; ativo: number }
): Student | null {
  const nome = row[mapping.nome] !== undefined ? String(row[mapping.nome]).trim() : '';
  if (!nome || nome.toLowerCase() === 'nome') return null;

  const chefeNaipe = row[mapping.chefeNaipe] !== undefined ? String(row[mapping.chefeNaipe]).trim() : '';
  const grau = row[mapping.grau] !== undefined ? String(row[mapping.grau]).trim() : '';
  const naipe = row[mapping.naipe] !== undefined ? String(row[mapping.naipe]).trim() : '';
  const ativoVal = row[mapping.ativo] !== undefined ? String(row[mapping.ativo]).toLowerCase().trim() : 'sim';
  const ativo = !['não', 'nao', 'inativo', 'false', '0', 'no'].includes(ativoVal);

  return {
    id: `student-${tabName}-${rowIndex}`,
    rowIndex,
    nome,
    chefeNaipe,
    grau,
    naipe,
    ativo,
    orquestra: tabName,
  };
}

function studentToRow(s: Omit<Student, 'id' | 'rowIndex'>): (string | boolean)[] {
  return [s.nome, s.chefeNaipe, s.grau, s.naipe, s.ativo ? 'sim' : 'não'];
}

export function useStudents() {
  const { config, sheetsMeta, getSheetId } = useSheets();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Detect which tabs contain students (e.g. "Académica", "Juvenil", or "Alunos")
  const studentTabs = useMemo(() => {
    if (!sheetsMeta?.sheets || sheetsMeta.sheets.length === 0) {
      return ['Alunos'];
    }
    const filtered = sheetsMeta.sheets
      .map((s) => s.properties.title)
      .filter((title) => !NON_STUDENT_TABS.has(title.toLowerCase().trim()));

    return filtered.length > 0 ? filtered : ['Alunos'];
  }, [sheetsMeta]);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const allLoaded: Student[] = [];

      for (const tab of studentTabs) {
        try {
          const rows = await readRange(config.spreadsheetId, `${tab}!A:Z`);
          if (rows && rows.length > 0) {
            const header = rows[0];
            const mapping = detectMapping(header);
            const dataRows = rows.slice(1);
            dataRows.forEach((row, i) => {
              const student = parseStudentRow(row, i + 2, tab, mapping);
              if (student) allLoaded.push(student);
            });
          }
        } catch {
          // ignore individual tab errors
        }
      }

      setStudents(allLoaded);
    } catch (err) {
      toast.error(`Erro ao carregar alunos: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, studentTabs]);

  const add = useCallback(
    async (student: Omit<Student, 'id' | 'rowIndex'>) => {
      if (!config) return;
      const targetTab = student.orquestra || studentTabs[0] || 'Alunos';
      const toastId = toast.loading(`A adicionar aluno em ${targetTab}...`);
      try {
        await appendRows(config.spreadsheetId, `${targetTab}!A:E`, [studentToRow(student)]);
        toast.success(`Aluno adicionado a ${targetTab}!`, { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, studentTabs, load]
  );

  const update = useCallback(
    async (student: Student) => {
      if (!config) return;
      const targetTab = student.orquestra || studentTabs[0] || 'Alunos';
      const toastId = toast.loading('A guardar...');
      try {
        const range = `${targetTab}!A${student.rowIndex}:E${student.rowIndex}`;
        await updateRange(config.spreadsheetId, range, [studentToRow(student)]);
        toast.success('Aluno atualizado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, studentTabs, load]
  );

  const remove = useCallback(
    async (student: Student) => {
      if (!config) return;
      const targetTab = student.orquestra || studentTabs[0] || 'Alunos';
      const sheetId = getSheetId(targetTab) ?? 0;
      const toastId = toast.loading('A eliminar...');
      try {
        await deleteRow(config.spreadsheetId, sheetId, student.rowIndex - 1);
        toast.success('Aluno eliminado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, studentTabs, getSheetId, load]
  );

  const ensureHeader = useCallback(async () => {
    // Handled dynamically per tab
  }, []);

  return {
    students,
    orchestras: studentTabs,
    isLoading,
    load,
    add,
    update,
    remove,
    ensureHeader,
  };
}
