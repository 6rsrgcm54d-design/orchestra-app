/**
 * Google Sheets API v4 wrapper + Local Storage Engine + Google Apps Script Web App Bridge
 */

import { getAccessToken } from './googleAuth';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export const LOCAL_STORAGE_ID = 'local-storage';

export function isLocalId(id: string): boolean {
  return id === LOCAL_STORAGE_ID || id.startsWith('local');
}

export function isAppsScript(id: string): boolean {
  return typeof id === 'string' && id.includes('script.google.com');
}

// ─── Código do Google Apps Script (Pronto a Copiar) ──────────────────────────

export const GOOGLE_APPS_SCRIPT_CODE = `// ============================================================
// OrquestraApp — Script de Ligação com o Google Sheets
// ============================================================
// Instruções:
// 1. No teu Google Sheet, vai a Extensões > Apps Script
// 2. Apaga o código existente e cola este código todo
// 3. Clica em 'Implementar' (canto superior direito) > 'Nova implementação'
// 4. Clica no ícone da roda dentada ao lado de 'Selecionar tipo' > 'Aplicação Web'
// 5. Configura:
//    - Descrição: OrquestraApp API
//    - Executar como: Eu (o teu email)
//    - Quem tem acesso: Qualquer pessoa (Anyone)
// 6. Clica em 'Implementar', autoriza o acesso e COPIA O URL gerado!
// ============================================================

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  e = e || { parameter: {} };
  var sheetName = e.parameter.sheet;
  var action = e.parameter.action;

  if (action === 'getMeta') {
    var sheets = ss.getSheets().map(function(s, idx) {
      return { properties: { sheetId: idx, title: s.getName() } };
    });
    return jsonResponse({ title: ss.getName(), sheets: sheets });
  }

  if (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = initDefaultSheet(ss, sheetName);
    }
    var values = sheet.getDataRange().getValues();
    var formatted = values.map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) {
          return Utilities.formatDate(cell, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        }
        return String(cell);
      });
    });
    return jsonResponse({ values: formatted });
  }

  var result = {};
  ss.getSheets().forEach(function(s) {
    result[s.getName()] = s.getDataRange().getValues();
  });
  return jsonResponse(result);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var sheetName = data.sheet;
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = initDefaultSheet(ss, sheetName);
  }

  if (action === 'append') {
    data.values.forEach(function(row) {
      sheet.appendRow(row);
    });
    return jsonResponse({ success: true });
  }

  if (action === 'update') {
    if (data.rowIndex) {
      var row = data.values[0];
      sheet.getRange(data.rowIndex, 1, 1, row.length).setValues([row]);
    } else if (data.values && data.values.length) {
      var numRows = data.values.length;
      var numCols = data.values[0].length;
      sheet.getRange(1, 1, numRows, numCols).setValues(data.values);
    }
    return jsonResponse({ success: true });
  }

  if (action === 'delete') {
    var rowIndex = data.rowIndex;
    if (rowIndex > 0 && rowIndex <= sheet.getLastRow()) {
      sheet.deleteRow(rowIndex);
    }
    return jsonResponse({ success: true });
  }

  return jsonResponse({ success: false, error: 'Unknown action' });
}

function initDefaultSheet(ss, name) {
  var sheet = ss.insertSheet(name);
  var headers = {
    'Alunos': ['Nome', 'Naipe', 'Email', 'Nível', 'Ativo'],
    'Repertório': ['Título', 'Compositor', 'Dificuldade', 'Duração', 'Estado', 'Notas'],
    'Avaliações': ['Nome Aluno', 'Naipe', 'Critério', 'Pontuação', 'Data', 'Observações'],
    'Critérios': ['Nome do Critério', 'Descrição', 'Peso'],
    'PlanosPalco': ['PlanosPalco_JSON']
  };
  if (headers[name]) {
    sheet.appendRow(headers[name]);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

// ─── Dados Iniciais da Orquestra (Modo Local) ──────────────────────────────────

const INITIAL_LOCAL_DATA: Record<string, string[][]> = {
  Alunos: [
    ['Nome', 'Chefes de Naipe', 'Grau', 'Naipe', 'Ativo'],
    ['Maria Santos', 'Chefe', '5º Grau', 'Violinos I', 'sim'],
    ['João Ferreira', '', '4º Grau', 'Violinos I', 'sim'],
    ['Ana Rodrigues', '', '5º Grau', 'Violinos I', 'sim'],
    ['Pedro Oliveira', 'Chefe', '4º Grau', 'Violinos II', 'sim'],
    ['Inês Costa', '', '2º Grau', 'Violinos II', 'sim'],
    ['Tiago Silva', '', '3º Grau', 'Violinos II', 'sim'],
    ['Beatriz Martins', 'Chefe', '5º Grau', 'Violas', 'sim'],
    ['Lucas Pereira', '', '3º Grau', 'Violas', 'sim'],
    ['Carolina Sousa', 'Chefe', '5º Grau', 'Violoncelos', 'sim'],
    ['Diogo Gomes', '', '4º Grau', 'Violoncelos', 'sim'],
    ['Gonçalo Pinto', 'Chefe', '3º Grau', 'Contrabaixos', 'sim'],
    ['Marta Ribeiro', 'Chefe', '5º Grau', 'Flautas', 'sim'],
    ['Sofia Almeida', 'Chefe', '4º Grau', 'Oboés', 'sim'],
    ['Rui Carvalho', 'Chefe', '4º Grau', 'Clarinetes', 'sim'],
    ['André Moreira', 'Chefe', '4º Grau', 'Trompetes', 'sim'],
    ['Miguel Teixeira', 'Chefe', '5º Grau', 'Percussão', 'sim'],
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

// ─── Helpers Apps Script Web App ─────────────────────────────────────────────

async function callAppsScriptGet<T>(url: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}${query}`);
  if (!res.ok) throw new Error(`Erro de comunicação com o Google Apps Script (${res.status})`);
  return res.json() as Promise<T>;
}

