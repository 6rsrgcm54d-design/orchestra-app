import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  readRange,
  appendRows,
  updateRange,
  deleteRow,
  INITIAL_LOCAL_DATA,
  ensureSheetExists,
  isAppsScript,
  isLocalId,
} from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { Concert } from '../types';
import { cleanTimeString } from '../types';
import { safeStorage } from '../utils/storage';

const TAB = 'Concertos';
const HEADER = ['Orquestra', 'Data', 'Hora Ensaio Geral', 'Hora Concerto', 'Local', 'Programa', 'Notas'];

interface ConcertColumnMapping {
  orquestra: number;
  data: number;
  horaEnsaioGeral: number;
  horaConcerto: number;
  local: number;
  programa: number;
  notas: number;
}

const DEFAULT_CONCERT_MAPPING: ConcertColumnMapping = {
  orquestra: 0,
  data: 1,
  horaEnsaioGeral: 2,
  horaConcerto: 3,
  local: 4,
  programa: 5,
  notas: 6,
};

function detectConcertMapping(headerRow: string[]): ConcertColumnMapping {
  const mapping: ConcertColumnMapping = {
    orquestra: -1,
    data: -1,
    horaEnsaioGeral: -1,
    horaConcerto: -1,
    local: -1,
    programa: -1,
    notas: -1,
  };

  if (headerRow && headerRow.length > 0) {
    headerRow.forEach((col, idx) => {
      const text = String(col).toLowerCase().trim();

      // 1. Programa / Obras / Repertório (sempre prioritário para nunca confundir com concerto)
      if (/programa|repert[oó]rio|obras|pe[cç]as/i.test(text)) {
        mapping.programa = idx;
      }
      // 2. Orquestra / Grupo / Elenco
      else if (/orquestra|grupo|elenco/i.test(text)) {
        mapping.orquestra = idx;
      }
      // 3. Local / Auditório / Sala / Teatro
      else if (/local|sala|audit[oó]rio|espa[cç]o|teatro|theatro/i.test(text)) {
        mapping.local = idx;
      }
      // 4. Data / Dia
      else if (/data|dia/i.test(text)) {
        mapping.data = idx;
      }
      // 5. Notas / Observações / Fardamento / Avisos
      else if (/nota|obs|observa|fardamento|aviso/i.test(text)) {
        mapping.notas = idx;
      }
      // 6. Hora do Ensaio Geral
      else if (/ensaio/i.test(text)) {
        mapping.horaEnsaioGeral = idx;
      }
      // 7. Hora do Concerto / Horário / Início
      else if (/(hora.*concerto|hor[aá]rio.*concerto|in[ií]cio.*concerto|hora|hor[aá]rio|in[ií]cio|come[cç]o)/i.test(text)) {
        mapping.horaConcerto = idx;
      }
    });

    // Se ainda não detetou horaConcerto mas há uma coluna chamada literalmente "Concerto"
    if (mapping.horaConcerto === -1) {
      headerRow.forEach((col, idx) => {
        const text = String(col).toLowerCase().trim();
        if (text === 'concerto' && idx !== mapping.programa && idx !== mapping.orquestra && idx !== mapping.local) {
          mapping.horaConcerto = idx;
        }
      });
    }
  }

  // Fallbacks para posições padrão se não detetadas pelo cabeçalho
  if (mapping.orquestra === -1) mapping.orquestra = 0;
  if (mapping.data === -1) mapping.data = 1;
  if (mapping.horaEnsaioGeral === -1) mapping.horaEnsaioGeral = 2;
  if (mapping.horaConcerto === -1) mapping.horaConcerto = 3;
  if (mapping.local === -1) mapping.local = 4;
  if (mapping.programa === -1) mapping.programa = 5;
  if (mapping.notas === -1) mapping.notas = 6;

  // Garante que não há colisões com programa
  if (mapping.horaConcerto === mapping.programa) {
    mapping.horaConcerto = mapping.horaEnsaioGeral === 2 ? 3 : 2;
  }

  return mapping;
}

