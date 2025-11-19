import React, { useRef, useEffect } from 'react';
import { BibleState } from '../types';
import { Loader2, ArrowLeft, ArrowRight, MessageCircleQuestion } from 'lucide-react';

interface ReaderProps {
  state: BibleState;
  onChapterChange: (delta: number) => void;
  onToggleAI: () => void;
}

export const Reader: React.FC<ReaderProps> = ({ state, onChapterChange, onToggleAI }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top when chapter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [state.currentBook, state.currentChapter]);

  if (state.isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-bible-paper">
        <Loader2 className="w-12 h-12 text-bible-gold animate-spin mb-4" />
        <p className="text-stone-500 animate-pulse font-serif">Buscando as escrituras sagradas...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bible-paper p-8 text-center">
        <div className="max-w-md">
          <p className="text-red-600 font-semibold mb-2">Ocorreu um erro</p>
          <p className="text-stone-600 mb-4">{state.error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-bible-leather text-white rounded hover:bg-stone-800"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!state.content) return null;

  return (
    <div className="flex-1 bg-bible-paper relative h-full overflow-hidden flex flex-col">
      {/* Top Bar inside Reader for mobile context mainly */}
      <div className="sticky top-0 z-10 bg-bible-paper/95 backdrop-blur border-b border-stone-200 p-4 flex justify-between items-center shadow-sm">
         <h2 className="text-lg md:text-2xl font-bold font-serif text-bible-ink">
            {state.currentBook.name} <span className="text-bible-gold text-xl md:text-3xl">{state.currentChapter}</span>
         </h2>
         
         <div className="flex items-center gap-2">
            <button 
                onClick={onToggleAI}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
                <MessageCircleQuestion className="w-4 h-4" />
                <span className="hidden sm:inline">Estudo AI</span>
            </button>
         </div>
      </div>

      {/* Content Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full">
        
        {/* AI Summary Banner */}
        {state.content.summary && (
            <div className="mb-8 p-6 bg-stone-100 rounded-xl border-l-4 border-bible-gold italic text-stone-600 font-serif text-sm leading-relaxed">
                <span className="block font-bold text-bible-gold mb-1 not-italic text-xs uppercase tracking-widest">Resumo do Capítulo</span>
                {state.content.summary}
            </div>
        )}

        {/* Verses */}
        <div className="space-y-4">
            {state.content.verses.map((verse) => (
                <p key={verse.number} className="text-lg md:text-xl leading-loose font-serif text-bible-ink hover:bg-yellow-50/50 transition-colors rounded px-2 -mx-2">
                    <sup className="text-xs font-bold text-bible-gold mr-2 select-none font-sans">{verse.number}</sup>
                    {verse.text}
                </p>
            ))}
        </div>

        {/* Navigation Footer */}
        <div className="mt-16 pt-8 border-t border-stone-200 flex justify-between items-center">
            <button 
                onClick={() => onChapterChange(-1)}
                disabled={state.currentBook.name === 'Gênesis' && state.currentChapter === 1}
                className="flex items-center gap-2 text-stone-500 hover:text-bible-leather disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-sans font-medium">Anterior</span>
            </button>

            <span className="text-stone-400 text-sm font-sans">
                {state.currentBook.name} {state.currentChapter}
            </span>

            <button 
                onClick={() => onChapterChange(1)}
                disabled={state.currentBook.name === 'Apocalipse' && state.currentChapter === 22}
                className="flex items-center gap-2 text-stone-500 hover:text-bible-leather disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
            >
                <span className="font-sans font-medium">Próximo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>

        <div className="h-20"></div> {/* Spacer */}
      </div>
    </div>
  );
};
