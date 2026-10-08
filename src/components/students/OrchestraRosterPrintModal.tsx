import React, { useState } from 'react';
import { X, Printer, FileDown, FileSpreadsheet, Users, Crown, Info, Check } from 'lucide-react';
import type { Student } from '../../types';
import {
  groupStudentsByOrchestra,
  groupStudentsByNaipe,
  exportOrchestrasToExcel,
  isChefeDeNaipe,
} from '../../utils/orchestraExport';
import {
  sanitizeOrchestraList,
  isSameOrchestra,
  normalizeOrchestraName,
  getInstitutionForOrchestra,
  getFooterForOrchestra,
} from '../../utils/orchestras';

interface OrchestraRosterPrintModalProps {
  students: Student[];
  orchestras?: string[];
  initialOrchestra?: string;
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

/**
 * Imprime a constituição das orquestras através de um iframe invisível limpo
 * com margens zero no @page para suprimir cabeçalhos e rodapés com URLs no Safari/iPad e PC.
 */
export function printOrchestraRosterToPdf(
  students: Student[],
  targetOrchestra: string,
  availableOrchestras?: string[]
) {
  const targetStudents =
    targetOrchestra && targetOrchestra !== 'todas'
      ? students.filter((s) => isSameOrchestra(s.orquestra, targetOrchestra))
      : students;

  const orchGroups = groupStudentsByOrchestra(targetStudents, availableOrchestras);
  const nowStr = new Date().toLocaleDateString('pt-PT');
  const yearStr = new Date().getFullYear();
  const anoLetivo = `${yearStr}-${yearStr + 1}`;

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

  const orchestrasHtml = orchGroups
    .map((group, groupIdx) => {
      const orchTitle = group.orchestra.toLowerCase().startsWith('orquestra')
        ? group.orchestra
        : `Orquestra ${group.orchestra}`;
      const naipeGroups = groupStudentsByNaipe(group.students);
      const isLastGroup = groupIdx === orchGroups.length - 1;

      // Resumo de instrumentos
      const summaryBadgesHtml = naipeGroups
        .map(
          (ng) => `
          <div class="summary-badge">
            <span class="summary-naipe">${escapeHtml(ng.naipe)}</span>
            <span class="summary-count">${ng.students.length}</span>
          </div>
        `
        )
        .join('');

      // Secções por Naipe
      const naipesHtml = naipeGroups
        .map((ng) => {
          const rowsHtml = ng.students
            .map((s, idx) => {
              const isChefe = isChefeDeNaipe(s);
              const numStr = s.numero ? `${escapeHtml(s.numero)}.` : `${idx + 1}.`;
              const isConcertino = isChefe && ng.naipe === 'Violino I';
              const badgeLabel = isConcertino
                ? 'Concertino'
                : isChefe
                ? s.chefeNaipe && !['sim', 'true', '1'].includes(s.chefeNaipe.toLowerCase())
                  ? escapeHtml(s.chefeNaipe)
                  : 'Chefe'
                : '';

              return `
              <tr class="${isChefe ? 'row-chefe' : ''}">
                <td class="col-num">${numStr}</td>
                <td class="col-nome">
                  <div class="name-wrapper">
                    <span class="musician-name">${escapeHtml(s.nome)}</span>
                    ${
                      isChefe
                        ? `<span class="chefe-tag ${isConcertino ? 'tag-concertino' : ''}">★ ${badgeLabel}</span>`
                        : ''
                    }
                  </div>
                </td>
                <td class="col-grau">${escapeHtml(s.grau || '—')}</td>
              </tr>
            `;
            })
            .join('');

          return `
          <div class="naipe-block">
            <div class="naipe-header">
              <span class="naipe-title">${escapeHtml(ng.naipe)}</span>
              <span class="naipe-total">${ng.students.length} ${ng.students.length === 1 ? 'músico' : 'músicos'}</span>
            </div>
            <table class="naipe-table">
              <thead>
                <tr>
                  <th style="width: 32px;">Nº</th>
                  <th>Nome do Músico</th>
                  <th style="width: 60px; text-align: right;">Grau</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
        })
        .join('');

      return `
      <div class="orchestra-page ${!isLastGroup ? 'page-break' : ''}">
        <!-- Cabeçalho Oficial -->
        <div class="header">
          <div>
            <div class="institution-badge">${escapeHtml(getInstitutionForOrchestra(group.orchestra))}</div>
            <h1 class="title">Constituição da Orquestra</h1>
            <div class="official-subtitle">${escapeHtml(orchTitle)} • Ano letivo ${anoLetivo}</div>
          </div>
          <div class="total-badge-box">
            <div class="total-number">${group.students.length}</div>
            <div class="total-label">Instrumentistas</div>
          </div>
        </div>

        <!-- Quadro Síntese de Efetivos -->
        <div class="summary-box">
          <div class="summary-badges-grid">
            ${summaryBadgesHtml}
          </div>
        </div>

        <!-- Distribuição por Naipes -->
        <div class="naipes-grid">
          ${naipesHtml}
        </div>

        <!-- Rodapé Oficial -->
        <div class="footer">
          <span>${escapeHtml(getFooterForOrchestra(group.orchestra))}</span>
          <span style="font-size: 9px; color: #9ca3af; font-weight: normal;">Emitido em ${nowStr}</span>
        </div>
      </div>
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
          font-size: 11px;
        }
        .print-sheet {
          padding: 12mm 15mm;
          box-sizing: border-box;
          width: 100%;
        }
        .orchestra-page {
          margin-bottom: 20px;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
        }
        .header {
          border-bottom: 2.5px solid #111827;
          padding-bottom: 10px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .institution-badge {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 900;
          color: #b45309;
          margin-bottom: 3px;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          color: #111827;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .official-subtitle {
          font-size: 13px;
          font-weight: 800;
          color: #4b5563;
          margin-top: 2px;
        }
        .total-badge-box {
          text-align: center;
          background-color: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 6px 14px;
          min-width: 90px;
        }
        .total-number {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
        }
        .total-label {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          margin-top: 2px;
        }
        .summary-box {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-left: 4px solid #f59e0b;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 14px;
          page-break-inside: avoid;
        }
        .summary-title {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #92400e;
          margin-bottom: 6px;
        }
        .summary-badges-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .summary-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ffffff;
          border: 1px solid #fcd34d;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
        }
        .summary-naipe {
          font-weight: 700;
          color: #78350f;
        }
        .summary-count {
          background-color: #fef3c7;
          color: #92400e;
          font-weight: 900;
          border-radius: 3px;
          padding: 0 4px;
        }
        .naipes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .naipe-block {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 4px;
        }
        .naipe-header {
          background-color: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          padding: 5px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .naipe-title {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          letter-spacing: 0.3px;
        }
        .naipe-total {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          background: #ffffff;
          padding: 1px 5px;
          border-radius: 3px;
          border: 1px solid #e2e8f0;
        }
        .naipe-table {
          width: 100%;
          border-collapse: collapse;
        }
        .naipe-table th {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px 6px;
          font-size: 9px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          text-align: left;
        }
        .naipe-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 10px;
          line-height: 1.25;
        }
        .naipe-table tr:last-child td {
          border-bottom: none;
        }
        .row-chefe {
          background-color: #fffbeb !important;
        }
        .col-num {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
        }
        .col-nome {
          font-weight: 600;
          color: #1e293b;
        }
        .name-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .chefe-tag {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          background-color: #fde68a;
          color: #92400e;
          border: 1px solid #fcd34d;
          padding: 0.5px 3.5px;
          border-radius: 3px;
          display: inline-block;
          white-space: nowrap;
        }
        .tag-concertino {
          background-color: #fed7aa;
          color: #9a3412;
          border-color: #fdba74;
        }
        .col-grau {
          color: #64748b;
          font-size: 9px;
          text-align: right;
          font-weight: 500;
        }
        .footer {
          border-top: 1.5px solid #e2e8f0;
          padding-top: 8px;
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 700;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="print-sheet">
        ${orchestrasHtml}
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

export default function OrchestraRosterPrintModal({
  students,
  orchestras = [],
  initialOrchestra = 'todas',
  onClose,
}: OrchestraRosterPrintModalProps) {
  const [selectedOrchestra, setSelectedOrchestra] = useState<string>(initialOrchestra || 'todas');

  const validOrchestras = React.useMemo(() => {
    return sanitizeOrchestraList(orchestras);
  }, [orchestras]);

  const targetStudents = React.useMemo(() => {
    if (!selectedOrchestra || selectedOrchestra === 'todas') {
      return students;
    }
    return students.filter((s) => isSameOrchestra(s.orquestra, selectedOrchestra));
  }, [students, selectedOrchestra]);

  const orchGroups = React.useMemo(() => {
    return groupStudentsByOrchestra(targetStudents, validOrchestras);
  }, [targetStudents, validOrchestras]);

  const handlePrint = () => {
    printOrchestraRosterToPdf(students, selectedOrchestra, validOrchestras);
  };

  const handleExportExcel = () => {
    exportOrchestrasToExcel(students, selectedOrchestra, validOrchestras);
  };

  const yearStr = new Date().getFullYear();
  const anoLetivo = `${yearStr}-${yearStr + 1}`;
  const nowStr = new Date().toLocaleDateString('pt-PT');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Barra Superior com Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 px-6 border-b border-gray-200 bg-gray-50 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Users size={16} className="text-orchestra-gold" />
                Constituição das Orquestras
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                A4 Limpo • Músicos
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Info size={12} className="text-amber-600 flex-shrink-0" />
              <span>Gere o elenco oficial com instrumentistas organizados por naipes e chefes de naipe.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Seletor de Orquestra */}
            <select
              value={selectedOrchestra}
              onChange={(e) => setSelectedOrchestra(e.target.value)}
              className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-2 text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-orchestra-gold shadow-sm"
            >
              <option value="todas">Todas as Orquestras ({students.length})</option>
              {validOrchestras.map((o) => {
                const count = students.filter((s) => isSameOrchestra(s.orquestra, o)).length;
                return (
                  <option key={o} value={o}>
                    {o} ({count})
                  </option>
                );
              })}
            </select>

            {/* Exportar Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Exportar constituição para ficheiro Excel (.csv com UTF-8 e separador ;)"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
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

        {/* Barra de Apoio e Dica do iPad */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
              iPad / PC
            </span>
            <span>
              Configurado com margens zero para <strong>ocultar o endereço no rodapé da página</strong>. No iPad: na janela de impressão, faça zoom na folha com 2 dedos para abrir diretamente o PDF.
            </span>
          </div>
          <span className="text-stone-500 font-medium">
            Total selecionado: <strong>{targetStudents.length} músico(s)</strong>
          </span>
        </div>

        {/* Pré-visualização da Folha Oficial A4 */}
        <div className="p-8 sm:p-10 space-y-8 bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
          {orchGroups.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Nenhum aluno registado nesta orquestra.
            </div>
          ) : (
            orchGroups.map((group) => {
              const orchTitle = group.orchestra.toLowerCase().startsWith('orquestra')
                ? group.orchestra
                : `Orquestra ${group.orchestra}`;
              const naipeGroups = groupStudentsByNaipe(group.students);

              return (
                <div key={group.orchestra} className="space-y-6 pb-8 border-b-2 border-dashed border-gray-200 last:border-b-0">
                  {/* Cabeçalho Oficial */}
                  <div className="border-b-2 border-gray-900 pb-4 flex items-start justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-black text-amber-700 mb-1">
                        {getInstitutionForOrchestra(group.orchestra)}
                      </p>
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                        Constituição da Orquestra
                      </h1>
                      <p className="text-base font-bold text-gray-800 mt-0.5">
                        {orchTitle} • Ano letivo {anoLetivo}
                      </p>
                    </div>

                    <div className="text-right bg-stone-100 p-3 rounded-xl border border-stone-200 min-w-[100px]">
                      <div className="text-2xl font-black text-stone-900">{group.students.length}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Instrumentistas
                      </div>
                    </div>
                  </div>

                  {/* Quadro de Resumo de Efetivos */}
                  <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200">
                    <div className="flex flex-wrap gap-1.5">
                      {naipeGroups.map((ng) => (
                        <div
                          key={ng.naipe}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300/80 rounded-md text-xs"
                        >
                          <span className="font-bold text-stone-800">{ng.naipe}</span>
                          <span className="font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded text-[11px]">
                            {ng.students.length}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grelha de Naipes (2 colunas) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {naipeGroups.map((ng) => (
                      <div
                        key={ng.naipe}
                        className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs"
                      >
                        <div className="bg-stone-100 px-3 py-2 border-b border-stone-200 flex items-center justify-between">
                          <span className="font-black text-xs uppercase tracking-wider text-stone-900">
                            {ng.naipe}
                          </span>
                          <span className="text-[11px] font-bold text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                            {ng.students.length} {ng.students.length === 1 ? 'músico' : 'músicos'}
                          </span>
                        </div>

                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-stone-50/80 text-[10px] uppercase font-bold text-stone-500 border-b border-stone-100">
                              <th className="py-1 px-3 w-10">Nº</th>
                              <th className="py-1 px-3">Nome</th>
                              <th className="py-1 px-3 w-14 text-right">Grau</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {ng.students.map((s, idx) => {
                              const isChefe = isChefeDeNaipe(s);
                              const isConcertino = isChefe && ng.naipe === 'Violino I';

                              return (
                                <tr
                                  key={s.id}
                                  className={isChefe ? 'bg-amber-50/60 font-semibold' : 'hover:bg-stone-50/50'}
                                >
                                  <td className="py-1.5 px-3 font-mono text-[11px] text-stone-400">
                                    {s.numero ? `${s.numero}.` : `${idx + 1}.`}
                                  </td>
                                  <td className="py-1.5 px-3 text-stone-900 flex items-center gap-1.5 flex-wrap">
                                    <span>{s.nome}</span>
                                    {isChefe && (
                                      <span
                                        className={`inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                                          isConcertino
                                            ? 'bg-amber-200 text-amber-950 border-amber-300'
                                            : 'bg-amber-100 text-amber-900 border-amber-300'
                                        }`}
                                      >
                                        <Crown size={10} className="text-amber-600" />
                                        {isConcertino ? 'Concertino' : 'Chefe'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-3 text-right text-stone-500 font-medium text-[11px]">
                                    {s.grau || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé Oficial por Orquestra */}
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-700">
                    <span>{getFooterForOrchestra(group.orchestra)}</span>
                    <span className="text-[10px] text-stone-400 font-normal">
                      Documento emitido em {nowStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
