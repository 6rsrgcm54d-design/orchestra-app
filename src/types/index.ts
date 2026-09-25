// ─── Enums & Constants ───────────────────────────────────────────────────────

export const NAIPES = [
  'Violino I',
  'Violino II',
  "Viola d'arco",
  'Violoncelo',
  'Contrabaixo',
  'Flauta',
  'Oboé',
  'Clarinete',
  'Fagote',
  'Trompa',
  'Trompete',
  'Trombone',
  'Tuba',
  'Percussão',
  'Piano',
  'Harpa',
] as const;

export type Naipe = typeof NAIPES[number];

export const NAIPE_NUM_MAP: Record<number, string> = {
  1: 'Violino I',
  2: 'Violino II',
  3: "Viola d'arco",
  4: 'Violoncelo',
  5: 'Contrabaixo',
  6: 'Flauta',
  7: 'Oboé',
  8: 'Clarinete',
  9: 'Fagote',
  10: 'Trompa',
  11: 'Trompete',
  12: 'Trombone',
  13: 'Tuba',
  14: 'Percussão',
  15: 'Piano',
  16: 'Harpa',
};

export function formatNaipe(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Procura por número direto (ex: "1", "01", 1)
  const num = parseInt(str, 10);
  if (!isNaN(num) && NAIPE_NUM_MAP[num] && (String(num) === str || /^\d+$/.test(str))) {
    return NAIPE_NUM_MAP[num];
  }

  // Procura por prefixo numérico (ex: "1 - Violino", "1. Violinos")
  const prefixMatch = str.match(/^([0-9]{1,2})\s*[-–.)\s]\s*(.*)$/);
  if (prefixMatch) {
    const pNum = parseInt(prefixMatch[1], 10);
    if (NAIPE_NUM_MAP[pNum]) {
      return NAIPE_NUM_MAP[pNum];
    }
  }

  // Normalização de variantes textuais (singular/plural, abreviaturas)
  const lower = str.toLowerCase();
  if (lower === 'violinos i' || lower === 'violino 1' || lower === 'violinos 1' || lower === 'vl1' || lower === 'vln1' || lower === 'v1') return 'Violino I';
  if (lower === 'violinos ii' || lower === 'violino 2' || lower === 'violinos 2' || lower === 'vl2' || lower === 'vln2' || lower === 'v2') return 'Violino II';
  if (lower === 'violas' || lower === 'viola' || lower === "viola d'arco" || lower === "violas d'arco" || lower === 'vla' || lower === 'va') return "Viola d'arco";
  if (lower === 'violoncelos' || lower === 'violoncelo' || lower === 'cellos' || lower === 'cello' || lower === 'vc') return 'Violoncelo';
  if (lower === 'contrabaixos' || lower === 'contrabaixo' || lower === 'baixo' || lower === 'cb') return 'Contrabaixo';
  if (lower === 'flautas' || lower === 'flauta' || lower === 'fl') return 'Flauta';
  if (lower === 'oboés' || lower === 'oboes' || lower === 'oboé' || lower === 'oboe' || lower === 'ob') return 'Oboé';
  if (lower === 'clarinetes' || lower === 'clarinete' || lower === 'cl') return 'Clarinete';
  if (lower === 'fagotes' || lower === 'fagote' || lower === 'fg') return 'Fagote';
  if (lower === 'trompas' || lower === 'trompa' || lower === 'cor' || lower === 'hn') return 'Trompa';
  if (lower === 'trompetes' || lower === 'trompete' || lower === 'tpt') return 'Trompete';
  if (lower === 'trombones' || lower === 'trombone' || lower === 'tbn') return 'Trombone';
  if (lower === 'tubas' || lower === 'tuba') return 'Tuba';
  if (lower === 'percussão' || lower === 'percussao' || lower === 'perc') return 'Percussão';
  if (lower === 'piano' || lower === 'pno') return 'Piano';
  if (lower === 'harpa' || lower === 'harp') return 'Harpa';

  return str;
}

