import React from 'react';
import { X, FileDown, Mail, Info, Copy, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WeeklyPlan } from '../../types';
import { parseDayRepertoireBlocks, parseDayRepertoire, hasSpecificHoursInRepertoire } from '../../utils/weeklyPlanParser';

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
  if (!dateStr) return fallback ? fallback.toUpperCase() : '';
  try {
    let normalized = dateStr.trim();
    const ptMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ptMatch) {
      normalized = `${ptMatch[3]}-${ptMatch[2].padStart(2, '0')}-${ptMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`);
    if (isNaN(d.getTime())) return fallback ? fallback.toUpperCase() : '';
    const weekday = d.toLocaleDateString('pt-PT', { weekday: 'long' });
    return weekday.toUpperCase();
  } catch {
    return fallback ? fallback.toUpperCase() : '';
  }
}

function formatWeekRange(startStr?: string, endStr?: string): string {
  if (!startStr && !endStr) return '';
  if (!startStr) return formatDatePT(endStr);
  if (!endStr) return formatDatePT(startStr);

  try {
    const s = new Date(startStr.includes('T') ? startStr : `${startStr}T00:00:00`);
    const e = new Date(endStr.includes('T') ? endStr : `${endStr}T00:00:00`);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return `${startStr} a ${endStr}`;
    }

    const sDay = s.getDate();
    const eDay = e.getDate();
    const sMonth = s.toLocaleDateString('pt-PT', { month: 'long' }).toLowerCase();
    const eMonth = e.toLocaleDateString('pt-PT', { month: 'long' }).toLowerCase();
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (sMonth === eMonth && sYear === eYear) {
      return `${sDay} a ${eDay} ${sMonth} ${sYear}`;
    }
    if (sYear === eYear) {
      return `${sDay} ${sMonth} a ${eDay} ${eMonth} ${sYear}`;
    }
    return `${sDay} ${sMonth} ${sYear} a ${eDay} ${eMonth} ${eYear}`;
  } catch {
    return `${startStr} a ${endStr}`;
  }
}

