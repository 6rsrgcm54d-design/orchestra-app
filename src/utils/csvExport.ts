import type { Evaluation } from '../types';

/**
 * Exporta avaliações para um ficheiro CSV e faz download no browser.
 */
export function exportEvaluationsToCSV(evaluations: Evaluation[], filename = 'avaliacoes.csv'): void {
  const header = ['Nome Aluno', 'Naipe', 'Critério', 'Pontuação', 'Data', 'Observações'];
  const rows = evaluations.map((ev) => [
    ev.nomeAluno,
    ev.naipe,
    ev.criterio,
    String(ev.pontuacao),
    ev.data,
    ev.observacoes,
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
    if (!acc[ev.criterio]) acc[ev.criterio] = [];
    acc[ev.criterio].push(ev);
    return acc;
  }, {} as Record<string, Evaluation[]>);
}
