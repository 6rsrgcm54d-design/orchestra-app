import React from 'react';
import { X, Printer, Calendar, Clock, Music2, FileDown, CheckSquare, Info } from 'lucide-react';
import type { LessonPlan } from '../../types';
import { printHtmlDocument } from '../../utils/printDocument';

interface LessonPlanPrintModalProps {
  plan: LessonPlan;
  onClose: () => void;
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateFull(dateStr: string): string {
  try {
    let normalized = dateStr.trim();
    const ptDateMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ptDateMatch) {
      normalized = `${ptDateMatch[3]}-${ptDateMatch[2].padStart(2, '0')}-${ptDateMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;

    const weekday = d.toLocaleDateString('pt-PT', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('pt-PT', { month: 'long' });
    const year = d.getFullYear();

    // Sem "de" e "de": "domingo 27 setembro 2026"
    return `${weekday.toLowerCase()} ${day} ${month.toLowerCase()} ${year}`;
  } catch {
    return dateStr;
  }
}

export function printLessonPlanToPdf(plan: LessonPlan) {
  const totalMinutos = (plan.itens || []).reduce((acc, it) => {
    const m = typeof it.minuto === 'number' ? it.minuto : parseInt(String(it.minuto), 10) || 0;
    return acc + m;
  }, 0);

  // Calcula timeline estimada a partir da hora de início
  let currentMinutes = 15 * 60;
  const match = (plan.hora || '').match(/(\d{1,2})[:h](\d{2})/i) || (plan.hora || '').match(/(\d{1,2})/);
  if (match) {
    currentMinutes = parseInt(match[1], 10) * 60 + (match[2] ? parseInt(match[2], 10) : 0);
  }

  const itemsHtml = (plan.itens || [])
    .map((item, idx) => {
      const dur = typeof item.minuto === 'number' ? item.minuto : parseInt(String(item.minuto), 10) || 0;
      const sH = Math.floor(currentMinutes / 60) % 24;
      const sM = currentMinutes % 60;
      const endMinutes = currentMinutes + dur;
      const eH = Math.floor(endMinutes / 60) % 24;
      const eM = endMinutes % 60;
      currentMinutes = endMinutes;

      const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const timeSlot = `${fmt(sH, sM)} - ${fmt(eH, eM)}`;
      const bg = idx % 2 === 1 ? 'background-color: #f9fafb;' : 'background-color: #ffffff;';

      return `
        <tr style="${bg}">
          <td style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center;">
            <div style="width: 14px; height: 14px; border: 2px solid #6b7280; border-radius: 3px; margin: 0 auto;"></div>
          </td>
          <td style="border: 1px solid #d1d5db; padding: 10px 8px; font-family: monospace; font-size: 12px; font-weight: bold; color: #1f2937; white-space: nowrap;">
            ${timeSlot}
          </td>
          <td style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #374151;">
            ${dur} min
          </td>
          <td style="border: 1px solid #d1d5db; padding: 10px 8px; font-size: 13px; font-weight: bold; color: #111827;">
            ${escapeHtml(item.obra || '—')}
          </td>
          <td style="border: 1px solid #d1d5db; padding: 10px 8px; font-size: 12px; color: #1f2937; line-height: 1.5;">
            ${escapeHtml(item.atividade || '—').replace(/\n/g, '<br>')}
          </td>
          <td style="border: 1px solid #d1d5db; padding: 10px 8px; font-size: 11px; color: #4b5563; font-style: italic;">
            ${escapeHtml(item.notas || '—')}
          </td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <title></title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @page :left {
          margin: 0 !important;
        }
        @page :right {
          margin: 0 !important;
        }
        @page :first {
          margin: 0 !important;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          background: #ffffff !important;
          color: #111827 !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
        }
        .print-sheet {
          padding: 12mm 15mm;
          box-sizing: border-box;
          width: 100%;
        }
        .header {
          border-bottom: 2px solid #111827;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .badge-institution {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 900;
          color: #b45309;
          margin-bottom: 4px;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          color: #111827;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          margin-top: 4px;
        }
        .meta-box {
          display: flex;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 16px;
          margin-bottom: 20px;
          justify-content: space-between;
        }
        .meta-item {
          flex: 1;
        }
        .meta-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          font-weight: 700;
          display: block;
        }
        .meta-val {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin-top: 2px;
          display: block;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #374151;
          font-weight: 800;
          text-align: left;
        }
        .notes-box {
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }
        .notes-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #92400e;
          margin-bottom: 4px;
        }
        .conductor-notes {
          border-top: 1px dashed #d1d5db;
          padding-top: 10px;
          margin-top: 15px;
        }
        .conductor-box {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          height: 80px;
          background-color: #fafafa;
          padding: 8px;
          color: #9ca3af;
          font-style: italic;
          font-size: 11px;
          margin-top: 6px;
        }
        .footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 8px;
          font-size: 9px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="print-sheet">
        <div class="header">
        <div>
          <div class="badge-institution">${escapeHtml(plan.orquestra ? (plan.orquestra.toLowerCase().startsWith('orquestra') ? plan.orquestra : 'Orquestra ' + plan.orquestra) : 'Orquestra')}</div>
          <h1 class="title">Plano de Aula & Ensaio</h1>
          <div class="subtitle">Orquestra ${escapeHtml(plan.orquestra)}${plan.titulo ? ' • ' + escapeHtml(plan.titulo) : ''}</div>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #111827; color: #ffffff; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(plan.orquestra)}
          </span>
          <div style="font-size: 11px; color: #4b5563; font-weight: 600; margin-top: 4px;">
            ${escapeHtml(formatDateFull(plan.data))}
          </div>
        </div>
      </div>

