/**
 * Utilitários centralizados para unificação e normalização dos nomes das Orquestras.
 * Garante que "Artave" e "Orquestra Artave" são tratadas como a MESMA orquestra
 * em todos os filtros, seleções, formulários e sincronizações.
 */

export const CANONICAL_ORCHESTRAS = [
  'Académica',
  'Juvenil',
  'Orquestra Artave',
  'Orquestra 10º ano',
] as const;

/**
 * Normaliza qualquer variação de nome de orquestra para o nome canónico oficial.
 * Ex: "Artave", "artave", "Orquestra Artave" -> "Orquestra Artave"
 * Ex: "10º ano", "10 ano", "Orquestra 10º ano" -> "Orquestra 10º ano"
 * Ex: "Académica", "Orquestra Académica" -> "Académica"
 * Ex: "Juvenil", "Orquestra Juvenil" -> "Juvenil"
 */
export function normalizeOrchestraName(name?: string): string {
  if (!name) return '';
  const trimmed = name.trim();

  // Artave e Orquestra Artave são rigorosamente a mesma orquestra
  if (/^(?:orquestra\s+)?artave$/i.test(trimmed)) {
    return 'Orquestra Artave';
  }

  // Orquestra 10º ano
  if (/^(?:orquestra\s+)?10[º°]?\s*ano$/i.test(trimmed)) {
    return 'Orquestra 10º ano';
  }

  // Académica
  if (/^(?:orquestra\s+)?acad[eé]mica$/i.test(trimmed)) {
    return 'Académica';
  }

  // Juvenil
  if (/^(?:orquestra\s+)?juvenil$/i.test(trimmed)) {
    return 'Juvenil';
  }

  return trimmed;
}

/**
 * Verifica se dois nomes de orquestra se referem à mesma orquestra,
 * mesmo que um esteja escrito como "Artave" e o outro "Orquestra Artave".
 */
export function isSameOrchestra(orchA?: string, orchB?: string): boolean {
  if (!orchA || !orchB) return false;
  if (orchA === 'Todas' || orchB === 'Todas') return true;

  const normA = normalizeOrchestraName(orchA).toLowerCase();
  const normB = normalizeOrchestraName(orchB).toLowerCase();

  if (normA === normB) return true;

  // Fallback seguro para inclusão de termos (ex: 'artave')
  if (normA.includes('artave') && normB.includes('artave')) return true;
  if (normA.includes('10') && normB.includes('10')) return true;
  if (normA.includes('acad') && normB.includes('acad')) return true;
  if (normA.includes('juvenil') && normB.includes('juvenil')) return true;

  return false;
}

/**
 * Recebe uma lista de orquestras (ex: abas do Sheets ou listas mistas)
 * e retorna uma lista limpa, sem duplicados, com "Orquestra Artave" unificada.
 */
export function sanitizeOrchestraList(list?: string[]): string[] {
  const nonOrchestraPattern = /^alunos?$|chefe|geral|todos/i;
  const rawList = list && list.length > 0 ? list : CANONICAL_ORCHESTRAS;

  const normalized = rawList
    .filter((o) => o && !nonOrchestraPattern.test(o.trim()))
    .map((o) => normalizeOrchestraName(o));

  const unique = Array.from(new Set(normalized));

  // Garante que as 4 orquestras principais estão sempre presentes
  CANONICAL_ORCHESTRAS.forEach((def) => {
    if (!unique.some((u) => isSameOrchestra(u, def))) {
      unique.push(def);
    }
  });

  return unique;
}

/**
 * Retorna o nome da instituição associada à orquestra:
 * - Se for Académica ou Juvenil -> "Conservatório Bomfim"
 * - Se for Artave, Orquestra Artave, 10º ano ou outra -> "Escola Profissional Artística do Vale do Ave"
 */
export function getInstitutionForOrchestra(orchestraName?: string): string {
  if (!orchestraName) return 'Escola Profissional Artística do Vale do Ave';
  const norm = orchestraName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('acad') || norm.includes('juvenil') || norm.includes('bomfim')) {
    return 'Conservatório Bomfim';
  }
  return 'Escola Profissional Artística do Vale do Ave';
}

/**
 * Retorna o texto de rodapé oficial para a orquestra especificada.
 */
export function getFooterForOrchestra(orchestraName?: string): string {
  const inst = getInstitutionForOrchestra(orchestraName);
  return `${inst}  - Luís Machado`;
}
