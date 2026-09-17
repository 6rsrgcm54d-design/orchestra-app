/**
 * Google Sheets API v4 wrapper + Local Storage Engine (Modo sem configuração)
 */

import { getAccessToken } from './googleAuth';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export const LOCAL_STORAGE_ID = 'local-storage';

export function isLocalId(id: string): boolean {
  return id === LOCAL_STORAGE_ID || id.startsWith('local');
}

// ─── Dados Iniciais da Orquestra (Modo Local) ──────────────────────────────────

const INITIAL_LOCAL_DATA: Record<string, string[][]> = {
  Alunos: [
    ['Nome', 'Naipe', 'Email', 'Nível', 'Ativo'],
    ['Maria Santos', 'Violinos I', 'maria.santos@email.com', 'Avançado', 'sim'],
    ['João Ferreira', 'Violinos I', 'joao.ferreira@email.com', 'Intermédio', 'sim'],
    ['Ana Rodrigues', 'Violinos I', 'ana.rodrigues@email.com', 'Avançado', 'sim'],
    ['Pedro Oliveira', 'Violinos II', 'pedro.oliveira@email.com', 'Intermédio', 'sim'],
    ['Inês Costa', 'Violinos II', 'ines.costa@email.com', 'Elementar', 'sim'],
    ['Tiago Silva', 'Violinos II', 'tiago.silva@email.com', 'Intermédio', 'sim'],
    ['Beatriz Martins', 'Violas', 'beatriz.martins@email.com', 'Avançado', 'sim'],
    ['Lucas Pereira', 'Violas', 'lucas.pereira@email.com', 'Intermédio', 'sim'],
    ['Carolina Sousa', 'Violoncelos', 'carolina.sousa@email.com', 'Avançado', 'sim'],
    ['Diogo Gomes', 'Violoncelos', 'diogo.gomes@email.com', 'Intermédio', 'sim'],
    ['Gonçalo Pinto', 'Contrabaixos', 'goncalo.pinto@email.com', 'Intermédio', 'sim'],
    ['Marta Ribeiro', 'Flautas', 'marta.ribeiro@email.com', 'Avançado', 'sim'],
    ['Sofia Almeida', 'Oboés', 'sofia.almeida@email.com', 'Avançado', 'sim'],
    ['Rui Carvalho', 'Clarinetes', 'rui.carvalho@email.com', 'Intermédio', 'sim'],
    ['André Moreira', 'Trompetes', 'andre.moreira@email.com', 'Intermédio', 'sim'],
    ['Miguel Teixeira', 'Percussão', 'miguel.teixeira@email.com', 'Avançado', 'sim'],
  ],
  Repertório: [
    ['Título', 'Compositor', 'Dificuldade', 'Duração', 'Estado', 'Notas'],
    ['Sinfonia nº 5 em Dó Menor', 'L. v. Beethoven', 'Difícil', '33 min', 'em ensaio', 'Foco no 1º andamento e transição para o 4º'],
    ['Eine kleine Nachtmusik (K. 525)', 'W. A. Mozart', 'Médio', '18 min', 'pronto', 'Apresentação no Concerto de Abertura'],
    ['Dança Húngara nº 5', 'J. Brahms', 'Médio', '3 min', 'em ensaio', 'Ajustar dinâmica dos violinos no compasso 32'],
    ['Suíte O Quebra-Nozes (Op. 71a)', 'P. I. Tchaikovsky', 'Difícil', '24 min', 'em ensaio', 'Dança das Flautas precisa de ensaio de naipes'],
    ['Marcha Radetzky', 'J. Strauss I', 'Fácil', '3 min', 'pronto', 'Encore para o concerto de encerramento'],
    ['As Quatro Estações - Primavera', 'A. Vivaldi', 'Médio', '10 min', 'arquivado', 'Executado no concerto de Primavera'],
  ],
  Critérios: [
    ['Nome do Critério', 'Descrição', 'Peso'],
    ['Afinação', 'Precisão e estabilidade de afinação nas passagens melódicas', '1.5'],
    ['Precisão Rítmica', 'Respeito pelas figuras de tempo e sincronização com o naipe', '1.2'],
    ['Sonoridade e Dinâmica', 'Qualidade de som e respeito pelas dinâmicas (piano, forte)', '1.0'],
    ['Postura e Expressividade', 'Posicionamento do instrumento e comunicação musical', '1.0'],
    ['Assiduidade e Pontualidade', 'Presença nos ensaios e prontidão na estante', '0.8'],
  ],
  Avaliações: [
    ['Nome Aluno', 'Naipe', 'Critério', 'Pontuação', 'Data', 'Observações'],
    ['Maria Santos', 'Violinos I', 'Afinação', '5', '2026-09-10', 'Excelente precisão nos agudos da Sinfonia nº 5'],
    ['Maria Santos', 'Violinos I', 'Precisão Rítmica', '5', '2026-09-10', 'Tempo impecável'],
    ['João Ferreira', 'Violinos I', 'Afinação', '4', '2026-09-10', 'Muito bom, rever afinação no compasso 48'],
    ['Pedro Oliveira', 'Violinos II', 'Sonoridade e Dinâmica', '4', '2026-09-12', 'Belo timbre, aumentar projeção nos fortes'],
    ['Carolina Sousa', 'Violoncelos', 'Afinação', '5', '2026-09-15', 'Solos com excelente afinação e expressividade'],
    ['Marta Ribeiro', 'Flautas', 'Precisão Rítmica', '4', '2026-09-16', 'Boa sincronização com os oboés'],
  ],
  PlanosPalco: [
    ['PlanosPalco_JSON'],
    [
      JSON.stringify({
        id: 'demo-plan-1',
        name: 'Disposição Geral da Orquestra',
        date: '2026-09-17',
        data: {
          sections: [
            {
              naipe: 'Violinos I',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-2', studentName: 'Maria Santos' },
                    { place: 'B', studentId: 'student-3', studentName: 'João Ferreira' },
                  ],
                },
                {
                  number: 2,
                  seats: [
                    { place: 'A', studentId: 'student-4', studentName: 'Ana Rodrigues' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Violinos II',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-5', studentName: 'Pedro Oliveira' },
                    { place: 'B', studentId: 'student-6', studentName: 'Inês Costa' },
                  ],
                },
                {
                  number: 2,
                  seats: [
                    { place: 'A', studentId: 'student-7', studentName: 'Tiago Silva' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Violas',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-8', studentName: 'Beatriz Martins' },
                    { place: 'B', studentId: 'student-9', studentName: 'Lucas Pereira' },
                  ],
                },
              ],
            },
            {
              naipe: 'Violoncelos',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-10', studentName: 'Carolina Sousa' },
                    { place: 'B', studentId: 'student-11', studentName: 'Diogo Gomes' },
                  ],
                },
              ],
            },
            {
              naipe: 'Contrabaixos',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-12', studentName: 'Gonçalo Pinto' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Flautas',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-13', studentName: 'Marta Ribeiro' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Oboés',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-14', studentName: 'Sofia Almeida' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Clarinetes',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-15', studentName: 'Rui Carvalho' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Trompetes',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-16', studentName: 'André Moreira' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
            {
              naipe: 'Percussão',
              stands: [
                {
                  number: 1,
                  seats: [
                    { place: 'A', studentId: 'student-17', studentName: 'Miguel Teixeira' },
                    { place: 'B', studentId: null, studentName: null },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ],
  ],
};

function getLocalTab(tabName: string): string[][] {
  const key = `orchestra_db_${tabName}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback to initial
    }
  }
  const initial = INITIAL_LOCAL_DATA[tabName] || [];
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

function setLocalTab(tabName: string, data: string[][]): void {
  const key = `orchestra_db_${tabName}`;
  localStorage.setItem(key, JSON.stringify(data));
}

function parseTabFromRange(range: string): string {
  const match = range.match(/^([^!]+)/);
  return match ? match[1].trim() : range;
}

// ─── Helpers Google Sheets ───────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) throw new Error('Sem token de acesso. Por favor faça login.');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function readRange(spreadsheetId: string, range: string): Promise<string[][]> {
  if (isLocalId(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    return getLocalTab(tabName);
  }

  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await handleResponse<{ values?: string[][] }>(res);
  return data.values ?? [];
}

export async function batchReadRanges(
  spreadsheetId: string,
  ranges: string[]
): Promise<Record<string, string[][]>> {
  if (isLocalId(spreadsheetId)) {
    const result: Record<string, string[][]> = {};
    for (const r of ranges) {
      result[r] = await readRange(spreadsheetId, r);
    }
    return result;
  }

  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `${BASE_URL}/${spreadsheetId}/values:batchGet?${params}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await handleResponse<{
    valueRanges: Array<{ range: string; values?: string[][] }>;
  }>(res);
  const result: Record<string, string[][]> = {};
  data.valueRanges.forEach((vr, i) => {
    result[ranges[i]] = vr.values ?? [];
  });
  return result;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function updateRange(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  if (isLocalId(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    const current = getLocalTab(tabName);
    const strValues = values.map((r) => r.map(String));

    // Ex: Alunos!A2:E2 -> substitui a linha 2 (index 1)
    const rowMatch = range.match(/([0-9]+)/);
    if (rowMatch && strValues.length === 1) {
      const rowIndex = parseInt(rowMatch[1], 10) - 1; // 0-based
      if (rowIndex >= 0) {
        current[rowIndex] = strValues[0];
        setLocalTab(tabName, current);
        return;
      }
    }

    // Se for o sheet inteiro ou intervalo grande
    if (strValues.length > 0 && strValues[0].length > 0) {
      setLocalTab(tabName, strValues);
    }
    return;
  }

  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  await handleResponse<unknown>(res);
}

export async function appendRows(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  if (isLocalId(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    const current = getLocalTab(tabName);
    const strValues = values.map((r) => r.map(String));
    current.push(...strValues);
    setLocalTab(tabName, current);
    return;
  }

  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  await handleResponse<unknown>(res);
}

export async function deleteRow(
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
): Promise<void> {
  if (isLocalId(spreadsheetId)) {
    const tabNames = ['Alunos', 'Repertório', 'Avaliações', 'Critérios', 'PlanosPalco'];
    const tabName = tabNames[sheetId] || 'Alunos';
    const current = getLocalTab(tabName);
    if (rowIndex >= 0 && rowIndex < current.length) {
      current.splice(rowIndex, 1);
      setLocalTab(tabName, current);
    }
    return;
  }

  const url = `${BASE_URL}/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });
  await handleResponse<unknown>(res);
}

export async function getSpreadsheetMeta(spreadsheetId: string): Promise<{
  title: string;
  sheets: Array<{ properties: { sheetId: number; title: string } }>;
}> {
  if (isLocalId(spreadsheetId)) {
    return {
      title: 'Orquestra Bomfim (Base de Dados Local)',
      sheets: [
        { properties: { sheetId: 0, title: 'Alunos' } },
        { properties: { sheetId: 1, title: 'Repertório' } },
        { properties: { sheetId: 2, title: 'Avaliações' } },
        { properties: { sheetId: 3, title: 'Critérios' } },
        { properties: { sheetId: 4, title: 'PlanosPalco' } },
      ],
    };
  }

  const url = `${BASE_URL}/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const res = await fetch(url, { headers: authHeaders() });
  return handleResponse(res);
}

export async function ensureSheetExists(
  spreadsheetId: string,
  sheets: Array<{ properties: { sheetId: number; title: string } }>,
  tabName: string
): Promise<void> {
  if (isLocalId(spreadsheetId)) return;

  const exists = sheets.some((s) => s.properties.title === tabName);
  if (exists) return;

  const url = `${BASE_URL}/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: tabName } } }],
    }),
  });
  await handleResponse<unknown>(res);
}

export function extractSpreadsheetId(urlOrId: string): string {
  if (isLocalId(urlOrId)) return LOCAL_STORAGE_ID;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return urlOrId.trim();
}
