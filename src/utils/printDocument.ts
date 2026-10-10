/**
 * Utilitário central de impressão e exportação em PDF.
 * Compatível a 100% com iPad (iOS/Safari) e PC (Windows/Mac Chrome, Edge, Firefox).
 *
 * Resolve as restrições do WebKit e do iOS Safari:
 * 1. WebKit/Safari bloqueia ou ignora iframes com dimensões 0x0 ou disparados com setTimeout (perda do token de gesto do utilizador).
 * 2. No iPad / iOS, a impressão via DOM isolado com window.print() síncrono é a solução oficial recomendada pela Apple.
 * 3. No PC, tenta o iframe com dimensões reais e invisível (100vw x 100vh), com fallback automático e imediato para DOM isolado.
 * 4. Elimina o endereço URL e rodapés do browser através de @page { margin: 0 !important; }.
 */

export function isMobileOrTabletDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  return (
    /iPad|iPhone|iPod|Android|Mobile|Tablet/i.test(ua) ||
    (platform.startsWith('Mac') && maxTouchPoints > 1) ||
    (maxTouchPoints > 1 && 'ontouchstart' in window)
  );
}

/**
 * Imprime utilizando montagem isolada no DOM principal com regras @media print.
 * Este método é 100% fiável no iOS / iPadOS e não sofre de bloqueios de iframes.
 */
function printViaIsolatedDom(htmlContent: string, title?: string): void {
  // Limpar qualquer contentor anterior se existir
  const existingMount = document.getElementById('print-isolated-mount');
  if (existingMount) {
    existingMount.remove();
  }

  // Cria o contentor isolado no body
  const printMount = document.createElement('div');
  printMount.id = 'print-isolated-mount';
  printMount.innerHTML = htmlContent;
  document.body.appendChild(printMount);

  // Ativa a classe de isolamento no body
  document.body.classList.add('printing-isolated-doc');

  const prevTitle = document.title;
  if (title) {
    document.title = title;
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('printing-isolated-doc');
    if (printMount.parentNode) {
      printMount.parentNode.removeChild(printMount);
    }
    if (title) {
      document.title = prevTitle;
    }
    window.removeEventListener('afterprint', cleanup);
  };

  // Regista limpeza para quando o utilizador fechar a janela de impressão
  window.addEventListener('afterprint', cleanup, { once: true });

  // Disparo síncrono imediato para preservar o gesto de clique no iOS Safari e iPad
  try {
    window.print();
  } catch (err) {
    console.error('Falha ao invocar window.print():', err);
    cleanup();
  }

  // Fallback de segurança para libertar o DOM caso afterprint não seja disparado
  setTimeout(cleanup, 4000);
}

/**
 * Imprime através de um iframe isolado de dimensões completas (para PC Desktop).
 */
function printViaIframe(htmlContent: string): boolean {
  try {
    const existingIframe = document.getElementById('print-isolated-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-isolated-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = '0';
    iframe.style.opacity = '0.001';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return false;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const cleanup = () => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch {}
    };

    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(cleanup, 2500);
      return true;
    } else {
      cleanup();
      return false;
    }
  } catch (err) {
    console.warn('Iframe print falhou:', err);
    return false;
  }
}

/**
 * Função pública para imprimir qualquer documento HTML com suporte garantido para iPad e PC.
 */
export function printHtmlDocument(htmlContent: string, title?: string): void {
  // No iPad e dispositivos táteis móveis, usar sempre montagem isolada nativa
  if (isMobileOrTabletDevice()) {
    printViaIsolatedDom(htmlContent, title);
    return;
  }

  // Em PC Desktop, tenta o iframe de tamanho completo; se falhar, recorre ao DOM isolado
  const success = printViaIframe(htmlContent);
  if (!success) {
    printViaIsolatedDom(htmlContent, title);
  }
}
