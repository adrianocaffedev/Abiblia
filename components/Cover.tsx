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
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${imageSrc ? 'opacity-100' : 'opacity-0'}`}>
          {imageSrc && (
            <div className="absolute inset-0 opacity-20 scale-110 blur-xl z-0 pointer-events-none">
                <img 
                    key={imageSrc} 
                    src={imageSrc} 
                    alt="" 
                    className="w-full h-full object-cover animate-fadeIn" 
                />
            </div>
          )}
      </div>

      <div className="relative z-10 max-w-7xl w-full grid md:grid-cols-2 gap-8 md:gap-20 items-center">
        
        {/* Left Side: The 3D Book */}
        <div className="flex justify-center items-center perspective-1000 order-2 md:order-1">
          <div 
            onClick={onOpen}
            className="relative w-[380px] h-[540px] md:w-[600px] md:h-[860px] rounded-r-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 transform hover:rotate-y-[-5deg] hover:scale-105 cursor-pointer group"
            style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg)' }}
          >
            {/* Book Spine */}
            <div className="absolute left-0 top-1 bottom-1 w-10 md:w-16 bg-gradient-to-r from-stone-800 to-stone-600 z-20 rounded-l-sm shadow-inner transform -translate-x-5 md:-translate-x-8 translate-z-[-2px] rotate-y-[-90deg]"></div>
            
            {/* Main Cover Image */}
            <div className="absolute inset-0 bg-stone-800 rounded-r-lg overflow-hidden border-r-2 border-stone-700/50">
                
                {/* Layer 1: Default Content (Always present below) */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex flex-col items-center justify-center p-8 text-center border border-white/10">
                    <div className="border-2 border-yellow-600/30 p-8 w-full h-full flex flex-col items-center justify-center">
                        <Sparkles className="w-20 h-20 text-yellow-600/50 mb-8" />
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-stone-200 mb-4">Bíblia Sagrada</h1>
                        <p className="text-stone-500 text-lg uppercase tracking-widest">Edição Digital AI</p>
                    </div>
                </div>

                {/* Layer 2: Dynamic Image with Fade Transition */}
                <div className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${imageSrc ? 'opacity-100' : 'opacity-0'}`}>
                    {imageSrc && (
                        <img 
                            key={imageSrc} 
                            src={imageSrc} 
                            alt="Capa da Bíblia" 
                            className="w-full h-full object-cover animate-fadeIn"
                        />
                    )}
                </div>
                
                {/* Sheen Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10 pointer-events-none mix-blend-overlay"></div>
            </div>
          </div>
        </div>

        {/* Right Side: Welcome Text & Actions */}
        <div className="text-center md:text-left space-y-8 order-1 md:order-2 md:-mt-32">
          <div>
            <h1 className="text-5xl md:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-400 font-bold mb-6 tracking-tight leading-tight">
              Bíblia Sagrada
            </h1>
            <p className="text-stone-400 text-lg md:text-2xl font-light leading-relaxed max-w-lg mx-auto md:mx-0">
              Uma jornada espiritual aprimorada pela inteligência artificial. Explore os textos sagrados com profundidade e clareza.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-6">
            <button 
              onClick={onOpen}
              className="group flex items-center justify-center gap-3 bg-transparent border border-bible-gold/50 hover:bg-bible-gold text-bible-gold hover:text-white px-5 py-2.5 rounded-full transition-all duration-300 w-full sm:w-auto"
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-serif text-xs font-medium uppercase tracking-[0.25em] pl-1">Abrir Escrituras</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};