async function callAppsScriptPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  // Envia text/plain para evitar CORS preflight OPTIONS request
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Erro ao escrever no Google Apps Script (${res.status})`);
  return res.json() as Promise<T>;
}

// ─── Helpers Google Sheets OAuth ─────────────────────────────────────────────

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
  if (isAppsScript(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    const data = await callAppsScriptGet<{ values?: string[][] }>(spreadsheetId, { sheet: tabName });
    return data.values ?? [];
  }

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
  if (isAppsScript(spreadsheetId) || isLocalId(spreadsheetId)) {
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
  if (isAppsScript(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    const rowMatch = range.match(/([0-9]+)/);
    const rowIndex = rowMatch ? parseInt(rowMatch[1], 10) : undefined;
    await callAppsScriptPost(spreadsheetId, {
      action: 'update',
      sheet: tabName,
      range,
      rowIndex,
      values,
    });
    return;
  }

  if (isLocalId(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    const current = getLocalTab(tabName);
    const strValues = values.map((r) => r.map(String));

    const rowMatch = range.match(/([0-9]+)/);
    if (rowMatch && strValues.length === 1) {
      const rowIndex = parseInt(rowMatch[1], 10) - 1;
      if (rowIndex >= 0) {
        current[rowIndex] = strValues[0];
        setLocalTab(tabName, current);
        return;
      }
    }

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
  if (isAppsScript(spreadsheetId)) {
    const tabName = parseTabFromRange(range);
    await callAppsScriptPost(spreadsheetId, {
      action: 'append',
      sheet: tabName,
      values,
    });
    return;
  }

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
  if (isAppsScript(spreadsheetId)) {
    const tabNames = ['Alunos', 'Repertório', 'Avaliações', 'Critérios', 'PlanosPalco'];
    const tabName = tabNames[sheetId] || 'Alunos';
    await callAppsScriptPost(spreadsheetId, {
      action: 'delete',
      sheet: tabName,
      rowIndex: rowIndex + 1, // 1-based
    });
    return;
  }

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
  if (isAppsScript(spreadsheetId)) {
    try {
      const data = await callAppsScriptGet<{
        title?: string;
        sheets?: Array<{ properties: { sheetId: number; title: string } }>;
      }>(spreadsheetId, { action: 'getMeta' });
      return {
        title: data.title || 'Google Sheets (Drive)',
        sheets: data.sheets || [
          { properties: { sheetId: 0, title: 'Alunos' } },
          { properties: { sheetId: 1, title: 'Repertório' } },
          { properties: { sheetId: 2, title: 'Avaliações' } },
          { properties: { sheetId: 3, title: 'Critérios' } },
          { properties: { sheetId: 4, title: 'PlanosPalco' } },
        ],
      };
    } catch {
      return {
        title: 'Google Sheets (Drive Conectado)',
        sheets: [
          { properties: { sheetId: 0, title: 'Alunos' } },
          { properties: { sheetId: 1, title: 'Repertório' } },
          { properties: { sheetId: 2, title: 'Avaliações' } },
          { properties: { sheetId: 3, title: 'Critérios' } },
          { properties: { sheetId: 4, title: 'PlanosPalco' } },
        ],
      };
    }
  }

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
  if (isAppsScript(spreadsheetId) || isLocalId(spreadsheetId)) return;

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
  if (isAppsScript(urlOrId)) return urlOrId.trim();
  if (isLocalId(urlOrId)) return LOCAL_STORAGE_ID;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return urlOrId.trim();
}
