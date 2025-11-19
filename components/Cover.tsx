import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

interface CoverProps {
  imageSrc: string | null;
  onOpen: () => void;
}

export const Cover: React.FC<CoverProps> = ({ imageSrc, onOpen }) => {
  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800 via-stone-900 to-black opacity-80 z-0"></div>

      {/* Image Background Blur Effect if image exists */}
      {imageSrc && (
          <div className="absolute inset-0 opacity-20 scale-110 blur-xl z-0 pointer-events-none">
              <img src={imageSrc} alt="" className="w-full h-full object-cover" />
          </div>
      )}

      <div className="relative z-10 max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: The 3D Book */}
        <div className="flex justify-center items-center perspective-1000 order-2 md:order-1">
          <div 
            onClick={onOpen}
            className="relative w-[300px] h-[420px] md:w-[380px] md:h-[540px] rounded-r-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 transform hover:rotate-y-[-5deg] hover:scale-105 cursor-pointer group"
            style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg)' }}
          >
            {/* Book Spine */}
            <div className="absolute left-0 top-1 bottom-1 w-8 bg-gradient-to-r from-stone-800 to-stone-600 z-20 rounded-l-sm shadow-inner transform -translate-x-4 translate-z-[-2px] rotate-y-[-90deg]"></div>
            
            {/* Main Cover Image */}
            <div className="absolute inset-0 bg-stone-800 rounded-r-lg overflow-hidden border-r-2 border-stone-700/50">
                {imageSrc ? (
                <img 
                    src={imageSrc} 
                    alt="Capa da Bíblia" 
                    className="w-full h-full object-cover"
                />
                ) : (
                <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex flex-col items-center justify-center p-8 text-center border border-white/10">
                    <div className="border-2 border-yellow-600/30 p-8 w-full h-full flex flex-col items-center justify-center">
                        <Sparkles className="w-12 h-12 text-yellow-600/50 mb-6" />
                        <h1 className="text-3xl font-serif font-bold text-stone-200 mb-2">Bíblia Sagrada</h1>
                        <p className="text-stone-500 text-sm uppercase tracking-widest">Edição Digital AI</p>
                    </div>
                </div>
                )}
                
                {/* Sheen Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10 pointer-events-none mix-blend-overlay"></div>
            </div>
          </div>
        </div>

        {/* Right Side: Welcome Text & Actions */}
        <div className="text-center md:text-left space-y-8 order-1 md:order-2">
          <div>
            <h1 className="text-5xl md:text-7xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-400 font-bold mb-4 tracking-tight">
              Bíblia Sagrada
            </h1>
            <p className="text-stone-400 text-lg md:text-xl font-light leading-relaxed max-w-lg mx-auto md:mx-0">
              Uma jornada espiritual aprimorada pela inteligência artificial. Explore os textos sagrados com profundidade e clareza.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button 
              onClick={onOpen}
              className="flex items-center justify-center gap-3 bg-bible-gold hover:bg-yellow-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-yellow-900/20 hover:shadow-yellow-600/40 hover:-translate-y-1 w-full sm:w-auto"
            >
              <BookOpen className="w-6 h-6" />
              Abrir Escrituras
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};