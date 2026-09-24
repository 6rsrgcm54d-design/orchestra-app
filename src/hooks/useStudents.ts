import { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { readRange, appendRows, updateRange, deleteRow, INITIAL_LOCAL_DATA } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Student } from '../types';
import { formatNaipe } from '../types';
import { safeStorage } from '../utils/storage';

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
  'concertos',
]);

interface ColumnMapping {
  numero: number;
  nome: number;
  chefeNaipe: number;
  grau: number;
  naipe: number;
  ativo: number;
  orquestra: number;
}

function detectMapping(headerRow: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    numero: -1,
    nome: -1,
    chefeNaipe: -1,
    grau: -1,
    naipe: -1,
    ativo: -1,
    orquestra: -1,
  };
  if (!headerRow || headerRow.length === 0) {
    return { numero: -1, nome: 0, chefeNaipe: 1, grau: 2, naipe: 3, ativo: 4, orquestra: -1 };
  }

  headerRow.forEach((col, idx) => {
    const text = String(col).toLowerCase().trim();
    if (/^(n[º°.]?|id|ordem|número|numero|n_ordem|nº_ordem)$/i.test(text) || /^n[º°.]?\s*(de\s*)?(aluno|ordem)?$/i.test(text)) {
      mapping.numero = idx;
    } else if (/chefe/i.test(text)) {
      mapping.chefeNaipe = idx;
    } else if (/grau|ano|classe|curso/i.test(text)) {
      mapping.grau = idx;
    } else if (/naipe|instrumento|se[cç][cç][aã]o/i.test(text)) {
      mapping.naipe = idx;
    } else if (/nome|estudante/i.test(text)) {
      mapping.nome = idx;
    } else if (/aluno/i.test(text) && mapping.nome === -1) {
      mapping.nome = idx;
    } else if (/email|e-mail|correio|contacto/i.test(text)) {
      mapping.grau = idx;
    } else if (/n[ií]vel/i.test(text)) {
      mapping.naipe = idx;
    } else if (/ativo|ativa|estado|status/i.test(text)) {
      mapping.ativo = idx;
    } else if (/orquestra|orchestra|grupo|elenco/i.test(text)) {
      mapping.orquestra = idx;
    }
  });

  // Fallbacks inteligentes se não identificados por cabeçalho
  if (mapping.nome === -1) {
    if (mapping.numero === 0) {
      mapping.nome = 1;
    } else {
      mapping.nome = 0;
    }
  }
  if (mapping.naipe === -1) mapping.naipe = 3;
  if (mapping.grau === -1) mapping.grau = 2;
  if (mapping.ativo === -1) mapping.ativo = 4;

  return mapping;
}

function parseStudentRow(
  row: string[],
  rowIndex: number,
  tabName: string,
  mapping: ColumnMapping
): Student | null {
  let numero = mapping.numero !== -1 && row[mapping.numero] !== undefined
    ? String(row[mapping.numero]).trim()
    : '';

  let rawNome = mapping.nome !== -1 && row[mapping.nome] !== undefined
    ? String(row[mapping.nome]).trim()
    : '';

  let rawChefe = mapping.chefeNaipe !== -1 && row[mapping.chefeNaipe] !== undefined
    ? String(row[mapping.chefeNaipe]).trim()
    : '';

  let grau = mapping.grau !== -1 && row[mapping.grau] !== undefined
    ? String(row[mapping.grau]).trim()
    : '';

  let rawNaipe = mapping.naipe !== -1 && row[mapping.naipe] !== undefined
    ? String(row[mapping.naipe]).trim()
    : '';

  if (!rawNome && !rawChefe) return null;
  if (rawNome.toLowerCase() === 'nome' || rawChefe.toLowerCase() === 'nome') return null;

  // Se o campo nome for puramente numérico (ex: "18", "20") e o chefe contiver o nome do aluno (ex: "Beatriz Gonçalves Dias")
  if (/^\d+$/.test(rawNome) && /[a-zA-ZÀ-ÿ]{2,}/.test(rawChefe)) {
    if (!numero) numero = rawNome;
    rawNome = rawChefe;
    rawChefe = '';
  }

  // Se o campo chefe não contiver palavras-chave de chefe (ex: "chefe", "sim", "1º"), mas contiver nome próprio, limpa-o
  const isRealChefeKeyword = /^(chefe|sim|true|solista|l[ií]der|sub-?chefe|1[ºª]?|x)$/i.test(rawChefe);
  const chefeNaipe = isRealChefeKeyword ? rawChefe : '';

  // Normaliza o naipe para o nome canónico (1 -> "Violino I", 2 -> "Violino II", 3 -> "Viola d'arco", etc.)
  const naipe = formatNaipe(rawNaipe);

  // Normaliza o grau se tiver vindo no campo chefe por engano
  if (!grau && rawChefe && !isRealChefeKeyword && /grau|curso/i.test(rawChefe)) {
    grau = rawChefe;
  }

  const ativoVal = mapping.ativo !== -1 && row[mapping.ativo] !== undefined ? String(row[mapping.ativo]).toLowerCase().trim() : 'sim';
  const ativo = !['não', 'nao', 'inativo', 'false', '0', 'no'].includes(ativoVal);
  const orquestraVal =
    mapping.orquestra !== -1 && row[mapping.orquestra] !== undefined
      ? String(row[mapping.orquestra]).trim()
      : '';

  if (!rawNome) return null;

  return {
    id: `student-${tabName}-${rowIndex}`,
    rowIndex,
    numero: numero || undefined,
    nome: rawNome,
    chefeNaipe,
    grau,
    naipe,
    ativo,
    orquestra: orquestraVal || tabName,
  };
}

