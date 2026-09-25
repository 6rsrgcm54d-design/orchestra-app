import { safeStorage } from './storage';

export interface LevelTemplate {
  nivel: number;
  label: string;
  template: string;
}

export const DEFAULT_LEVEL_TEMPLATES: Record<number, string> = {
  5: 'atingiu o nível excelente! Deve continuar.',
  4: 'demonstrou um desempenho muito bom e consistente no naipe.',
  3: 'atingiu um nível satisfatório, devendo reforçar o estudo regular das peças.',
  2: 'apresenta dificuldades no acompanhamento do naipe, necessitando de maior dedicação e estudo.',
  1: 'não atingiu o nível mínimo exigido para o programa da orquestra.',
};

export const LEVEL_LABELS: Record<number, { label: string; badge: string; stars: string }> = {
  5: { label: 'Excelente', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', stars: '★★★★★' },
  4: { label: 'Muito Bom', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700', stars: '★★★★☆' },
  3: { label: 'Satisfatório', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700', stars: '★★★☆☆' },
  2: { label: 'Insuficiente', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-700', stars: '★★☆☆☆' },
  1: { label: 'Muito Fraco', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700', stars: '★☆☆☆☆' },
};

const TEMPLATES_STORAGE_KEY = 'orchestra_level_observation_templates';

/**
 * Obtém os modelos de observação para cada nível (1 a 5).
 * Se o utilizador já tiver alterado, carrega os textos personalizados da memória/Sheets.
 */
export function getStoredLevelTemplates(): Record<number, string> {
  const saved = safeStorage.getItem(TEMPLATES_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          1: parsed[1] || DEFAULT_LEVEL_TEMPLATES[1],
          2: parsed[2] || DEFAULT_LEVEL_TEMPLATES[2],
          3: parsed[3] || DEFAULT_LEVEL_TEMPLATES[3],
          4: parsed[4] || DEFAULT_LEVEL_TEMPLATES[4],
          5: parsed[5] || DEFAULT_LEVEL_TEMPLATES[5],
        };
      }
    } catch {}
  }
  return { ...DEFAULT_LEVEL_TEMPLATES };
}

/**
 * Guarda os modelos de observação alterados pelo utilizador.
 */
export function saveStoredLevelTemplates(templates: Record<number, string>): void {
  safeStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

/**
 * Deduz o primeiro nome e o artigo em português ('O' ou 'A') a partir do nome completo.
 */
export function getPortugueseArticleAndFirstName(fullName: string): {
  firstName: string;
  article: 'O' | 'A';
  articleLower: 'o' | 'a';
} {
  const clean = (fullName || '').trim();
  if (!clean) {
    return { firstName: 'O aluno', article: 'O', articleLower: 'o' };
  }

  const rawFirst = clean.split(/\s+/)[0] || '';
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase() : '';
  const lower = rawFirst.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Exceções femininas conhecidas que não terminam em 'a'
  const feminineExceptions = new Set([
    'ines', 'beatriz', 'isabel', 'raquel', 'carmen', 'mercedes', 'ester', 'ruth',
    'alice', 'matilde', 'leonor', 'luz', 'pilar', 'madalena', 'iris', 'lurdes', 'salome', 'marise'
  ]);

  // Exceções masculinas que terminam em 'a' ou fonética semelhante
  const masculineExceptions = new Set([
    'luca', 'lucas', 'elias', 'matias', 'tomas', 'jonas', 'dimas', 'barnabe', 'josua', 'garcia', 'sousa'
  ]);

  let isFeminine = false;

  if (feminineExceptions.has(lower)) {
    isFeminine = true;
  } else if (masculineExceptions.has(lower)) {
    isFeminine = false;
  } else if (lower.endsWith('a') || (lower.endsWith('e') && ['alice', 'matilde', 'marise'].includes(lower))) {
    isFeminine = true;
  } else {
    isFeminine = false;
  }

  const article: 'O' | 'A' = isFeminine ? 'A' : 'O';
  const articleLower: 'o' | 'a' = isFeminine ? 'a' : 'o';

  return {
    firstName,
    article,
    articleLower,
  };
}

/**
 * Gera o texto final da observação para um aluno a partir do modelo de um nível.
 * Se o modelo contiver tags como {Artigo} e {PrimeiroNome}, substitui-as.
 * Se o modelo for direto (ex: "atingiu o nível excelente..."), acrescenta automaticamente "A Ana " / "O João ".
 */
export function generateObservationText(
  rawTemplate: string,
  student: { nome: string; grau?: string; naipe?: string; orquestra?: string },
  nivel: number
): string {
  const { firstName, article, articleLower } = getPortugueseArticleAndFirstName(student.nome);
  let template = (rawTemplate || DEFAULT_LEVEL_TEMPLATES[nivel] || '').trim();

  if (!template) return '';

  // Substitui tags explícitas
  let result = template
    .replace(/\{Artigo\}/g, article)
    .replace(/\{artigo\}/g, articleLower)
    .replace(/\{PrimeiroNome\}/g, firstName)
    .replace(/\{primeironome\}/g, firstName)
    .replace(/\{Nome\}/g, firstName)
    .replace(/\{nome\}/g, firstName)
    .replace(/\{NomeCompleto\}/g, student.nome)
    .replace(/\{Grau\}/g, student.grau || '')
    .replace(/\{Naipe\}/g, student.naipe || '')
    .replace(/\{Orquestra\}/g, student.orquestra || '')
    .replace(/\{N[ií]vel\}/g, String(nivel));

  // Se não continha nenhuma tag de nome, adiciona o prefixo natural "{Artigo} {PrimeiroNome} "
  const hasNameTag =
    template.includes('{PrimeiroNome}') ||
    template.includes('{primeironome}') ||
    template.includes('{Nome}') ||
    template.includes('{nome}') ||
    template.includes('{NomeCompleto}');

  if (!hasNameTag) {
    result = `${article} ${firstName} ${result}`;
  }

  result = result.trim();
  // Garante terminação com pontuação
  if (result && !/[.!?]$/.test(result)) {
    result += '.';
  }

  return result;
}
