import type { Evaluation } from '../types';

/**
 * Exporta avaliações para um ficheiro CSV e faz download no browser.
 */
export function exportEvaluationsToCSV(evaluations: Evaluation[], filename = 'avaliacoes.csv'): void {
  const header = ['Ordem', 'Nome Aluno', 'Grau', 'Naipe', 'Orquestra', 'Classificação', 'Observações'];
  const rows = evaluations.map((ev, i) => [
    ev.ordem || String(i + 1),
    ev.nomeAluno,
    ev.grau || '',
    ev.naipe || '',
    ev.orquestra || '',
    ev.pontuacao > 0 ? String(ev.pontuacao) : '',
    ev.observacoes || '',
  ]);

  const csvContent = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          // Escape cells with commas, quotes or newlines
          const escaped = cell.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Calcula a média de pontuações de um array de avaliações.
 */
export function calcAverage(evaluations: Evaluation[]): number {
  if (!evaluations.length) return 0;
  return evaluations.reduce((sum, ev) => sum + ev.pontuacao, 0) / evaluations.length;
}

/**
 * Agrupa avaliações por aluno.
 */
export function groupByStudent(evaluations: Evaluation[]): Record<string, Evaluation[]> {
  return evaluations.reduce((acc, ev) => {
    if (!acc[ev.nomeAluno]) acc[ev.nomeAluno] = [];
    acc[ev.nomeAluno].push(ev);
    return acc;
  }, {} as Record<string, Evaluation[]>);
}

/**
 * Agrupa avaliações por critério.
 */
export function groupByCriteria(evaluations: Evaluation[]): Record<string, Evaluation[]> {
  return evaluations.reduce((acc, ev) => {
    const key = ev.criterio || 'Avaliação Global';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, Evaluation[]>);
}

/**
 * Exporta provas para um ficheiro CSV e faz download no browser.
 */
export function exportProvasToCSV(
  provas: {
    ordem?: string;
    nomeAluno: string;
    naipe?: string;
    orquestra?: string;
    afinacao?: number | null;
    precisaoRitmica?: number | null;
    tempo?: number | null;
    articulacao?: number | null;
    dinamicas?: number | null;
    fraseado?: number | null;
    classificacaoFinal?: number | null;
  }[],
  filename = 'provas.csv'
): void {
  const header = [
    'Ordem',
    'Nome Aluno',
    'Naipe',
    'Orquestra',
    'Afinação',
    'Precisão Rítmica',
    'Tempo',
    'Articulação',
    'Dinâmicas',
    'Fraseado',
    'Classificação final',
  ];
  const rows = provas.map((p, i) => [
    p.ordem || String(i + 1),
    p.nomeAluno,
    p.naipe || '',
    p.orquestra || '',
    p.afinacao !== null && p.afinacao !== undefined ? `${p.afinacao}%` : '',
    p.precisaoRitmica !== null && p.precisaoRitmica !== undefined ? `${p.precisaoRitmica}%` : '',
    p.tempo !== null && p.tempo !== undefined ? `${p.tempo}%` : '',
    p.articulacao !== null && p.articulacao !== undefined ? `${p.articulacao}%` : '',
    p.dinamicas !== null && p.dinamicas !== undefined ? `${p.dinamicas}%` : '',
    p.fraseado !== null && p.fraseado !== undefined ? `${p.fraseado}%` : '',
    p.classificacaoFinal !== null && p.classificacaoFinal !== undefined ? `${p.classificacaoFinal}%` : '',
  ]);

  const csvContent = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

