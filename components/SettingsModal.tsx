import React, { useState } from 'react';
import { X, Wand2, Loader2, Image as ImageIcon, Save, RefreshCcw } from 'lucide-react';
import { generateBibleCover } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCover: string | null;
  onUpdateCover: (cover: string | null) => void;
}

const DEFAULT_PROMPT = `Design de capa de Bíblia Sagrada ultra-moderno e minimalista.
Estilo: Clean, sofisticado, contemporâneo.
Material: Acabamento fosco (matte) premium, textura suave de papel de arte ou couro liso moderno.
Cores: Paleta minimalista (Branco Off-White, Cinza Carvão ou Azul Meia-Noite) com detalhes sutis em cobre ou ouro rosé.
Tipografia: Fonte Sans-Serif elegante, minimalista e centralizada. Título "Bíblia Sagrada" discreto.
Elementos gráficos: Uso de espaço negativo, linhas geométricas finas, uma cruz estilizada muito simples ou um feixe de luz abstrato.
Atmosfera: Paz, clareza, pureza e modernidade. Sem ornamentos rococó ou excessos.`;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentCover, onUpdateCover }) => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await generateBibleCover(prompt);
      setGeneratedImage(base64);
    } catch (err) {
      setError("Não foi possível gerar a capa. Verifique sua API Key ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedImage) {
      onUpdateCover(generatedImage);
      onClose();
    }
  };

  const handleRemove = () => {
      onUpdateCover(null);
      setGeneratedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
            <h2 className="text-xl font-serif font-bold text-bible-leather flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-bible-gold" />
                Personalizar Capa
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded text-stone-500">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
            
            {/* Left Column: Controls */}
            <div className="flex-1 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                        Prompt da Inteligência Artificial
                    </label>
                    <p className="text-xs text-stone-500 mb-2">
                        Descreva como você quer a capa da sua Bíblia. O modelo usará isso para gerar uma arte única.
                    </p>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-40 p-3 text-sm text-stone-700 border border-stone-300 rounded-lg focus:ring-2 focus:ring-bible-gold focus:border-bible-gold outline-none resize-none bg-stone-50"
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-bible-leather hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {loading ? "Criando Arte..." : "Gerar Nova Capa"}
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                        {error}
                    </div>
                )}
            </div>

            {/* Right Column: Preview */}
            <div className="flex-1 flex flex-col items-center">
                <label className="block text-sm font-semibold text-stone-700 mb-4 self-start">
                    Pré-visualização
                </label>
                
                <div className="relative w-full aspect-[3/4] max-w-[280px] bg-stone-100 rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden shadow-inner">
                    {(generatedImage || currentCover) ? (
                        <img 
                            src={generatedImage || currentCover || ''} 
                            alt="Capa" 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center p-6 text-stone-400">
                            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nenhuma capa gerada</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 w-full flex gap-3">
                    {(generatedImage || currentCover) && (
                         <button 
                            onClick={handleRemove}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Remover
                        </button>
                    )}
                    
                    {generatedImage && (
                        <button 
                            onClick={handleSave}
                            className="flex-[2] flex items-center justify-center gap-2 bg-bible-gold hover:bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Aplicar Capa
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};