function sanitizeStudent(s: any, idx: number): Student {
  let nome = String(s.nome || '').trim();
  let chefeNaipe = String(s.chefeNaipe || '').trim();
  let numero = s.numero ? String(s.numero).trim() : '';

  if (/^\d+$/.test(nome) && /[a-zA-ZÀ-ÿ]{2,}/.test(chefeNaipe)) {
    if (!numero) numero = nome;
    nome = chefeNaipe;
    chefeNaipe = '';
  }

  const isRealChefeKeyword = /^(chefe|sim|true|solista|l[ií]der|sub-?chefe|1[ºª]?|x)$/i.test(chefeNaipe);
  if (!isRealChefeKeyword) {
    chefeNaipe = '';
  }

  const naipe = formatNaipe(s.naipe);

  return {
    ...s,
    id: s.id || `student-${idx}`,
    numero: numero || undefined,
    nome: nome || 'Aluno',
    chefeNaipe,
    naipe,
  };
}

function studentToRow(s: Omit<Student, 'id' | 'rowIndex'>): (string | boolean)[] {
  return [s.nome, s.chefeNaipe, s.grau, s.naipe, s.ativo ? 'sim' : 'não'];
}

const CACHE_KEY = 'orchestra_cache_students';

function getInitialStudents(): Student[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = parsed.map((s, idx) => sanitizeStudent(s, idx));
        safeStorage.setItem(CACHE_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    } catch {}
  }
  // Se ainda não houver cache guardado, inicializa logo com os dados das 3 orquestras
  const initialList: Student[] = [];
  ['Académica', 'Juvenil', 'Artave'].forEach((tab) => {
    const raw = INITIAL_LOCAL_DATA[tab];
    if (raw && raw.length > 1) {
      const header = raw[0];
      const mapping = detectMapping(header);
      raw.slice(1).forEach((row, i) => {
        const student = parseStudentRow(row, i + 2, tab, mapping);
        if (student) initialList.push(student);
      });
    }
  });
  if (initialList.length > 0) {
    safeStorage.setItem(CACHE_KEY, JSON.stringify(initialList));
  }
  return initialList;
}

export function useStudents() {
  const { config, sheetsMeta, getSheetId } = useSheets();
  const [students, setStudents] = useState<Student[]>(getInitialStudents);
  const [isLoading, setIsLoading] = useState(false);

  // Detect which tabs contain students (e.g. "Académica", "Juvenil", "Artave")
  const studentTabs = useMemo(() => {
    if (!sheetsMeta?.sheets || sheetsMeta.sheets.length === 0) {
      return ['Académica', 'Juvenil', 'Artave'];
    }
    const filtered = sheetsMeta.sheets
      .map((s) => s.properties.title)
      .filter((title) => !NON_STUDENT_TABS.has(title.toLowerCase().trim()));

    // Se só tiver Alunos genérico ou vazio, disponibiliza as 3 orquestras principais
    if (filtered.length === 1 && filtered[0].toLowerCase() === 'alunos') {
      return ['Académica', 'Juvenil', 'Artave'];
    }

    return filtered.length > 0 ? filtered : ['Académica', 'Juvenil', 'Artave'];
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
            // Localiza a linha correta do cabeçalho caso existam títulos ou linhas vazias no topo
            let headerIndex = -1;
            for (let r = 0; r < Math.min(rows.length, 5); r++) {
              const rowStr = rows[r].map((c) => String(c).toLowerCase()).join(' ');
              const hasHeaderKeyword =
                rowStr.includes('nome') ||
                rowStr.includes('aluno') ||
                rowStr.includes('naipe') ||
                rowStr.includes('instrumento') ||
                rowStr.includes('grau') ||
                rowStr.includes('ordem') ||
                rowStr.includes('chefe');

              const col0 = String(rows[r][0] || '').trim();
              const isCol0Number = /^\d+$/.test(col0);

              // Se tiver palavras-chave de cabeçalho e a coluna 0 não for um número de aluno (ex: "18"), é o cabeçalho!
              if (hasHeaderKeyword && !isCol0Number) {
                headerIndex = r;
                break;
              }
            }

            const header = headerIndex >= 0 ? rows[headerIndex] : [];
            const mapping = detectMapping(header);
            const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
            const startRowOffset = headerIndex >= 0 ? headerIndex + 2 : 1;

            dataRows.forEach((row, i) => {
              const student = parseStudentRow(row, startRowOffset + i, tab, mapping);
              if (student) allLoaded.push(student);
            });
          }
        } catch {
          // ignore individual tab errors
        }
      }

      setStudents(allLoaded);
      if (allLoaded.length > 0) {
        safeStorage.setItem(CACHE_KEY, JSON.stringify(allLoaded));
      }
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
