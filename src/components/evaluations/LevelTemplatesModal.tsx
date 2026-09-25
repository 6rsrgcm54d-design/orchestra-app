import React, { useState } from 'react';
import { X, Settings2, Sparkles, RotateCcw, Check, User, Info } from 'lucide-react';
import {
  DEFAULT_LEVEL_TEMPLATES,
  LEVEL_LABELS,
  generateObservationText,
} from '../../utils/nameParser';

interface LevelTemplatesModalProps {
  templates: Record<number, string>;
  onSave: (newTemplates: Record<number, string>) => void;
  onClose: () => void;
}

const SAMPLE_FEMALE = { nome: 'Ana da Cruz Margarido', naipe: 'Violino I', grau: '5º Grau', orquestra: 'Artave' };
const SAMPLE_MALE = { nome: 'João Ferreira', naipe: 'Violino I', grau: '7º Grau', orquestra: 'Artave' };

export default function LevelTemplatesModal({ templates, onSave, onClose }: LevelTemplatesModalProps) {
  const [form, setForm] = useState<Record<number, string>>({
    1: templates[1] || DEFAULT_LEVEL_TEMPLATES[1],
    2: templates[2] || DEFAULT_LEVEL_TEMPLATES[2],
    3: templates[3] || DEFAULT_LEVEL_TEMPLATES[3],
    4: templates[4] || DEFAULT_LEVEL_TEMPLATES[4],
    5: templates[5] || DEFAULT_LEVEL_TEMPLATES[5],
  });

  const [activePreview, setActivePreview] = useState<'female' | 'male'>('female');

  const handleReset = () => {
    if (window.confirm('Deseja repor os textos originais de fábrica para todos os níveis?')) {
      setForm({ ...DEFAULT_LEVEL_TEMPLATES });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const sampleStudent = activePreview === 'female' ? SAMPLE_FEMALE : SAMPLE_MALE;

  const insertTag = (lvl: number, tag: string) => {
    setForm((prev) => ({
      ...prev,
      [lvl]: (prev[lvl] || '') + ` ${tag} `,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Top Header */}
        <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-orchestra-gold flex items-center justify-center border border-amber-500/20">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Configuração dos Textos de Avaliação (Níveis 1 a 5)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Personalize a observação atribuída automaticamente a cada nível. O artigo (O/A) e o primeiro nome são inseridos automaticamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info banner & Preview selector */}
        <div className="px-6 py-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Sparkles size={15} className="flex-shrink-0 text-amber-500" />
            <span>
              Ao clicar no nível do aluno, o texto é gerado de imediato e pode ser afinado caso pretenda.
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Exemplo no ecrã:</span>
            <div className="inline-flex bg-white dark:bg-gray-700 p-0.5 rounded-lg border border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={() => setActivePreview('female')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  activePreview === 'female'
                    ? 'bg-orchestra-gold text-orchestra-navy font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Aluna (Ana)
              </button>
              <button
                type="button"
                onClick={() => setActivePreview('male')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  activePreview === 'male'
                    ? 'bg-orchestra-gold text-orchestra-navy font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Aluno (João)
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable list of 5 levels */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {[5, 4, 3, 2, 1].map((lvl) => {
            const meta = LEVEL_LABELS[lvl];
            const currentTpl = form[lvl] || '';
            const previewText = generateObservationText(currentTpl, sampleStudent, lvl);

            return (
              <div
                key={lvl}
                className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700/80 p-4 space-y-2.5 transition-all focus-within:border-orchestra-gold focus-within:ring-1 focus-within:ring-orchestra-gold"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black text-sm flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-sm">
                      {lvl}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <span className="text-amber-400 text-xs tracking-wider hidden sm:inline">
                      {meta.stars}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-400 mr-1 hidden sm:inline">Inserir tag:</span>
                    <button
                      type="button"
                      onClick={() => insertTag(lvl, '{PrimeiroNome}')}
                      className="px-1.5 py-0.5 bg-white dark:bg-gray-800 hover:bg-gray-100 text-[10px] text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
                      title="Primeiro nome do aluno"
                    >
                      {'{Nome}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag(lvl, '{Artigo}')}
                      className="px-1.5 py-0.5 bg-white dark:bg-gray-800 hover:bg-gray-100 text-[10px] text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
                      title="Artigo O ou A"
                    >
                      {'{O/A}'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={currentTpl}
                  onChange={(e) => setForm({ ...form, [lvl]: e.target.value })}
                  placeholder={`Texto para o nível ${lvl}...`}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orchestra-gold resize-none"
                />

                {/* Live Preview */}
                <div className="flex items-start gap-2 bg-white dark:bg-gray-800/80 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 mt-0.5">
                    Resultado:
                  </span>
                  <p className="text-gray-800 dark:text-gray-200 font-medium italic">
                    "{previewText}"
                  </p>
                </div>
              </div>
            );
          })}

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 rounded-lg transition-all"
            >
              <RotateCcw size={14} />
              Repor Padrões
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-orchestra-navy bg-orchestra-gold hover:bg-orchestra-gold-light rounded-lg shadow-sm transition-all"
              >
                <Check size={15} />
                Guardar Textos dos Níveis
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
