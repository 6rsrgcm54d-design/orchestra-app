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
  nomeAluno: string;
  naipe: string;
  criterio: string;
  pontuacao: number; // 1-5
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

// ─── UI ──────────────────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light';

export type NavModule = 'dashboard' | 'students' | 'stagePlan' | 'repertoire' | 'concerts' | 'evaluations';