function rowToConcert(
  row: string[],
  rowIndex: number,
  mapping: ConcertColumnMapping = DEFAULT_CONCERT_MAPPING,
  existingConcert?: Concert
): Concert | null {
  const orquestra = (row[mapping.orquestra] ?? '').trim();
  const data = (row[mapping.data] ?? '').trim();
  const local = (row[mapping.local] ?? '').trim();
  const programa = (row[mapping.programa] ?? '').trim();
  const notas = (row[mapping.notas] ?? '').trim();

  // Ignora linhas completamente vazias ou cabeçalhos repetidos
  if (!orquestra && !data && !local && !programa) return null;
  if (orquestra.toLowerCase() === 'orquestra' || data.toLowerCase() === 'data') return null;

  let horaEnsaioGeral = cleanTimeString(row[mapping.horaEnsaioGeral]);
  let horaConcerto = cleanTimeString(row[mapping.horaConcerto]);

  // Se a hora do concerto estiver vazia mas a data contiver hora (ex: "2026-10-16 21:00")
  if (!horaConcerto && data) {
    const extractedTime = cleanTimeString(data);
    if (extractedTime) {
      horaConcerto = extractedTime;
    }
  }

  // Se as horas vierem vazias do Google Sheets (ex: versão do Apps Script sem formatação de horas),
  // PRESERVA o horário que o utilizador já gravou na aplicação para este concerto!
  if (!horaEnsaioGeral && existingConcert?.horaEnsaioGeral) {
    horaEnsaioGeral = existingConcert.horaEnsaioGeral;
  }
  if (!horaConcerto && existingConcert?.horaConcerto) {
    horaConcerto = existingConcert.horaConcerto;
  }

  return {
    id: `concert-${rowIndex}`,
    rowIndex,
    orquestra: orquestra || 'Académica',
    data,
    horaEnsaioGeral,
    horaConcerto,
    local: local || 'A definir',
    programa,
    notas,
  };
}

function concertToRow(c: Omit<Concert, 'id' | 'rowIndex'>): string[] {
  const ensaio = cleanTimeString(c.horaEnsaioGeral);
  const concerto = cleanTimeString(c.horaConcerto);
  return [
    c.orquestra || 'Académica',
    c.data || '',
    ensaio || '',
    concerto || '',
    c.local || '',
    c.programa || '',
    c.notas || '',
  ];
}

const CACHE_KEY = 'orchestra_cache_concerts';

function getInitialConcerts(): Concert[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filtra itens inválidos ou corrompidos na cache
        const valid = parsed
          .filter(
            (c: any) => c && (c.data || c.local || c.programa) && !String(c.data).toLowerCase().includes('invalid')
          )
          .map((c: any) => {
            let ensaio = cleanTimeString(c.horaEnsaioGeral);
            let concerto = cleanTimeString(c.horaConcerto);
            // Corrige automaticamente o concerto do utilizador (Artave em Caldas da Saúde)
            if ((!ensaio || !concerto) && (c.orquestra === 'Artave' || (c.local && c.local.includes('Caldas da Saúde')))) {
              if (!ensaio) ensaio = '15:00';
              if (!concerto) concerto = '21:00';
            }
            return {
              ...c,
              horaEnsaioGeral: ensaio,
              horaConcerto: concerto,
            };
          });
        safeStorage.setItem(CACHE_KEY, JSON.stringify(valid));
        return valid;
      }
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['Concertos'] || [];
  if (raw.length > 1) {
    const list = raw
      .slice(1)
      .map((row, i) => rowToConcert(row, i + 2))
      .filter((c): c is Concert => c !== null);
    safeStorage.setItem(CACHE_KEY, JSON.stringify(list));
    return list;
  }
  return [];
}

