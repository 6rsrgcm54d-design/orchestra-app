// ─── Enums & Constants ───────────────────────────────────────────────────────

export const NAIPES = [
  'Violinos I',
  'Violinos II',
  'Violas',
  'Violoncelos',
  'Contrabaixos',
  'Flautas',
  'Oboés',
  'Clarinetes',
  'Fagotes',
  'Trompas',
  'Trompetes',
  'Trombones',
  'Percussão',
  'Piano',
  'Harpa',
] as const;

export type Naipe = typeof NAIPES[number];

export const NIVEIS = ['Iniciante', 'Elementar', 'Intermédio', 'Avançado', 'Profissional'] as const;
export type Nivel = typeof NIVEIS[number];

export const ESTADOS_REPERTORIO = ['em ensaio', 'pronto', 'arquivado'] as const;
export type EstadoRepertorio = typeof ESTADOS_REPERTORIO[number];

// ─── Student ─────────────────────────────────────────────────────────────────

export interface Student {
  id: string; // Gerado localmente (hash da linha ou índice)
  rowIndex: number; // Linha no Google Sheets (1-based, depois do header)
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
