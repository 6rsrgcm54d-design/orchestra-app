import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, HardDrive, FileSpreadsheet, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { GOOGLE_APPS_SCRIPT_CODE, isAppsScript } from '../../api/sheetsApi';

interface ConnectSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (urlOrId: string) => Promise<void>;
  onConnectLocal: () => Promise<void>;
  currentId?: string;
  isConnecting: boolean;
}

export default function ConnectSheetsModal({
  isOpen,
  onClose,
  onConnect,
  onConnectLocal,
  currentId,
  isConnecting,
}: ConnectSheetsModalProps) {
  const [scriptUrl, setScriptUrl] = useState(isAppsScript(currentId || '') ? currentId || '' : '');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'sheetUrl' | 'local'>('script');
  const [sheetUrl, setSheetUrl] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConnectScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptUrl.trim()) return;
    if (!scriptUrl.includes('script.google.com')) {
      toast.error('O link deve ser do tipo https://script.google.com/macros/s/.../exec');
      return;
    }
    await onConnect(scriptUrl.trim());
    onClose();
  };

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    await onConnect(sheetUrl.trim());
    onClose();
  };

  const handleSwitchLocal = async () => {
    await onConnectLocal();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-orchestra-gold" size={22} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sincronizar com o teu Google Sheets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-3 gap-2 bg-gray-50/50 dark:bg-gray-900/30">
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-orchestra-gold text-orchestra-gold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Sparkles size={16} />
            Ligação Direta (Recomendado)
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'border-orchestra-gold text-orchestra-gold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <HardDrive size={16} />
            Modo Local
          </button>

          <button
            onClick={() => setActiveTab('sheetUrl')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sheetUrl'
                ? 'border-orchestra-gold text-orchestra-gold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            ID / OAuth
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold mb-1">Como ligar à folha "OrquestrasBomfim" sem configurar o Google Cloud:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300">
                  <li>Na tua folha Google Sheets aberta, vai ao menu superior: <strong>Extensões</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Apaga o código que lá estiver e cola o script abaixo.</li>
                  <li>Clica em <strong>Implementar</strong> &gt; <strong>Nova implementação</strong> &gt; tipo: <strong>Aplicação Web</strong>.</li>
                  <li>Em <em>"Quem tem acesso"</em>, escolhe <strong>Qualquer pessoa</strong> (Anyone) e clica em <strong>Implementar</strong>.</li>
                  <li>Copia o URL gerado (termina em <code className="bg-black/10 px-1 rounded">/exec</code>) e cola no campo abaixo!</li>
                </ol>
              </div>

              {/* Copy Code Button */}
              <div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl text-xs font-semibold transition-all border border-gray-300 dark:border-gray-600"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  {copied ? 'Código Copiado com Sucesso!' : '1. Copiar Código do Script'}
                </button>
              </div>

              {/* Paste URL Form */}
              <form onSubmit={handleConnectScript} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    2. Cola aqui o URL da Aplicação Web:
                  </label>
                  <input
                    type="url"
                    required
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!scriptUrl.trim() || isConnecting}
                  className="w-full py-2.5 px-4 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-xl hover:bg-orchestra-gold-light transition-all shadow disabled:opacity-50"
                >
                  {isConnecting ? 'A testar e ligar...' : 'Ligar ao Google Sheets Agora'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-600 dark:text-gray-300">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Base de Dados Local (No Navegador)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Não requer qualquer ligação à internet ou ao Google. Todos os alunos, peças e avaliações são guardados no teu browser.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSwitchLocal}
                disabled={isConnecting}
                className="py-2.5 px-6 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-medium text-sm rounded-xl hover:opacity-90 transition-all shadow"
              >
                Usar Modo Local
              </button>
            </div>
          )}

          {activeTab === 'sheetUrl' && (
            <form onSubmit={handleConnectSheet} className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Se tiveres OAuth 2.0 configurado no Google Cloud, podes indicar o ID da folha diretamente:
              </p>
              <div>
                <input
                  type="text"
                  required
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="ID da folha ou URL do spreadsheet"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                />
              </div>
              <button
                type="submit"
                disabled={!sheetUrl.trim() || isConnecting}
                className="w-full py-2 px-4 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-xl hover:bg-orchestra-gold-light transition-all disabled:opacity-50"
              >
                {isConnecting ? 'A conectar...' : 'Conectar via API'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
