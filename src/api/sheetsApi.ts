/**
 * Google Sheets API v4 — wrapper de baixo nível
 * Todas as chamadas usam fetch direto com token Bearer do OAuth.
 */

import { getAccessToken } from './googleAuth';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * Lê um range do Sheets e devolve array de rows (array of arrays).
 */
export async function readRange(spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await handleResponse<{ values?: string[][] }>(res);
  return data.values ?? [];
}

/**
 * Lê múltiplos ranges de uma só vez (batchGet).
 */
export async function batchReadRanges(
  spreadsheetId: string,
  ranges: string[]
): Promise<Record<string, string[][]>> {
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

/**
 * Atualiza um range específico (PUT / update).
 */
export async function updateRange(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  await handleResponse<unknown>(res);
}

/**
 * Adiciona linhas no fim de um range (append).
 */
export async function appendRows(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  await handleResponse<unknown>(res);
}

/**
 * Apaga uma linha pelo índice usando batchUpdate (deleteDimension).
 * rowIndex é 0-based (sem contar header).
 */
export async function deleteRow(spreadsheetId: string, sheetId: number, rowIndex: number): Promise<void> {
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
              startIndex: rowIndex, // 0-based, inclui header, então +1 para dados
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });
  await handleResponse<unknown>(res);
}

/**
 * Obtém metadados do spreadsheet (ID das abas, etc.)
 */
export async function getSpreadsheetMeta(spreadsheetId: string): Promise<{
  title: string;
  sheets: Array<{ properties: { sheetId: number; title: string } }>;
}> {
  const url = `${BASE_URL}/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const res = await fetch(url, { headers: authHeaders() });
  return handleResponse(res);
}

/**
 * Garante que uma aba existe, criando-a se não existir.
 */
export async function ensureSheetExists(
  spreadsheetId: string,
  sheets: Array<{ properties: { sheetId: number; title: string } }>,
  tabName: string
): Promise<void> {
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

/**
 * Extrai o spreadsheet ID de um URL ou devolve o ID diretamente.
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // Assume é já um ID
  return urlOrId.trim();
}
