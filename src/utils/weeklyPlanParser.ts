/**
 * Utilitários para processamento e decomposição de obras e horários dentro do Plano Semanal.
 * Permite que um mesmo dia de ensaio tenha múltiplos blocos de horário para obras diferentes,
 * exibindo os horários com números grandes e destacados em vez de texto discreto.
 */

export interface ParsedRepertoireItem {
  id?: string;
  horario?: string; // ex: "12:00 - 12:30"
  obra: string; // ex: "M. Teresa Moniz - Romance para violino e orquestra"
}

// Regex flexível para capturar intervalos ou horários no início de cada linha:
// Suporta: "12:00 - 12:30", "12h00 - 12h30", "12:00 às 12:30", "14:00", etc., com ou sem bullet
const TIME_PREFIX_REGEX =
  /^[•\-\*\s]*(\d{1,2}[:h\.]\d{2}(?:\s*(?:-|–|—|às|a)\s*\d{1,2}[:h\.]\d{2})?)\s*(?:-|–|—|:)?\s*(.*)$/i;

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
 * Verifica se um dia de ensaio tem horários específicos por obra
 */
export function hasSpecificHoursInRepertoire(items: ParsedRepertoireItem[]): boolean {
  return items.some((it) => Boolean(it.horario && it.horario.trim().length > 0));
}