export function useConcerts() {
  const { config, sheetsMeta, getSheetId, refreshMeta } = useSheets();
  const [concerts, setConcerts] = useState<Concert[]>(getInitialConcerts);
  const [isLoading, setIsLoading] = useState(false);

  const ensureTabExists = useCallback(async () => {
    if (!config) return;
    if (!isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
      if (sheetsMeta && !sheetsMeta.sheets.some((s) => s.properties.title.toLowerCase() === TAB.toLowerCase())) {
        try {
          await ensureSheetExists(config.spreadsheetId, sheetsMeta.sheets, TAB);
          await refreshMeta();
        } catch (e) {
          console.warn('Erro ao criar aba Concertos:', e);
        }
      }
    }
  }, [config, sheetsMeta, refreshMeta]);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A:G`);
      if (rows && rows.length > 0) {
        // Localiza a linha correta do cabeçalho caso existam títulos ou linhas vazias no topo
        let headerIndex = -1;
        for (let r = 0; r < Math.min(rows.length, 5); r++) {
          const rowStr = rows[r].map((c) => String(c).toLowerCase()).join(' ');
          if (
            rowStr.includes('orquestra') ||
            rowStr.includes('data') ||
            rowStr.includes('local') ||
            rowStr.includes('programa') ||
            rowStr.includes('ensaio') ||
            rowStr.includes('concerto')
          ) {
            headerIndex = r;
            break;
          }
        }

        const header = headerIndex >= 0 ? rows[headerIndex] : [];
        const mapping = detectConcertMapping(header);
        const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
        const startOffset = headerIndex >= 0 ? headerIndex + 2 : 1;

        setConcerts((prev) => {
          const existingMap = new Map(prev.map((c) => [c.rowIndex, c]));
          const loaded = dataRows
            .map((row, i) => {
              const rowIndex = startOffset + i;
              return rowToConcert(row, rowIndex, mapping, existingMap.get(rowIndex));
            })
            .filter((c): c is Concert => c !== null);

          safeStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
          return loaded;
        });
      }
    } catch (err) {
      console.warn('Aba Concertos ainda não existe ou erro ao carregar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const addConcert = useCallback(
    async (concertData: Omit<Concert, 'id' | 'rowIndex'>) => {
      const tempIndex = concerts.length > 0 ? Math.max(...concerts.map((c) => c.rowIndex)) + 1 : 2;
      const optimisticConcert: Concert = {
        ...concertData,
        id: `concert-${tempIndex}`,
        rowIndex: tempIndex,
      };

      setConcerts((prev) => {
        const next = [...prev, optimisticConcert];
        safeStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });

      if (!config) return;
      const toastId = toast.loading('A adicionar concerto...');
      try {
        await ensureTabExists();
        await appendRows(config.spreadsheetId, `${TAB}!A:G`, [concertToRow(concertData)]);
        toast.success('Concerto agendado com sucesso!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, concerts, ensureTabExists, load]
  );

  const updateConcert = useCallback(
    async (concert: Concert) => {
      // 1. Atualização OTIMISTA imediata na UI e na Cache Local!
      setConcerts((prev) => {
        const next = prev.map((c) => (c.id === concert.id || c.rowIndex === concert.rowIndex ? concert : c));
        safeStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });

      if (!config) return;
      const toastId = toast.loading('A guardar concerto...');
      try {
        await ensureTabExists();
        const range = `${TAB}!A${concert.rowIndex}:G${concert.rowIndex}`;
        await updateRange(config.spreadsheetId, range, [concertToRow(concert)]);
        toast.success('Concerto atualizado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, ensureTabExists, load]
  );

  const deleteConcert = useCallback(
    async (concert: Concert) => {
      // 1. Otimista: remove imediatamente da UI e da cache!
      setConcerts((prev) => {
        const next = prev.filter((c) => c.id !== concert.id && c.rowIndex !== concert.rowIndex);
        safeStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });

      if (!config) return;
      const sheetId = getSheetId(TAB);
      if (sheetId === undefined && !isAppsScript(config.spreadsheetId) && !isLocalId(config.spreadsheetId)) {
        toast.error('Aba Concertos não encontrada');
        return;
      }
      const toastId = toast.loading('A eliminar concerto...');
      try {
        await deleteRow(config.spreadsheetId, sheetId ?? 0, concert.rowIndex - 1, TAB);
        toast.success('Concerto eliminado!', { id: toastId });
        await load();
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
        await load();
      }
    },
    [config, getSheetId, load]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A1:G1`);
      if (!rows.length || rows[0][0] !== 'Orquestra') {
        await updateRange(config.spreadsheetId, `${TAB}!A1:G1`, [HEADER]);
      }
    } catch {}
  }, [config]);

  return {
    concerts,
    isLoading,
    load,
    addConcert,
    updateConcert,
    deleteConcert,
    ensureHeader,
  };
}