export function cleanTimeString(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim().replace(/^'+/, '');
  if (!str || str.toLowerCase() === 'a definir' || str === '-') return '';

  // 1. Se for uma fração decimal representando a hora do dia no Excel/Sheets (ex: 0.625 = 15:00, 0.875 = 21:00)
  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num) && num > 0 && num < 1 && /^\d*(?:[.,]\d+)?$/.test(str)) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 2. Se contiver hora em formato ISO ou texto com data (ex: "1899-12-30T15:00:00" ou "2026-10-16 21:30")
  const isoTime = str.match(/[T\s](\d{1,2}):(\d{2})(?::\d{2})?/);
  if (isoTime) {
    const h = isoTime[1].padStart(2, '0');
    const m = isoTime[2];
    if (/^1899-12-30/i.test(str) && h === '00' && m === '00') {
      return '';
    }
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    if (hNum >= 0 && hNum < 24 && mNum >= 0 && mNum < 60) {
      return `${h}:${m}`;
    }
    return '';
  }

  // 3. Se for puramente a data base "1899-12-30" sem hora
  if (/^1899-12-30(?:h)?$/i.test(str)) {
    return '';
  }

  // 4. Formato intervalo (ex: "16h-18h", "16:00 - 18:00", "16h às 18h", "16:00 às 18:00")
  const rangeMatch = str.match(/^(\d{1,2})(?:[:h.](\d{2}))?\s*(?:-|–|—|às|as|a)\s*(\d{1,2})(?:[:h.](\d{2}))?$/i);
  if (rangeMatch) {
    const h1 = parseInt(rangeMatch[1], 10);
    const m1 = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    const h2 = parseInt(rangeMatch[3], 10);
    const m2 = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;
    if (h1 >= 0 && h1 < 24 && h2 >= 0 && h2 < 24 && m1 >= 0 && m1 < 60 && m2 >= 0 && m2 < 60) {
      return `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')} - ${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
    }
    return '';
  }

  // 5. Formato "15:00:00" ou "15:00"
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
  }

  // 6. Formato "15h" ou "15h30" ou "15H00"
  const hMatch = str.match(/^(\d{1,2})h(\d{2})?$/i);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const min = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    if (h >= 0 && h < 24 && min >= 0 && min < 60) {
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
    return '';
  }

  // 7. Formato "15.00" ou "15,30" (notação decimal de hora)
  const dotMatch = str.match(/^(\d{1,2})[.,](\d{2})$/);
  if (dotMatch) {
    const h = parseInt(dotMatch[1], 10);
    const m = parseInt(dotMatch[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
  }

  // 8. Se for apenas hora simples em número inteiro (ex: "15")
  if (/^\d{1,2}$/.test(str)) {
    const h = parseInt(str, 10);
    if (h >= 0 && h < 24) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  // Se não coincidir com nenhum formato de hora válido, não é uma hora
  return '';
}

export function formatTimeDisplay(val: string | number | undefined | null): string {
  const cleaned = cleanTimeString(val);
  if (!cleaned) return 'A definir';
  return cleaned;
}

export const NIVEIS = ['Iniciante', 'Elementar', 'Intermédio', 'Avançado', 'Profissional'] as const;
export type Nivel = typeof NIVEIS[number];

export const ESTADOS_REPERTORIO = ['em ensaio', 'pronto', 'arquivado'] as const;
export type EstadoRepertorio = typeof ESTADOS_REPERTORIO[number];

// ─── Student ─────────────────────────────────────────────────────────────────

export interface Student {
  id: string; // Gerado localmente (hash da linha ou índice)
  rowIndex: number; // Linha no Google Sheets (1-based, depois do header)
  numero?: string; // Nº de Aluno / Processo (ex: "18", "20")
  nome: string;
  chefeNaipe: string; // "Chefes de Naipe"
  grau: string; // "Grau"
  naipe: string; // "Naipe"
  ativo?: boolean;
  orquestra?: string; // ex: "Académica", "Juvenil", "Artave"
}

// ─── Repertoire ──────────────────────────────────────────────────────────────

export interface Piece {
  id: string;
  rowIndex: number;
  titulo: string;
  compositor: string;
  dificuldade: string;
  duracao: string;
  estado: EstadoRepertorio;
  notas: string;
  orquestra?: string;
}

// ─── Evaluations ─────────────────────────────────────────────────────────────

export interface Criteria {
  id: string;
  rowIndex: number;
  nome: string;
  descricao: string;
  peso: number;
}

export interface Evaluation {
  id: string;
  rowIndex: number;
  ordem?: string; // Nº de Ordem
  nomeAluno: string;
  grau?: string;
  naipe: string;
  orquestra?: string;
  criterio?: string;
  pontuacao: number; // 1-5 (Classificação)
  data: string; // ISO date string
  observacoes: string;
}

// ─── Stage Plan ──────────────────────────────────────────────────────────────

export interface StandSeat {
  place: 'A' | 'B'; // A = esquerda, B = direita
  studentId: string | null;
  studentName: string | null;
}

export interface Stand {
  number: number;
  seats: [StandSeat, StandSeat]; // [A, B]
}

export interface NaipeSection {
  naipe: string;
  stands: Stand[];
}

export interface StagePlanData {
  sections: NaipeSection[];
}

export interface StagePlan {
  id: string;
  name: string;
  date: string; // ISO date string
  data: StagePlanData;
}

// ─── Concerts ───────────────────────────────────────────────────────────────

export interface Concert {
  id: string;
  rowIndex: number;
  orquestra: string; // "Académica", "Juvenil", "Artave", "Todas"
  data: string; // YYYY-MM-DD
  horaEnsaioGeral: string; // ex: "15:00"
  horaConcerto: string; // ex: "21:00"
  local: string;
  programa: string;
  notas?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

// ─── Sheets Context ──────────────────────────────────────────────────────────

export interface SheetsConfig {
  spreadsheetId: string;
}

export interface SheetItem {
  properties: {
    sheetId: number;
    title: string;
  };
}

export interface SheetsMeta {
  title: string;
  sheets: SheetItem[];
}

// ─── Provas ──────────────────────────────────────────────────────────────────

export interface ProvaRecord {
  id: string;
  rowIndex: number;
  ordem: string;
  nomeAluno: string;
  naipe: string;
  orquestra: string;
  afinacao?: number | null; // 0 a 100
  precisaoRitmica?: number | null; // 0 a 100
  tempo?: number | null; // 0 a 100
  articulacao?: number | null; // 0 a 100
  dinamicas?: number | null; // 0 a 100
  fraseado?: number | null; // 0 a 100
  classificacaoFinal?: number | null; // 0 a 100 (arredondado em incrementos de 5%)
}

export function calcClassificacaoFinal(params: {
  afinacao?: number | null;
  precisaoRitmica?: number | null;
  tempo?: number | null;
  articulacao?: number | null;
  dinamicas?: number | null;
  fraseado?: number | null;
}): number | null {
  const values = [
    params.afinacao,
    params.precisaoRitmica,
    params.tempo,
    params.articulacao,
    params.dinamicas,
    params.fraseado,
  ].filter((v): v is number => typeof v === 'number' && !isNaN(v) && v >= 0);

  if (values.length === 0) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  // Arredonda em incrementos de 5%
  return Math.min(100, Math.max(0, Math.round(avg / 5) * 5));
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light';

export type NavModule = 'dashboard' | 'students' | 'stagePlan' | 'repertoire' | 'concerts' | 'evaluations' | 'provas';

