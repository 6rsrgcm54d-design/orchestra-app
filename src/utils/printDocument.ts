/**
 * Utilitário central de impressão e exportação em PDF.
 * Compatível a 100% com iPad (iOS/Safari) e PC (Windows/Mac Chrome, Edge, Firefox).
 *
 * Resolve as restrições do WebKit e do iOS Safari:
 * 1. WebKit/Safari bloqueia ou ignora iframes com dimensões 0x0 ou disparados com setTimeout (perda do token de gesto do utilizador).
 * 2. No iPad / iOS (Safari), a impressão via DOM isolado com window.print() síncrono é a solução recomendada pela Apple.
 * 3. No iOS Safari, o evento 'afterprint' é disparado prematuramente (em milissegundos) assim que o AirPrint abre.
 *    Portanto, o nó do documento NUNCA é removido precipitadamente do DOM, garantindo que o WebKit tem sempre o conteúdo para rasterizar.
 * 4. No modo Standalone (quando adicionado ao Ecrã Inicial como Web App no iOS), a Apple desativa window.print() por restrição interna de WebKit.
 *    Para esse caso, é fornecida a deteção isIOSStandalone(), a abertura da folha limpa em separador/Blob e a passagem direta para o Safari via "x-safari-".
 * 5. Elimina o endereço URL e rodapés do browser através de @page { margin: 0 !important; }.
 */

import toast from 'react-hot-toast';

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
 * Deteta se a app está a correr no modo "Standalone / Web App do Ecrã Inicial" no iOS.
 * Neste modo, a Apple bloqueia deliberadamente a invocação da interface nativa de impressão.
 */
export function isIOSStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as unknown as { standalone?: boolean };
  const isStandaloneNav = Boolean(nav && nav.standalone === true);
  const isStandaloneDisplay =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return isStandaloneNav || isStandaloneDisplay;
}

/**
 * Abre o endereço atual no Safari nativo para permitir impressão completa sem restrições.
 * No iOS standalone, o protocolo "x-safari-https://" quebra a sandbox da WebClip e força o iOS a abrir no Safari real.
 */
export function openInSafariForPrinting(): void {
  try {
    const currentUrl = window.location.href;
    if (currentUrl.startsWith('https://')) {
      window.location.href = 'x-safari-' + currentUrl;
      return;
    }
    if (currentUrl.startsWith('http://')) {
      window.location.href = 'x-safari-' + currentUrl;
      return;
    }
    const a = document.createElement('a');
    a.href = currentUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.warn('Falha ao abrir no Safari:', err);
  }
}

/**
 * Obtém ou cria o contentor isolado persistente para impressão no DOM principal.
 * Nunca é destruído para evitar que o WebKit (iOS AirPrint) perca o documento durante a rasterização.
 */
function getOrCreatePrintMount(): HTMLElement {
  let printMount = document.getElementById('print-isolated-mount');
  if (!printMount) {
    printMount = document.createElement('div');
    printMount.id = 'print-isolated-mount';
    document.body.appendChild(printMount);
  }
  return printMount;
}

/**
 * Imprime utilizando montagem isolada no DOM principal com regras @media print.
 * Este método é 100% fiável no iOS / iPadOS e não sofre de bloqueios de iframes.
 */
function printViaIsolatedDom(htmlContent: string, title?: string): void {
  const printMount = getOrCreatePrintMount();
  printMount.innerHTML = htmlContent;

  // Ativa a classe de isolamento no body (index.css aplica estilos apenas em @media print)
  document.body.classList.add('printing-isolated-doc');

  const prevTitle = document.title;
  if (title) {
    document.title = title;
  }

  // Restaura o título e o estado do body apenas quando o utilizador voltar a interagir com o ecrã.
  // CRÍTICO: Não remover o nó #print-isolated-mount nem a classe em 'afterprint',
  // porque no iOS o 'afterprint' dispara quase instantaneamente quando o AirPrint abre!
  const restoreScreenState = () => {
    document.body.classList.remove('printing-isolated-doc');
    if (title) {
      document.title = prevTitle;
    }
    window.removeEventListener('focus', restoreScreenState);
    window.removeEventListener('touchstart', restoreScreenState);
    window.removeEventListener('click', restoreScreenState);
  };

  window.addEventListener('focus', restoreScreenState, { once: true });
  window.addEventListener('touchstart', restoreScreenState, { once: true });
  window.addEventListener('click', restoreScreenState, { once: true });

  // Timeout longo de segurança para garantir limpeza do título caso nenhum evento dispare
  setTimeout(restoreScreenState, 60000);

  // Disparo síncrono imediato para preservar o gesto de clique no iOS Safari e iPad
  try {
    window.print();
  } catch (err) {
    console.error('Falha ao invocar window.print():', err);
  }
}

/**
 * Gera uma folha imprimível limpa num Blob e abre-a numa nova janela/separador.
 * Especialmente útil no iPad quando em modo standalone ou como alternativa fiável.
 */
export function openPrintableBlobWindow(htmlContent: string, title?: string): Window | null {
  try {
    const cleanTitle = title || 'Documento';
    let fullHtml = htmlContent;

    // Barra amigável no topo da página isolada (oculta automaticamente na impressão via CSS)
    const toolbar = `
      <div class="web-print-toolbar" style="background:#0f172a;color:#ffffff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;position:sticky;top:0;z-index:999999;border-bottom:2px solid #eab308;box-shadow:0 2px 10px rgba(0,0,0,0.3);">
        <div>
          <div style="font-weight:800;font-size:14px;color:#f8fafc;letter-spacing:-0.2px;">📄 ${cleanTitle}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">No iPad: Toque no botão ao lado ou no ícone de Partilha para Imprimir via AirPrint ou Guardar em PDF</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button onclick="window.print()" style="background:#eab308;color:#0f172a;border:none;padding:8px 16px;border-radius:6px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.2);">
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <style>
        @media print {
          .web-print-toolbar {
            display: none !important;
          }
        }
      </style>
    `;

    if (fullHtml.includes('<body>')) {
      fullHtml = fullHtml.replace('<body>', `<body>\n${toolbar}`);
    } else {
      fullHtml = toolbar + fullHtml;
    }

    const autoPrintScript = `
      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            try { window.print(); } catch (e) {}
          }, 350);
        });
      <\/script>
    `;
    if (fullHtml.includes('</body>')) {
      fullHtml = fullHtml.replace('</body>', `${autoPrintScript}\n</body>`);
    } else {
      fullHtml += autoPrintScript;
    }

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return win;
    }
  } catch (err) {
    console.warn('openPrintableBlobWindow falhou:', err);
  }
  return null;
}

/**
 * Imprime através de um iframe isolado de dimensões completas (para PC Desktop).
 */
function printViaIframe(htmlContent: string): boolean {
  try {
    let iframe = document.getElementById('print-isolated-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
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
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return false;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return true;
    } else {
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
  // Se estiver a correr no modo Standalone / Web App do ecrã inicial do iPad:
  // A Apple desativa por política de WebKit o window.print() síncrono.
  if (isIOSStandalone()) {
    // 1. Tenta a montagem isolada nativa
    printViaIsolatedDom(htmlContent, title);

    // 2. Abre também a folha num Blob limpo com barra de impressão e AirPrint
    openPrintableBlobWindow(htmlContent, title);

    // 3. Notifica o utilizador com instruções claras
    toast.success(
      'Documento preparado! Se o AirPrint não abrir, toque em "Abrir no Safari para Imprimir".',
      { duration: 5000 }
    );
    return;
  }

  // No iPad e dispositivos táteis móveis no Safari, usar montagem isolada nativa
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
