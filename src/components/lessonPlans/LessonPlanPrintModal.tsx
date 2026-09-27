import React from 'react';
import { X, Printer, Calendar, Clock, Music2, FileDown, CheckSquare, Info } from 'lucide-react';
import type { LessonPlan } from '../../types';

interface LessonPlanPrintModalProps {
  plan: LessonPlan;
  onClose: () => void;
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
    return d.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function LessonPlanPrintModal({ plan, onClose }: LessonPlanPrintModalProps) {
  const handlePrint = () => {
    window.print();
  };

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
    <>
      {/* CSS específico para garantir que na impressão/PDF sai APENAS a folha de ensaio */}
      <style>{`
        @media print {
          /* Esconde tudo na janela */
          body * {
            visibility: hidden !important;
          }

          /* Torna visível estritamente a folha do plano de aula */
          #lesson-plan-print-root,
          #lesson-plan-print-root * {
            visibility: visible !important;
          }

          /* Posiciona a folha no topo exato da página A4 */
          #lesson-plan-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #111827 !important;
            display: block !important;
          }

          /* Oculta o fundo escuro do modal e os botões de ação */
          .no-print-area {
            display: none !important;
          }

          /* Otimização de cores e contrastes para impressora e PDF */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto no-print-area print:p-0 print:bg-white print:static print:inset-auto">
        <div className="bg-white text-gray-900 rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden my-4 flex flex-col print:border-none print:shadow-none print:max-w-none print:rounded-none">
          {/* Barra Superior do Modal (Ocultada na impressão) */}
          <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print-area">
            <div>
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-orchestra-gold" />
                <span className="font-bold text-sm text-gray-800 dark:text-white">
                  Impressão & Exportação em PDF
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                  PDF / A4
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <Info size={12} className="text-amber-500 flex-shrink-0" />
                <span>Na janela de impressão, escolha <strong>"Guardar como PDF"</strong> para descarregar o documento limpo.</span>
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

          {/* Folha Oficial de Ensaio (Apenas esta área é impressa) */}
          <div id="lesson-plan-print-root" className="p-8 sm:p-10 space-y-6 bg-white text-gray-900">
            {/* Cabeçalho Oficial */}
            <div className="border-b-2 border-gray-900 pb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-black text-amber-700 mb-1">
                  Conservatório Bomfim • Gestão de Orquestras
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
                <p className="text-xs text-gray-600 font-medium capitalize">{formatDateFull(plan.data)}</p>
              </div>
            </div>

            {/* Caixa Resumo da Sessão */}
            <div className="grid grid-cols-3 gap-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Data do Ensaio</span>
                <strong className="text-gray-900 text-sm font-bold capitalize">{formatDateFull(plan.data)}</strong>
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
                    <th className="py-2.5 px-3 border border-gray-300 font-bold">Atividade / Objetivos</th>
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

            {/* Rodapé da Folha */}
            <div className="text-[10px] text-gray-400 pt-3 flex items-center justify-between border-t border-gray-200">
              <span>OrquestraApp • Documento de Ensaio</span>
              <span>Emitido em {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
