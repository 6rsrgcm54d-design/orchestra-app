import React from 'react';
import { X, FileDown, Mail, Share2, Info, Copy, Calendar, Clock, MapPin, Users, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WeeklyPlan } from '../../types';

interface WeeklyPlanPrintModalProps {
  plan: WeeklyPlan;
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

function formatDatePT(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    let normalized = dateStr.trim();
    const ptMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ptMatch) {
      normalized = `${ptMatch[3]}-${ptMatch[2].padStart(2, '0')}-${ptMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleDateString('pt-PT', { month: 'long' });
    const year = d.getFullYear();
    return `${day} ${month.toLowerCase()} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatDayOfWeek(dateStr?: string, fallback?: string): string {
  if (!dateStr) return fallback || '';
  try {
    let normalized = dateStr.trim();
    const ptMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ptMatch) {
      normalized = `${ptMatch[3]}-${ptMatch[2].padStart(2, '0')}-${ptMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
    if (isNaN(d.getTime())) return fallback || '';
    const weekday = d.toLocaleDateString('pt-PT', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  } catch {
    return fallback || '';
  }
}

export function generateWeeklyEmailBody(plan: WeeklyPlan): string {
  const orch = plan.orquestra || 'Orquestra Artave';
  const start = formatDatePT(plan.semanaInicio);
  const end = formatDatePT(plan.semanaFim);

  let text = `Caros alunos e encarregados de educação,\n\n`;
  text += `Segue o Plano Semanal de Ensaios da ${orch} para a semana de ${start} a ${end}:\n\n`;
  text += `══════════════════════════════════════════════════\n`;
  text += `${orch.toUpperCase()} • ANO LETIVO ${plan.anoLetivo || '2026-2027'}\n`;
  text += `PLANO SEMANAL DE ENSAIOS\n`;
  text += `══════════════════════════════════════════════════\n\n`;

  (plan.dias || []).forEach((d) => {
    const diaNome = d.diaSemana || formatDayOfWeek(d.data, 'Dia de Ensaio');
    const dataFmt = formatDatePT(d.data);
    text += `📅 ${diaNome.toUpperCase()}${dataFmt ? ` (${dataFmt})` : ''}\n`;
    text += `⏰ Horário: ${d.horario || 'A definir'}\n`;
    if (d.local) text += `📍 Local: ${d.local}\n`;
    if (d.naipes) text += `👥 Convocatória: ${d.naipes}\n`;
    text += `🎵 Obras & Programa de Estudo:\n`;
    const obrasLines = (d.obras || 'Trabalho de repertório').split('\n');
    obrasLines.forEach((line) => {
      text += `   ${line.trim().startsWith('•') || line.trim().startsWith('-') ? line.trim() : `• ${line.trim()}`}\n`;
    });
    if (d.observacoes) {
      text += `💡 Recomendações: ${d.observacoes}\n`;
    }
    text += `\n──────────────────────────────────────────────────\n\n`;
  });

  if (plan.avisosGerais) {
    text += `⚠️ AVISOS IMPORTANTES:\n${plan.avisosGerais}\n\n`;
  }

  text += `📄 O documento oficial em formato PDF segue em anexo para afixação e consulta nas pastas.\n\n`;
  text += `Com os melhores cumprimentos,\n`;
  text += `Luís Machado\n`;
  text += `${plan.notasRodape || 'Escola Profissional Artística do Vale do Ave'}\n`;

  return text;
}

export function printWeeklyPlanToPdf(plan: WeeklyPlan) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const orch = plan.orquestra || 'Orquestra Artave';
  const ano = plan.anoLetivo || '2026-2027';
  const rodape = plan.notasRodape || 'Escola Profissional Artística do Vale do Ave  - Luís Machado';

  const daysHtml = (plan.dias || [])
    .map((d, idx) => {
      const diaNome = d.diaSemana || formatDayOfWeek(d.data, 'Dia de Ensaio');
      const dataFmt = formatDatePT(d.data);
      const bg = idx % 2 === 1 ? 'background-color: #fafaf9;' : 'background-color: #ffffff;';

      const obrasFormatted = escapeHtml(d.obras || 'Trabalho de repertório geral')
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => {
          const trimmed = l.trim();
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            return `<div style="margin: 2px 0 2px 8px; color: #1c1917; font-weight: 500;">${trimmed}</div>`;
          }
          return `<div style="margin: 3px 0; color: #111827; font-weight: 700;">• ${trimmed}</div>`;
        })
        .join('');

      return `
        <tr style="${bg} page-break-inside: avoid;">
          <td style="border: 1px solid #d6d3d1; padding: 12px 10px; width: 140px; vertical-align: top;">
            <div style="font-size: 13px; font-weight: 800; color: #1c1917; text-transform: uppercase; letter-spacing: 0.3px;">
              ${escapeHtml(diaNome)}
            </div>
            <div style="font-size: 11px; color: #78716c; font-weight: 600; margin-top: 3px;">
              ${escapeHtml(dataFmt)}
            </div>
          </td>
          <td style="border: 1px solid #d6d3d1; padding: 12px 10px; width: 130px; vertical-align: top;">
            <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #b45309; background-color: #fef3c7; display: inline-block; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">
              ${escapeHtml(d.horario || 'A definir')}
            </div>
            ${
              d.local
                ? `<div style="font-size: 11px; color: #57534e; font-weight: 600; margin-top: 2px;">📍 ${escapeHtml(d.local)}</div>`
                : ''
            }
          </td>
          <td style="border: 1px solid #d6d3d1; padding: 12px 10px; width: 140px; vertical-align: top;">
            <div style="font-size: 11px; font-weight: 800; color: #047857; background-color: #d1fae5; display: inline-block; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
              ${escapeHtml(d.naipes || 'Tutti Geral')}
            </div>
          </td>
          <td style="border: 1px solid #d6d3d1; padding: 12px 10px; vertical-align: top; font-size: 12px; line-height: 1.5;">
            ${obrasFormatted}
          </td>
          <td style="border: 1px solid #d6d3d1; padding: 12px 10px; width: 150px; vertical-align: top; font-size: 11px; color: #57534e; font-style: italic; line-height: 1.4;">
            ${escapeHtml(d.observacoes || '—')}
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
      <title>Plano Semanal de Ensaios - ${escapeHtml(orch)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          background: #ffffff !important;
          color: #1c1917 !important;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
        }
        .header {
          border-bottom: 2.5px solid #1c1917;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .institution-badge {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 900;
          color: #b45309;
          margin-bottom: 4px;
        }
        .title {
          font-size: 25px;
          font-weight: 900;
          color: #1c1917;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .official-subtitle {
          font-size: 14px;
          font-weight: 800;
          color: #44403c;
          margin-top: 4px;
        }
        .week-badge-box {
          text-align: right;
          background-color: #f5f5f4;
          border: 1px solid #e7e5e4;
          border-radius: 8px;
          padding: 8px 14px;
        }
        .week-range {
          font-size: 12px;
          font-weight: 800;
          color: #1c1917;
        }
        .school-year {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #78716c;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background-color: #f5f5f4;
          border: 1px solid #d6d3d1;
          padding: 9px 10px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #44403c;
          font-weight: 900;
          text-align: left;
        }
        .avisos-box {
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 18px;
          page-break-inside: avoid;
        }
        .avisos-title {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #92400e;
          margin-bottom: 4px;
        }
        .footer {
          border-top: 1.5px solid #e7e5e4;
          padding-top: 8px;
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #44403c;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="institution-badge">Escola Profissional Artística do Vale do Ave</div>
          <h1 class="title">Plano Semanal de Ensaios</h1>
          <div class="official-subtitle">${escapeHtml(orch)} Ano letivo ${escapeHtml(ano)} • Plano Semanal de Ensaios</div>
        </div>
        <div class="week-badge-box">
          <div class="school-year">Semana de Ensaios</div>
          <div class="week-range">${escapeHtml(formatDatePT(plan.semanaInicio))} a ${escapeHtml(formatDatePT(plan.semanaFim))}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 140px;">Dia & Data</th>
            <th style="width: 130px;">Horário & Sala</th>
            <th style="width: 140px;">Convocatória</th>
            <th>Obras a Ensaiar & Programa de Estudo</th>
            <th style="width: 150px;">Observações</th>
          </tr>
        </thead>
        <tbody>
          ${daysHtml}
        </tbody>
      </table>

      ${
        plan.avisosGerais
          ? `
        <div class="avisos-box">
          <div class="avisos-title">📌 Avisos & Recomendações aos Alunos e Encarregados de Educação</div>
          <div style="font-size: 12px; color: #78350f; line-height: 1.5; white-space: pre-line;">${escapeHtml(plan.avisosGerais)}</div>
        </div>
      `
          : ''
      }

      <div class="footer">
        <span>${escapeHtml(rodape)}</span>
        <span style="font-size: 9px; color: #a8a29e; font-weight: normal;">Emitido em ${new Date().toLocaleDateString('pt-PT')}</span>
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 2000);
  }, 250);
}

export default function WeeklyPlanPrintModal({ plan, onClose }: WeeklyPlanPrintModalProps) {
  const handlePrint = () => {
    printWeeklyPlanToPdf(plan);
  };

  const handleSendEmail = () => {
    const orch = plan.orquestra || 'Orquestra Artave';
    const start = formatDatePT(plan.semanaInicio);
    const end = formatDatePT(plan.semanaFim);
    const subject = encodeURIComponent(`[${orch}] Convocatória e Plano Semanal de Ensaios (${start} a ${end})`);
    const body = encodeURIComponent(generateWeeklyEmailBody(plan));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyText = async () => {
    try {
      const text = generateWeeklyEmailBody(plan);
      await navigator.clipboard.writeText(text);
      toast.success('Texto da Convocatória copiado para a Área de Transferência! Pronto para colar no WhatsApp ou Email.');
    } catch {
      toast.error('Não foi possível copiar o texto automaticamente.');
    }
  };

  const orch = plan.orquestra || 'Orquestra Artave';
  const ano = plan.anoLetivo || '2026-2027';
  const rodape = plan.notasRodape || 'Escola Profissional Artística do Vale do Ave  - Luís Machado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Barra Superior com Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 px-6 border-b border-gray-200 bg-gray-50 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">
                Convocatória & Plano Semanal de Ensaios
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                A4 Limpo • Alunos
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Info size={12} className="text-amber-600 flex-shrink-0" />
              <span>Layout oficial para afixar no placard do conservatório ou enviar por email para casa.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Copiar WhatsApp */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95"
              title="Copiar texto formatado com emojis para colar no WhatsApp ou Teams"
            >
              <Copy size={14} />
              Copiar WhatsApp
            </button>

            {/* Enviar E-mail */}
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95"
              title="Abrir o cliente de email com assunto e corpo já preenchidos"
            >
              <Mail size={14} />
              Enviar por E-mail
            </button>

            {/* Guardar PDF / Imprimir */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy hover:bg-orchestra-gold-light font-bold text-xs rounded-lg transition-all shadow active:scale-95"
            >
              <FileDown size={15} />
              Guardar em PDF / Imprimir
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pré-visualização da Folha Oficial de Convocatória A4 */}
        <div className="p-8 sm:p-10 space-y-6 bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
          {/* Cabeçalho Oficial */}
          <div className="border-b-2 border-gray-900 pb-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-black text-amber-700 mb-1">
                Escola Profissional Artística do Vale do Ave
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Plano Semanal de Ensaios
              </h1>
              <p className="text-base font-bold text-gray-800 mt-0.5">
                {orch} Ano letivo {ano} • Plano Semanal de Ensaios
              </p>
            </div>

            <div className="text-right bg-stone-100 p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Semana de Ensaios
              </span>
              <strong className="text-sm font-bold text-stone-900">
                {formatDatePT(plan.semanaInicio)} a {formatDatePT(plan.semanaFim)}
              </strong>
            </div>
          </div>

          {/* Tabela do Cronograma Semanal */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-600" /> Agenda dos Dias de Ensaio
            </h2>

            <table className="w-full text-left border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 text-stone-800 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3 border border-stone-300 w-36 font-bold">Dia & Data</th>
                  <th className="py-2.5 px-3 border border-stone-300 w-36 font-bold">Horário & Sala</th>
                  <th className="py-2.5 px-3 border border-stone-300 w-36 font-bold">Convocatória</th>
                  <th className="py-2.5 px-3 border border-stone-300 font-bold">Obras a Ensaiar & Programa de Estudo</th>
                  <th className="py-2.5 px-3 border border-stone-300 w-40 font-bold">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {(plan.dias || []).map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                    <td className="py-3 px-3 border border-stone-300 align-top">
                      <div className="font-bold text-stone-900 text-sm">
                        {item.diaSemana || formatDayOfWeek(item.data, 'Dia')}
                      </div>
                      <div className="text-xs text-stone-500 font-medium mt-0.5">
                        {formatDatePT(item.data)}
                      </div>
                    </td>
                    <td className="py-3 px-3 border border-stone-300 align-top">
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded inline-block">
                        {item.horario || 'A definir'}
                      </span>
                      {item.local && (
                        <div className="text-xs text-stone-600 font-medium mt-1 flex items-center gap-1">
                          <MapPin size={11} className="text-stone-400 flex-shrink-0" />
                          <span>{item.local}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 border border-stone-300 align-top">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded inline-block uppercase">
                        {item.naipes || 'Tutti Geral'}
                      </span>
                    </td>
                    <td className="py-3 px-3 border border-stone-300 align-top text-xs text-stone-900 leading-relaxed whitespace-pre-line font-medium">
                      {item.obras}
                    </td>
                    <td className="py-3 px-3 border border-stone-300 align-top text-xs text-stone-600 italic">
                      {item.observacoes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Avisos Gerais da Semana */}
          {plan.avisosGerais && (
            <div className="p-4 bg-amber-50/90 rounded-xl border border-amber-200">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                📌 Avisos & Recomendações aos Alunos e Encarregados de Educação
              </h3>
              <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-line">
                {plan.avisosGerais}
              </p>
            </div>
          )}

          {/* Rodapé Oficial Exato */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-700">
            <span>{rodape}</span>
            <span className="text-[10px] text-stone-400 font-normal">
              Documento emitido em {new Date().toLocaleDateString('pt-PT')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
