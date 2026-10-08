import type { Evaluation } from '../types';

/**
 * Converte uma string Unicode para um Uint8Array codificado em Windows-1252 (ANSI),
 * garantindo compatibilidade nativa imediata com o Microsoft Excel no Windows
 * e preservando todos os acentos da língua portuguesa (ç, ã, é, ó, ú, º, ª, etc.) sem erros de codificação.
 */
export function stringToWindows1252(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 127) {
      bytes[i] = code;
    } else if (code >= 160 && code <= 255) {
      // Todos os caracteres latinos portugueses (ç, Ç, ã, Ã, é, É, ó, Ó, ú, Ú, º, ª, etc.)
      bytes[i] = code;
    } else {
      switch (code) {
        case 0x2013: // – en-dash
          bytes[i] = 0x96;
          break;
        case 0x2014: // — em-dash
          bytes[i] = 0x97;
          break;
        case 0x2018: // ‘
          bytes[i] = 0x91;
          break;
        case 0x2019: // ’
          bytes[i] = 0x92;
          break;
        case 0x201c: // “
          bytes[i] = 0x93;
          break;
        case 0x201d: // ”
          bytes[i] = 0x94;
          break;
        case 0x2022: // • bullet
          bytes[i] = 0x95;
          break;
        case 0x20ac: // € euro
          bytes[i] = 0x80;
          break;
        default:
          bytes[i] = 0x3f; // '?'
          break;
      }
    }
  }
  return bytes;
}

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
          const str = String(cell ?? '').replace(/"/g, '""');
          return /[";\n\r]/.test(str) ? `"${str}"` : str;
        })
        .join(';')
    )
    .join('\r\n');

  const encodedBytes = stringToWindows1252(csvContent);
  const blob = new Blob([encodedBytes.buffer as ArrayBuffer], { type: 'text/csv;charset=windows-1252;' });
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
    timbre?: number | null;
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
    'Timbre',
    'Classificação final',
  ];
  const rows = provas.map((p, i) => [
    p.ordem || String(i + 1),
    p.nomeAluno,
    p.naipe || '',
    p.orquestra || '',
    p.afinacao !== null && p.afinacao !== undefined ? String(p.afinacao > 0 && p.afinacao <= 1 ? Math.round(p.afinacao * 100) : Math.round(p.afinacao)) : '',
    p.precisaoRitmica !== null && p.precisaoRitmica !== undefined ? String(p.precisaoRitmica > 0 && p.precisaoRitmica <= 1 ? Math.round(p.precisaoRitmica * 100) : Math.round(p.precisaoRitmica)) : '',
    p.tempo !== null && p.tempo !== undefined ? String(p.tempo > 0 && p.tempo <= 1 ? Math.round(p.tempo * 100) : Math.round(p.tempo)) : '',
    p.articulacao !== null && p.articulacao !== undefined ? String(p.articulacao > 0 && p.articulacao <= 1 ? Math.round(p.articulacao * 100) : Math.round(p.articulacao)) : '',
    p.dinamicas !== null && p.dinamicas !== undefined ? String(p.dinamicas > 0 && p.dinamicas <= 1 ? Math.round(p.dinamicas * 100) : Math.round(p.dinamicas)) : '',
    p.fraseado !== null && p.fraseado !== undefined ? String(p.fraseado > 0 && p.fraseado <= 1 ? Math.round(p.fraseado * 100) : Math.round(p.fraseado)) : '',
    p.timbre !== null && p.timbre !== undefined ? String(p.timbre > 0 && p.timbre <= 1 ? Math.round(p.timbre * 100) : Math.round(p.timbre)) : '',
    p.classificacaoFinal !== null && p.classificacaoFinal !== undefined ? String(p.classificacaoFinal > 0 && p.classificacaoFinal <= 1 ? Math.round(p.classificacaoFinal * 100) : Math.round(p.classificacaoFinal)) : '',
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