      <div class="meta-box">
        <div class="meta-item">
          <span class="meta-label">Data do Ensaio</span>
          <span class="meta-val">${escapeHtml(formatDateFull(plan.data))}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Horário</span>
          <span class="meta-val">${escapeHtml(plan.hora)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Duração Total Planeada</span>
          <span class="meta-val">${totalMinutos} min (${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60 > 0 ? (totalMinutos % 60) + 'm' : '00m'})</span>
        </div>
      </div>

      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-bottom: 8px;">
        🎵 Cronograma de Trabalho do Ensaio
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">✓</th>
            <th style="width: 120px;">Horário Previsto</th>
            <th style="width: 70px; text-align: center;">Duração</th>
            <th style="width: 170px;">Obra / Seção</th>
            <th>Atividade & Objetivos de Trabalho</th>
            <th style="width: 140px;">Observações</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${
        plan.notas
          ? `
        <div class="notes-box">
          <div class="notes-title">📌 Avisos & Observações Gerais</div>
          <div style="font-size: 12px; color: #78350f; line-height: 1.5; white-space: pre-line;">${escapeHtml(plan.notas)}</div>
        </div>
      `
          : ''
      }

      <div class="conductor-notes">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">
          Anotações do Maestro / Avaliação do Ensaio
        </div>
        <div class="conductor-box">Espaço reservado para apontamentos na estante durante o ensaio...</div>
      </div>
    </div>
  </body>
    </html>
  `;

  const docTitle = `Plano de Aula - ${plan.orquestra || 'Orquestra'} - ${plan.data}`;
  printHtmlDocument(htmlContent, docTitle);
}

export default function LessonPlanPrintModal({ plan, onClose }: LessonPlanPrintModalProps) {
  const handlePrint = () => {
    printLessonPlanToPdf(plan);
  };

  const totalMinutos = (plan.itens || []).reduce((acc, it) => {
    const m = typeof it.minuto === 'number' ? it.minuto : parseInt(String(it.minuto), 10) || 0;
    return acc + m;
  }, 0);

  let currentMinutes = 15 * 60;
  const match = (plan.hora || '').match(/(\d{1,2})[:h](\d{2})/i) || (plan.hora || '').match(/(\d{1,2})/);
  if (match) {
    currentMinutes = parseInt(match[1], 10) * 60 + (match[2] ? parseInt(match[2], 10) : 0);
  }

  const itemsWithTime = (plan.itens || []).map((item) => {
    const dur = typeof item.minuto === 'number' ? item.minuto : parseInt(String(item.minuto), 10) || 0;
    const sH = Math.floor(currentMinutes / 60) % 24;
    const sM = currentMinutes % 60;
    const endMinutes = currentMinutes + dur;
    const eH = Math.floor(endMinutes / 60) % 24;
    const eM = endMinutes % 60;
    currentMinutes = endMinutes;

    const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return {
      ...item,
      timeSlot: `${fmt(sH, sM)} - ${fmt(eH, eM)}`,
      dur,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:static print:bg-transparent print:p-0 print:m-0 print:overflow-visible">
      <div className="bg-white text-gray-900 rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden my-4 flex flex-col print:border-none print:shadow-none print:rounded-none print:max-w-none print:m-0">
        {/* Barra Superior do Modal */}
        <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <Printer size={18} className="text-orchestra-gold" />
              <span className="font-bold text-sm text-gray-800 dark:text-white">
                Impressão & Exportação em PDF
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                PDF Limpo
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <Info size={12} className="text-amber-500 flex-shrink-0" />
              <span>Layout limpo sem menus nem fundos escuros. No iPad, faça zoom na folha com 2 dedos para abrir diretamente o PDF.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-orchestra-gold text-orchestra-navy font-bold text-sm rounded-lg hover:bg-orchestra-gold-light transition-all shadow-md active:scale-95"
            >
              <FileDown size={16} />
              Guardar em PDF / Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pré-visualização da Folha Oficial de Ensaio */}
        <div className="p-8 sm:p-10 space-y-6 bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
          {/* Cabeçalho Oficial */}
          <div className="border-b-2 border-gray-900 pb-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-black text-amber-700 mb-1">
                {plan.orquestra ? (plan.orquestra.toLowerCase().startsWith('orquestra') ? plan.orquestra : `Orquestra ${plan.orquestra}`) : 'Orquestra'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Plano de Aula & Ensaio
              </h1>
              <p className="text-base font-bold text-gray-700 mt-0.5">
                Orquestra {plan.orquestra}
                {plan.titulo && <span className="font-normal text-gray-600"> • {plan.titulo}</span>}
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-block bg-gray-900 text-white font-bold px-3 py-1 text-xs rounded uppercase tracking-wider">
                {plan.orquestra}
              </div>
              <p className="text-xs text-gray-600 font-medium">{formatDateFull(plan.data)}</p>
            </div>
          </div>

          {/* Caixa Resumo da Sessão */}
          <div className="grid grid-cols-3 gap-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Data do Ensaio</span>
              <strong className="text-gray-900 text-sm font-bold">{formatDateFull(plan.data)}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Horário</span>
              <strong className="text-gray-900 text-sm font-bold">{plan.hora}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Duração Total</span>
              <strong className="text-gray-900 text-sm font-bold">
                {totalMinutos} min ({Math.floor(totalMinutos / 60)}h{' '}
                {totalMinutos % 60 > 0 ? `${totalMinutos % 60}m` : '00m'})
              </strong>
            </div>
          </div>

          {/* Tabela do Cronograma de Obras e Atividades */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <Music2 size={14} className="text-amber-600" /> Cronograma de Trabalho do Ensaio
            </h2>

            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-gray-800 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3 border border-gray-300 w-10 text-center font-bold">✓</th>
                  <th className="py-2.5 px-3 border border-gray-300 w-32 font-bold">Horário</th>
                  <th className="py-2.5 px-3 border border-gray-300 w-20 text-center font-bold">Duração</th>
                  <th className="py-2.5 px-3 border border-gray-300 w-44 font-bold">Obra / Seção</th>
                  <th className="py-2.5 px-3 border border-gray-300 font-bold">Atividade & Objetivos</th>
                  <th className="py-2.5 px-3 border border-gray-300 w-40 font-bold">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {itemsWithTime.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                    <td className="py-3 px-3 border border-gray-300 text-center">
                      <div className="w-4 h-4 border-2 border-gray-400 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3 border border-gray-300 font-mono text-xs font-bold text-gray-800 whitespace-nowrap">
                      {item.timeSlot}
                    </td>
                    <td className="py-3 px-3 border border-gray-300 text-center font-semibold text-xs text-gray-700">
                      {item.dur} min
                    </td>
                    <td className="py-3 px-3 border border-gray-300 font-bold text-gray-900">
                      {item.obra}
                    </td>
                    <td className="py-3 px-3 border border-gray-300 text-gray-800 text-xs leading-relaxed whitespace-pre-line">
                      {item.atividade}
                    </td>
                    <td className="py-3 px-3 border border-gray-300 text-gray-600 text-xs italic">
                      {item.notas || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Observações Gerais do Ensaio */}
          {plan.notas && (
            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                Avisos & Observações Gerais
              </h3>
              <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-line">
                {plan.notas}
              </p>
            </div>
          )}

          {/* Espaço para Anotações Manuais do Maestro na Estante */}
          <div className="pt-2 border-t border-dashed border-gray-300">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Anotações do Maestro / Avaliação do Ensaio
            </p>
            <div className="border border-gray-300 rounded-lg h-24 p-2.5 bg-gray-50/40 text-xs text-gray-400 italic">
              Espaço reservado para apontamentos na estante durante o ensaio...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
