import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

/**
 * Utilitário para exportar um elemento do DOM como ficheiro PDF limpo e de alta resolução,
 * contornando a inserção automática de URLs/endereços no rodapé pelo Safari no iPad/iOS.
 */
export async function exportCleanPdfFromElement(
  element: HTMLElement,
  filename: string,
  loadingMsg = 'A gerar PDF limpo sem endereço...'
): Promise<void> {
  const toastId = toast.loading(loadingMsg);
  try {
    // 1. Captura com resolução 2x (Retina) para garantir nitidez máxima do texto e tabelas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // 2. Cria documento A4 (210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight <= 297) {
      // Cabe perfeitamente numa única página A4
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Tratamento para múltiplas páginas se o conteúdo exceder A4
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = 297;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
    }

    // 3. Deteta se é iPad ou dispositivo iOS
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (isIOS) {
      // No iPad, abre também o Blob diretamente num novo separador
      // Isto permite visualizar, partilhar (WhatsApp/Mail) e guardar nos Ficheiros sem qualquer rodapé de URL
      try {
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch {}
      pdf.save(filename);
    } else {
      pdf.save(filename);
    }

    toast.success('PDF gerado com sucesso! Sem endereço no rodapé.', { id: toastId });
  } catch (err) {
    console.error('Erro ao gerar PDF limpo:', err);
    toast.error('Erro ao gerar PDF direto. A tentar abrir modo de impressão...', { id: toastId });
    throw err;
  }
}
