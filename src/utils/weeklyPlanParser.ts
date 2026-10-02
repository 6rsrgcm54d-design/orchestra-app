/**
 * Utilitários para processamento e decomposição de obras e horários dentro do Plano Semanal.
 * Permite que um mesmo dia de ensaio tenha múltiplos blocos de horário para obras diferentes,
 * exibindo os horários com números grandes e destacados em vez de texto discreto,
 * e respeitando com 100% de fidelidade os horários que o utilizador coloca no texto livre.
 */

export interface ParsedRepertoireItem {
  id?: string;
  horario?: string; // ex: "12:00 - 12:30"
  obra: string; // ex: "M. Teresa Moniz - Romance para violino e orquestra"
}

export interface RepertoireBlock {
  id: string;
  horario?: string; // Horário extraído se tiver sido especificado no texto livre (ex: "12:00-13:00")
  hasSpecificTime: boolean; // true se o horário veio explicitamente do texto livre
  titulo: string; // Primeira linha / título da obra principal (ex: "Tchaikovsky - Quebra Nozes")
  detalhes: string[]; // Linhas seguintes (andamentos, peças secundárias), ex: ["Valsa dos Flocos de Neve", "Pas de Deux"]
  rawLines: string[]; // Todas as linhas deste bloco
}

// Regex flexível para capturar intervalos ou horários no início de cada linha:
// Suporta: "12:00 - 12:30", "12h00 - 12h30", "12:00 às 12:30", "12:00-13:00", "14:00", etc., com ou sem bullet
export const TIME_PREFIX_REGEX =
  /^[•\-\*\s]*(\d{1,2}[:h\.]\d{2}(?:\s*(?:-|–|—|às|a)\s*\d{1,2}[:h\.]\d{2})?)\s*(?:-|–|—|:)?\s*(.*)$/i;

export function cleanRepertoireLine(line: string): string {
  return line.trim().replace(/^[•\-\*]\s*/, '').trim();
}

/**
 * Agrupa as obras e andamentos de um dia em blocos por horário.
 * Se o utilizador escreveu:
 *   12:00-13:00 Tchaikovsky - Quebra Nozes
 *   Valsa dos Flocos de Neve
 *   Pas de Deux
 *   Les Mirtilons
 * Produz 1 bloco com horario="12:00-13:00", titulo="Tchaikovsky - Quebra Nozes" e detalhes com os andamentos.
 * Apenas os horários explicitamente inseridos pelo utilizador são associados aos blocos.
 */
export function parseDayRepertoireBlocks(
  obrasText?: string,
  defaultHorario?: string
): RepertoireBlock[] {
  if (!obrasText || !obrasText.trim()) {
    return [
      {
        id: 'block-1',
        horario: defaultHorario || undefined,
        hasSpecificTime: false,
        titulo: 'Trabalho de repertório geral',
        detalhes: [],
        rawLines: ['Trabalho de repertório geral'],
      },
    ];
  }

  const lines = obrasText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return [
      {
        id: 'block-1',
        horario: defaultHorario || undefined,
        hasSpecificTime: false,
        titulo: 'Trabalho de repertório geral',
        detalhes: [],
        rawLines: ['Trabalho de repertório geral'],
      },
    ];
  }

  const hasAnyTime = lines.some((l) => TIME_PREFIX_REGEX.test(l));

  // Se nenhuma linha tem horário explícito no texto livre
  if (!hasAnyTime) {
    const firstClean = cleanRepertoireLine(lines[0]);
    const remaining = lines.slice(1).map(cleanRepertoireLine).filter((l) => l.length > 0);
    return [
      {
        id: 'block-1',
        horario: defaultHorario || undefined,
        hasSpecificTime: false,
        titulo: firstClean,
        detalhes: remaining,
        rawLines: lines.map(cleanRepertoireLine),
      },
    ];
  }

  const blocks: RepertoireBlock[] = [];
  let currentBlock: RepertoireBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(TIME_PREFIX_REGEX);

    if (match) {
      const timePart = match[1].trim();
      const obraPart = cleanRepertoireLine(match[2]);

      currentBlock = {
        id: `block-${blocks.length + 1}`,
        horario: timePart,
        hasSpecificTime: true,
        titulo: obraPart || '',
        detalhes: [],
        rawLines: obraPart ? [obraPart] : [],
      };
      blocks.push(currentBlock);
    } else {
      const cleaned = cleanRepertoireLine(line);
      if (!cleaned) continue;

      if (!currentBlock) {
        currentBlock = {
          id: `block-${blocks.length + 1}`,
          horario: undefined,
          hasSpecificTime: false,
          titulo: cleaned,
          detalhes: [],
          rawLines: [cleaned],
        };
        blocks.push(currentBlock);
      } else {
        if (!currentBlock.titulo) {
          currentBlock.titulo = cleaned;
          currentBlock.rawLines.push(cleaned);
        } else {
          currentBlock.detalhes.push(cleaned);
          currentBlock.rawLines.push(cleaned);
        }
      }
    }
  }

  return blocks.length > 0
    ? blocks
    : [
        {
          id: 'block-1',
          horario: defaultHorario || undefined,
          hasSpecificTime: false,
          titulo: 'Trabalho de repertório geral',
          detalhes: [],
          rawLines: ['Trabalho de repertório geral'],
        },
      ];
}

/**
 * Converte o texto das obras de um dia numa lista estruturada de itens,
 * extraindo automaticamente os horários específicos de cada obra se existirem.
 */
export function parseDayRepertoire(obrasText?: string, defaultHorario?: string): ParsedRepertoireItem[] {
  if (!obrasText || !obrasText.trim()) {
    return [{ horario: defaultHorario, obra: 'Trabalho de repertório geral' }];
  }

  const lines = obrasText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return [{ horario: defaultHorario, obra: 'Trabalho de repertório geral' }];
  }

  return lines.map((line, idx) => {
    const match = line.match(TIME_PREFIX_REGEX);
    if (match) {
      const timePart = match[1].trim();
      const obraPart = match[2].trim().replace(/^[•\-\*]\s*/, '');
      return {
        id: `item-${idx + 1}-${timePart}`,
        horario: timePart,
        obra: obraPart || line,
      };
    }

    return {
      id: `item-${idx + 1}`,
      horario: undefined,
      obra: line.replace(/^[•\-\*]\s*/, ''),
    };
  });
}

/**
 * Serializa a lista de obras e horários de volta numa string multilinhas
 * para armazenamento transparente e 100% retrocompatível no Google Sheets.
 */
export function serializeRepertoireItems(items: { horario?: string; obra: string }[]): string {
  return items
    .filter((it) => it.obra && it.obra.trim().length > 0)
    .map((it) => {
      const cleanObra = it.obra.trim();
      if (it.horario && it.horario.trim().length > 0) {
        return `${it.horario.trim()} - ${cleanObra}`;
      }
      return cleanObra;
    })
    .join('\n');
}

/**
 * Verifica se um dia de ensaio tem horários específicos por obra ou no texto livre
 */
export function hasSpecificHoursInRepertoire(
  itemsOrBlocks: (ParsedRepertoireItem | RepertoireBlock)[]
): boolean {
  return itemsOrBlocks.some((it) => {
    if ('hasSpecificTime' in it) {
      return it.hasSpecificTime;
    }
    return Boolean(it.horario && it.horario.trim().length > 0);
  });
}