export function generateWeeklyEmailBody(plan: WeeklyPlan, includePdfNotice: boolean = true): string {
  const orch = plan.orquestra || 'Orquestra Artave';
  const range = formatWeekRange(plan.semanaInicio, plan.semanaFim);

  let text = `Bom dia,\n\n`;
  text += `Segue o Plano Semanal de Ensaios da ${orch} (${range}):\n\n`;
  text += `══════════════════════════════════════════════════\n`;
  text += `${orch.toUpperCase()} • ANO LETIVO ${plan.anoLetivo || '2026-2027'}\n`;
  text += `PLANO SEMANAL DE ENSAIOS\n`;
  text += `══════════════════════════════════════════════════\n\n`;

  (plan.dias || []).forEach((d) => {
    const diaNome = formatDayOfWeek(d.data, d.diaSemana || 'Dia de Ensaio');
    const dataFmt = formatDatePT(d.data);
    text += `${diaNome}${dataFmt ? ` (${dataFmt})` : ''}\n`;

    const blocks = parseDayRepertoireBlocks(d.obras, d.horario);
    const hasSpecific = blocks.some((b) => b.hasSpecificTime);

    if (hasSpecific) {
      blocks.forEach((b) => {
        if (b.horario) {
          text += `${b.horario} — ${b.titulo}\n`;
        } else if (b.titulo) {
          text += `${b.titulo}\n`;
        }
        (b.detalhes || []).forEach((det) => {
          text += `  • ${det}\n`;
        });
      });
    } else {
      const horas = d.horario && d.horario.trim() ? d.horario.trim() : '';
      if (horas) {
        text += `Horário: ${horas}\n`;
      }
      blocks.forEach((b) => {
        if (b.titulo) {
          text += `• ${b.titulo}\n`;
        }
        (b.detalhes || []).forEach((det) => {
          text += `  • ${det}\n`;
        });
      });
    }

    if (d.local && d.local.trim()) {
      text += `Local: ${d.local.trim()}\n`;
    }
    if (d.observacoes && d.observacoes.trim()) {
      text += `Observações: ${d.observacoes.trim()}\n`;
    }
    text += `\n──────────────────────────────────────────────────\n\n`;
  });

  if (plan.avisosGerais && plan.avisosGerais.trim()) {
    text += `Avisos:\n${plan.avisosGerais.trim()}\n\n`;
  }

  if (includePdfNotice) {
    text += `O plano também se encontra em anexo em PDF.\n\n`;
  }

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

  // Observações só aparecem se pelo menos um dia tiver algo escrito
  const hasAnyObservations = (plan.dias || []).some(
    (d) => d.observacoes && d.observacoes.trim().length > 0
  );

  // Avisos gerais só aparecem se houver texto
  const hasAvisos = Boolean(plan.avisosGerais && plan.avisosGerais.trim().length > 0);

  const daysHtml = (plan.dias || [])
    .map((d, dayIdx) => {
      const diaNome = formatDayOfWeek(d.data, d.diaSemana || 'Dia de Ensaio');
      const dataFmt = formatDatePT(d.data);
      const bg = dayIdx % 2 === 1 ? 'background-color: #fafaf9;' : 'background-color: #ffffff;';

      const blocks = parseDayRepertoireBlocks(d.obras, d.horario);
      const hasSpecific = blocks.some((b) => b.hasSpecificTime);
      const numRows = blocks.length;

      return blocks
        .map((b, blockIdx) => {
          const isFirst = blockIdx === 0;
          const isLast = blockIdx === numRows - 1;
          const borderTop = blockIdx > 0 ? 'border-top: 1px dashed #e5e7eb;' : '';

          const dateCell = isFirst
            ? `<td rowspan="${numRows}" style="border: 1px solid #d1d5db; padding: 12px 10px; width: 160px; vertical-align: top;">
                <div style="font-size: 13px; font-weight: 900; color: #111827; letter-spacing: 0.3px;">
                  ${escapeHtml(diaNome)}
                </div>
                <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-top: 3px;">
                  ${escapeHtml(dataFmt)}
                </div>
              </td>`
            : '';

          const obsCell =
            hasAnyObservations && isFirst
              ? `<td rowspan="${numRows}" style="border: 1px solid #d1d5db; padding: 12px 10px; width: 170px; vertical-align: top; font-size: 11px; color: #374151; font-weight: 600; line-height: 1.4;">
                  ${d.observacoes && d.observacoes.trim() ? escapeHtml(d.observacoes.trim()) : ''}
                </td>`
              : '';

          const localDisplay =
            isLast && d.local
              ? `<div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-top: 4px;">${escapeHtml(d.local)}</div>`
              : '';

          // Apenas mostra os horários que o utilizador colocou no texto livre!
          // Se o dia não tiver nenhum horário no texto livre, recorre a d.horario como fallback geral.
          const hoursDisplay = hasSpecific
            ? (b.horario || '')
            : (d.horario || 'A definir');

          const hoursHtml = hoursDisplay
            ? `<div style="font-size: 16px; font-weight: 900; color: #111827; letter-spacing: -0.3px; line-height: 1.2;">
                ${escapeHtml(hoursDisplay)}
              </div>`
            : '';

          const mainTitleHtml = b.titulo
            ? `<div style="font-size: 13px; font-weight: 800; color: #111827; line-height: 1.4;">
                ${escapeHtml(b.titulo)}
              </div>`
            : '';

          const detailsHtml = (b.detalhes || [])
            .map(
              (det) =>
                `<div style="font-size: 11px; font-weight: 500; color: #374151; line-height: 1.35; margin-top: 3px; padding-left: 8px;">
                  • ${escapeHtml(det)}
                </div>`
            )
            .join('');

          return `
            <tr style="${bg} page-break-inside: avoid;">
              ${dateCell}
              <td style="border: 1px solid #d1d5db; ${borderTop} padding: 10px 10px; width: 160px; vertical-align: middle;">
                ${hoursHtml}
                ${localDisplay}
              </td>
              <td style="border: 1px solid #d1d5db; ${borderTop} padding: 10px 10px; vertical-align: middle;">
                ${mainTitleHtml}
                ${detailsHtml}
              </td>
              ${obsCell}
            </tr>
          `;
        })
        .join('');
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
          border-bottom: 2.5px solid #111827;
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
          font-size: 26px;
          font-weight: 900;
          color: #111827;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .official-subtitle {
          font-size: 14px;
          font-weight: 800;
          color: #4b5563;
          margin-top: 4px;
        }
        .week-badge-box {
          text-align: right;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 14px;
        }
        .week-range {
          font-size: 13px;
          font-weight: 900;
          color: #111827;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 9px 10px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #374151;
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
          border-top: 1.5px solid #e5e7eb;
          padding-top: 8px;
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="print-sheet">
        <div class="header">
          <div>
            <div class="institution-badge">Escola Profissional Artística do Vale do Ave</div>
            <h1 class="title">Plano Semanal de Ensaios</h1>
            <div class="official-subtitle">${escapeHtml(orch)} • Ano letivo ${escapeHtml(ano)}</div>
          </div>
          <div class="week-badge-box">
            <div class="week-range">${escapeHtml(formatWeekRange(plan.semanaInicio, plan.semanaFim))}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 160px;">Dia & Data</th>
              <th style="width: 160px;">Horas</th>
              <th>Repertório</th>
              ${hasAnyObservations ? '<th style="width: 170px;">Observações</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${daysHtml}
          </tbody>
        </table>

        ${
          hasAvisos
            ? `
          <div class="avisos-box">
            <div class="avisos-title">Avisos da Semana</div>
            <div style="font-size: 12px; color: #78350f; line-height: 1.5; white-space: pre-line;">${escapeHtml(plan.avisosGerais || '')}</div>
          </div>
        `
            : ''
        }

        <div class="footer">
          <span>${escapeHtml(rodape)}</span>
          <span style="font-size: 9px; color: #9ca3af; font-weight: normal;">Emitido em ${new Date().toLocaleDateString('pt-PT')}</span>
        </div>
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
  const [includePdfNotice, setIncludePdfNotice] = React.useState(true);

  const handlePrint = () => {
    printWeeklyPlanToPdf(plan);
  };

  const handleSendGmail = () => {
    const orch = plan.orquestra || 'Orquestra Artave';
    const range = formatWeekRange(plan.semanaInicio, plan.semanaFim);
    const subject = encodeURIComponent(`[${orch}] Plano Semanal de Ensaios (${range})`);
    const body = encodeURIComponent(generateWeeklyEmailBody(plan, includePdfNotice));
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
    if (includePdfNotice) {
      toast.success(
        'Gmail aberto num novo separador! Lembre-se de anexar o PDF clicando no clipe (📎) no Gmail.',
        { duration: 7000 }
      );
    } else {
      toast.success('Gmail aberto com o plano pronto a enviar!', { duration: 4000 });
    }
  };

  const handleCopyText = async () => {
    try {
      const text = generateWeeklyEmailBody(plan, includePdfNotice);
      await navigator.clipboard.writeText(text);
      toast.success('Texto do Plano Semanal copiado para a Área de Transferência! Pronto para colar no WhatsApp ou Email.');
    } catch {
      toast.error('Não foi possível copiar o texto automaticamente.');
    }
  };

  const orch = plan.orquestra || 'Orquestra Artave';
  const ano = plan.anoLetivo || '2026-2027';
  const rodape = plan.notasRodape || 'Escola Profissional Artística do Vale do Ave  - Luís Machado';

  const hasAnyObservations = (plan.dias || []).some(
    (d) => d.observacoes && d.observacoes.trim().length > 0
  );
  const hasAvisos = Boolean(plan.avisosGerais && plan.avisosGerais.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Barra Superior com Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 px-6 border-b border-gray-200 bg-gray-50 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">
                Plano Semanal de Ensaios
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                A4 Limpo • Alunos
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Info size={12} className="text-amber-600 flex-shrink-0" />
              <span>Layout oficial para afixar no placard da escola ou enviar por email para casa.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Copiar WhatsApp */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95"
              title="Copiar texto para colar no WhatsApp ou Teams"
            >
              <Copy size={14} />
              Copiar WhatsApp
            </button>

            {/* Enviar com Gmail */}
            <button
              onClick={handleSendGmail}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95"
              title="Abrir diretamente no Gmail com assunto e plano semanal já preenchidos"
            >
              <Mail size={14} />
              Enviar no Gmail
            </button>

            {/* Guardar PDF / Imprimir */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-orchestra-gold text-orchestra-navy hover:bg-orchestra-gold-light font-bold text-xs rounded-lg transition-all shadow active:scale-95 cursor-pointer"
              title="Guardar em PDF ou imprimir (sem endereço no rodapé)"
            >
              <FileDown size={15} />
              <span>Guardar em PDF / Imprimir</span>
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

        {/* Barra de Apoio e Opção de Anexo */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
              iPad / PC
            </span>
            <span>
              Margens e títulos ajustados para <strong>ocultar o endereço no rodapé da página</strong>.
            </span>
          </div>

          <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold select-none text-stone-700 hover:text-stone-900 flex-shrink-0">
            <input
              type="checkbox"
              checked={includePdfNotice}
              onChange={(e) => setIncludePdfNotice(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <span>Mencionar anexo PDF no e-mail</span>
          </label>
        </div>

        {/* Pré-visualização da Folha Oficial A4 */}
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
                {orch} • Ano letivo {ano}
              </p>
            </div>

            <div className="text-right bg-stone-100 p-3 rounded-xl border border-stone-200">
              <strong className="text-sm font-black text-stone-900">
                {formatWeekRange(plan.semanaInicio, plan.semanaFim)}
              </strong>
            </div>
          </div>

          {/* Tabela do Cronograma Semanal */}
          <div>
            <table className="w-full text-left border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 text-stone-800 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3 border border-stone-300 w-40 font-bold">Dia & Data</th>
                  <th className="py-2.5 px-3 border border-stone-300 w-40 font-bold">Horas</th>
                  <th className="py-2.5 px-3 border border-stone-300 font-bold">Repertório</th>
                  {hasAnyObservations && (
                    <th className="py-2.5 px-3 border border-stone-300 w-44 font-bold">Observações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {(plan.dias || []).flatMap((item, dayIdx) => {
                  const blocks = parseDayRepertoireBlocks(item.obras, item.horario);
                  const hasSpecific = blocks.some((b) => b.hasSpecificTime);
                  const numRows = blocks.length;
                  const bgClass = dayIdx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white';

                  return blocks.map((b, blockIdx) => {
                    const isFirst = blockIdx === 0;
                    const isLast = blockIdx === numRows - 1;
                    const hoursDisplay = hasSpecific
                      ? (b.horario || '')
                      : (item.horario || 'A definir');

                    return (
                      <tr key={`${dayIdx}-${blockIdx}`} className={bgClass}>
                        {isFirst && (
                          <td
                            rowSpan={numRows}
                            className="py-3 px-3 border border-stone-300 align-top"
                          >
                            <div className="font-bold text-stone-900 text-sm">
                              {formatDayOfWeek(item.data, item.diaSemana || 'Dia')}
                            </div>
                            <div className="text-xs text-stone-500 font-medium mt-0.5">
                              {formatDatePT(item.data)}
                            </div>
                          </td>
                        )}

                        <td className="py-2.5 px-3 border border-stone-300 align-middle">
                          {hoursDisplay && (
                            <div className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                              {hoursDisplay}
                            </div>
                          )}
                          {isLast && item.local && (
                            <div className="text-xs text-stone-500 font-medium mt-1">
                              {item.local}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 border border-stone-300 align-middle">
                          {b.titulo && (
                            <div className="text-sm font-bold text-stone-900 leading-snug">
                              {b.titulo}
                            </div>
                          )}
                          {(b.detalhes || []).length > 0 && (
                            <div className="mt-1 space-y-0.5 pl-2">
                              {b.detalhes.map((det, detIdx) => (
                                <div
                                  key={detIdx}
                                  className="text-xs font-medium text-stone-600 leading-normal"
                                >
                                  • {det}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {hasAnyObservations && isFirst && (
                          <td
                            rowSpan={numRows}
                            className="py-3 px-3 border border-stone-300 align-top text-xs text-stone-700 font-medium leading-relaxed"
                          >
                            {item.observacoes && item.observacoes.trim() ? item.observacoes.trim() : ''}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {/* Avisos Gerais da Semana (apenas se preenchido) */}
          {hasAvisos && (
            <div className="p-4 bg-amber-50/90 rounded-xl border border-amber-200">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                Avisos da Semana
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
