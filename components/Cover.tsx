
import React from 'react';
import { BookOpen } from 'lucide-react';

interface CoverProps {
  imageSrc: string | null;
  onOpen: () => void;
}

export const Cover: React.FC<CoverProps> = ({ imageSrc, onOpen }) => {
  return (
    <div className="min-h-[100dvh] bg-stone-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
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

      <div className="relative z-10 max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-20 items-center content-center h-full py-6 md:py-0">
        
        {/* Left Side: The 3D Book */}
        <div className="flex justify-center items-center perspective-1000 order-2 md:order-1">
          <div 
            onClick={onOpen}
            className="relative w-[260px] h-[380px] xs:w-[300px] xs:h-[440px] sm:w-[380px] sm:h-[540px] md:w-[500px] md:h-[720px] lg:w-[600px] lg:h-[860px] rounded-r-lg shadow-[0_15px_30px_rgba(0,0,0,0.6)] transition-all duration-500 transform hover:rotate-y-[-5deg] hover:scale-105 cursor-pointer group"
            style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-10deg)' }}
          >
            {/* Book Spine */}
            <div className="absolute left-0 top-1 bottom-1 w-6 xs:w-8 sm:w-10 md:w-16 bg-gradient-to-r from-stone-800 to-stone-600 z-20 rounded-l-sm shadow-inner transform -translate-x-3 xs:-translate-x-4 sm:-translate-x-5 md:-translate-x-8 translate-z-[-2px] rotate-y-[-90deg]"></div>
            
            {/* Main Cover Image */}
            <div className="absolute inset-0 bg-stone-800 rounded-r-lg overflow-hidden border-r-2 border-stone-700/50">
                
                {/* Layer 1: Default Content (Always present below) */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex flex-col items-center justify-center p-4 sm:p-8 text-center border border-white/10">
                    <div className="border-2 border-yellow-600/30 p-4 sm:p-8 w-full h-full flex flex-col items-center justify-center relative">
                        {/* Decorative Corners */}
                        <div className="absolute top-2 left-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-yellow-600/20"></div>
                        <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-yellow-600/20"></div>
                        <div className="absolute bottom-2 left-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-yellow-600/20"></div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-yellow-600/20"></div>

                        {/* Traditional Cross Icon - CUSTOM SVG */}
                        <div className="flex-1 flex items-center justify-center w-full py-4 sm:py-8">
                            <div className="relative w-20 h-32 sm:w-24 sm:h-40 md:w-32 md:h-48 flex items-center justify-center drop-shadow-2xl filter hover:scale-[1.02] transition-transform duration-700">
                                <svg viewBox="0 0 200 300" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#FCD34D" /> {/* Amber 300 */}
                                            <stop offset="30%" stopColor="#F59E0B" /> {/* Amber 500 */}
                                            <stop offset="70%" stopColor="#B45309" /> {/* Amber 700 */}
                                            <stop offset="100%" stopColor="#78350F" /> {/* Amber 900 */}
                                        </linearGradient>
                                        <linearGradient id="metal-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#44403c" />
                                            <stop offset="50%" stopColor="#1c1917" />
                                            <stop offset="100%" stopColor="#0c0a09" />
                                        </linearGradient>
                                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="2" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                    </defs>

                                    <path d="M85 20 L115 20 L115 280 L85 280 Z" fill="url(#metal-dark)" />
                                    <path d="M30 85 L170 85 L170 115 L30 115 Z" fill="url(#metal-dark)" />

                                    <path d="
                                        M85 20 
                                        C 85 10, 115 10, 115 20 
                                        L 115 85 
                                        L 180 85 
                                        C 190 85, 190 115, 180 115 
                                        L 115 115 
                                        L 115 280 
                                        C 115 290, 85 290, 85 280 
                                        L 85 115 
                                        L 20 115 
                                        C 10 115, 10 85, 20 85 
                                        L 85 85 
                                        Z" 
                                        fill="none" 
                                        stroke="url(#gold-gradient)" 
                                        strokeWidth="4" 
                                        strokeLinejoin="round"
                                    />

                                    <path d="M100 30 L100 270 M40 100 L160 100" stroke="url(#gold-gradient)" strokeWidth="1.5" opacity="0.8" />
                                    <circle cx="100" cy="100" r="12" fill="url(#metal-dark)" stroke="url(#gold-gradient)" strokeWidth="3" />
                                    <circle cx="100" cy="100" r="4" fill="#FCD34D" />

                                    <path d="M100 15 L90 25 M100 15 L110 25" stroke="url(#gold-gradient)" strokeWidth="2" fill="none" />
                                    <path d="M100 285 L90 275 M100 285 L110 275" stroke="url(#gold-gradient)" strokeWidth="2" fill="none" />
                                    <path d="M15 100 L25 90 M15 100 L25 110" stroke="url(#gold-gradient)" strokeWidth="2" fill="none" />
                                    <path d="M185 100 L175 90 M185 100 L175 110" stroke="url(#gold-gradient)" strokeWidth="2" fill="none" />
                                </svg>
                            </div>
                        </div>
                        
                        <div className="mb-6 sm:mb-12">
                            <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-stone-200 mb-2 sm:mb-4 tracking-wide drop-shadow-lg">Bíblia Sagrada</h1>
                            <div className="w-16 sm:w-24 h-0.5 bg-yellow-600/40 mx-auto mb-2 sm:mb-4"></div>
                            <p className="text-stone-500 text-sm sm:text-lg uppercase tracking-widest font-serif">Edição Digital</p>
                            <p className="text-stone-600 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-sans mt-2 font-medium">Por Adriano Caffé</p>
                        </div>
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
        <div className="text-center md:text-left space-y-4 sm:space-y-8 order-1 md:order-2 md:-mt-32">
          <div>
            <h1 className="text-4xl xs:text-5xl md:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-400 font-bold mb-4 md:mb-6 tracking-tight leading-tight">
              Bíblia Sagrada
            </h1>
            <p className="text-stone-400 text-[10px] md:text-xs font-serif uppercase tracking-[0.25em] leading-loose font-bold max-w-lg mx-auto md:mx-0 border-l-0 md:border-l-2 border-stone-700 md:pl-6 px-4 md:px-0">
              Uma jornada espiritual aprimorada pela inteligência artificial. Explore os textos sagrados com profundidade e clareza.
            </p>
          </div>

          {/* Centered Button */}
          <div className="flex flex-col items-center justify-center pt-4 sm:pt-10">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-8 md:px-0">
                <button 
                onClick={onOpen}
                className="group flex items-center justify-center gap-3 bg-transparent border border-bible-gold/50 hover:bg-bible-gold text-bible-gold hover:text-white px-6 sm:px-8 py-3 rounded-sm transition-all duration-300 w-full sm:w-auto"
                >
                <BookOpen className="w-4 h-4" />
                <span className="font-serif text-xs font-bold uppercase tracking-[0.25em] pl-1">Abrir Escrituras</span>
                </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
