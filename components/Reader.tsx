
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BibleState, Verse } from '../types';
import { AVAILABLE_VOICES } from '../constants';
import { Loader2, ArrowLeft, ArrowRight, MessageCircleQuestion, Play, Pause, Volume2, Mic2, ChevronDown, AlertTriangle, X, PlayCircle } from 'lucide-react';
import { getVerseAudio } from '../services/geminiService';

interface ReaderProps {
  state: BibleState;
  onChapterChange: (delta: number) => void;
  onToggleAI: () => void;
}

// Helper para decodificar PCM (Raw Audio) do Gemini
async function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Reader: React.FC<ReaderProps> = ({ state, onChapterChange, onToggleAI }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVerseNum, setActiveVerseNum] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0]);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false); 
  const versesRef = useRef<Verse[]>([]);
  const currentVerseIndexRef = useRef<number>(0);
  
  // Smart Audio Queue / Cache
  const audioCacheRef = useRef<Map<number, Promise<AudioBuffer>>>(new Map());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    stopAudio();
    audioCacheRef.current.clear();
    setAudioError(null);
  }, [state.currentBook, state.currentChapter]);

  useEffect(() => {
    if (state.content?.verses) {
        versesRef.current = state.content.verses;
    }
  }, [state.content]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleVoiceChange = (voice: typeof AVAILABLE_VOICES[0]) => {
      setSelectedVoice(voice);
      setShowVoiceMenu(false);
      // Reinicia áudio se estiver tocando para aplicar nova voz
      if (isPlaying) {
          stopAudio();
          audioCacheRef.current.clear();
          // Pequeno delay para permitir o stop limpar o estado
          setTimeout(() => playChapter(currentVerseIndexRef.current), 100);
      } else {
          audioCacheRef.current.clear();
      }
  };

  const initAudioContext = () => {
      if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
  };

  const stopAudio = () => {
    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        sourceRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setActiveVerseNum(null);
    setLoadingAudio(false);
  };

  const pauseAudio = () => {
      if (sourceRef.current) {
          try { sourceRef.current.stop(); } catch(e) {}
          sourceRef.current = null;
      }
      // Não resetamos isPlayingRef totalmente, apenas o estado visual e o node
      setIsPaused(true);
      isPlayingRef.current = false; // Para o loop de playChapter
  };

  const resumeAudio = () => {
      setIsPaused(false);
      playChapter(currentVerseIndexRef.current);
  };

  const fetchAndDecodeAudio = (text: string, index: number): Promise<AudioBuffer> => {
    if (audioCacheRef.current.has(index)) {
        return audioCacheRef.current.get(index)!;
    }

    const promise = (async () => {
        const ctx = initAudioContext();
        const base64 = await getVerseAudio(text, selectedVoice.id);
        
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

        return await decodePCM(bytes, ctx);
    })();

    audioCacheRef.current.set(index, promise);
    return promise;
  };

  const playAudioBuffer = (buffer: AudioBuffer, verseNumber: number, onComplete?: () => void) => {
      if (!isPlayingRef.current) return;

      const ctx = initAudioContext();
      if (sourceRef.current) {
          try { sourceRef.current.stop(); } catch(e) {}
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      setActiveVerseNum(verseNumber);
      
      source.onended = () => {
          sourceRef.current = null;
          // Se o usuário pausou durante a reprodução, não prosseguir
          if (onComplete && isPlayingRef.current && !isPaused) {
              onComplete();
          } else if (!onComplete && !isPaused) {
              // Fim natural
              setIsPlaying(false);
              setActiveVerseNum(null);
              isPlayingRef.current = false;
          }
      };

      sourceRef.current = source;
      
      // Scroll logic - suave e centralizado
      const element = document.getElementById(`verse-${verseNumber}`);
      if (element) {
          // Verifica se o elemento já está visível para evitar scroll desnecessário
          const rect = element.getBoundingClientRect();
          const isVisible = (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
          );
          
          if (!isVisible) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }

      source.start(0);
  };

  const prefetchUpcoming = (currentIndex: number) => {
      const verses = versesRef.current;
      // Reduzido de 3 para 1 para evitar erro de "Too Many Requests" e sobrecarga
      const LOOKAHEAD = 1;
      
      for (let i = 1; i <= LOOKAHEAD; i++) {
          const nextIndex = currentIndex + i;
          if (nextIndex < verses.length) {
              if (!audioCacheRef.current.has(nextIndex)) {
                  fetchAndDecodeAudio(verses[nextIndex].text, nextIndex)
                    .catch(e => console.warn(`Background prefetch failed`, e));
              }
          }
      }
  };

  const playChapter = useCallback(async (startIndex = 0) => {
    const verses = versesRef.current;
    
    // Limite de segurança
    if (!verses || startIndex >= verses.length) {
        stopAudio();
        return;
    }

    currentVerseIndexRef.current = startIndex;
    setAudioError(null);

    // Inicializa o estado de reprodução se ainda não estiver tocando
    if (!isPlayingRef.current) {
        setIsPlaying(true);
        isPlayingRef.current = true;
        initAudioContext();
    }

    const currentVerse = verses[startIndex];
    
    if (!audioCacheRef.current.has(startIndex)) {
        setLoadingAudio(true);
    }

    try {
        prefetchUpcoming(startIndex);
        const audioBuffer = await fetchAndDecodeAudio(currentVerse.text, startIndex);

        if (!isPlayingRef.current) return; // Usuário parou enquanto carregava
        setLoadingAudio(false);

        playAudioBuffer(audioBuffer, currentVerse.number, () => {
            if (isPlayingRef.current) {
                playChapter(startIndex + 1);
            }
        });

    } catch (error: any) {
        console.error("Erro no fluxo de leitura:", error);
        setLoadingAudio(false);
        
        // Se falhar, mas não foi o usuário que parou, tenta mostrar o erro
        if (isPlayingRef.current) {
            stopAudio();
            setAudioError("Erro ao gerar áudio. Tente novamente em instantes.");
        }
    }
  }, [selectedVoice]);

  const playFromVerse = (verse: Verse, index: number) => {
      if (activeVerseNum === verse.number && isPlaying) {
          if (isPaused) resumeAudio();
          else pauseAudio();
          return;
      }
      stopAudio();
      // Pequeno timeout para garantir limpeza
      setTimeout(() => playChapter(index), 50);
  };

  const toggleWholeChapter = () => {
      if (isPlaying) {
          if (isPaused) resumeAudio();
          else pauseAudio();
      } else {
          playChapter(0);
      }
  };

  if (state.isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-bible-paper">
        <Loader2 className="w-12 h-12 text-bible-gold animate-spin mb-4" />
        <p className="text-stone-500 animate-pulse font-serif text-center px-4">Carregando texto bíblico...</p>
      </div>
    );
  }

  if (state.error) {
    const isApiKeyError = state.error.includes('MISSING_API_KEY') || state.error.includes('API Key') || state.error.includes('configurada');

    return (
      <div className="flex-1 flex items-center justify-center bg-bible-paper p-8 text-center">
        <div className="max-w-md bg-white p-6 rounded-lg shadow-lg border border-stone-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-800 mb-2">Atenção Necessária</h3>
          
          {isApiKeyError ? (
            <div className="text-left space-y-3 text-sm text-stone-600 mb-6">
                <p className="font-medium text-red-600 text-center">Chave de API não detectada.</p>
                <p>O sistema de build (Vite) pode ter ignorado a chave antiga. Tente:</p>
                <ol className="list-decimal list-inside space-y-2 bg-stone-50 p-3 rounded">
                    <li>Vá ao painel do <strong>Vercel</strong> {'>'} <strong>Environment Variables</strong>.</li>
                    <li>
                        Crie uma variável chamada:
                        <code className="ml-1 bg-stone-200 p-0.5 rounded text-xs font-mono font-bold text-stone-800">VITE_API_KEY</code>
                    </li>
                    <li>Cole sua chave do Google AI Studio nela.</li>
                    <li>Faça um <strong>Redeploy</strong>.</li>
                </ol>
            </div>
          ) : (
            <p className="text-stone-600 mb-4">{state.error}</p>
          )}
          
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-bible-leather text-white rounded hover:bg-stone-800 transition-colors"
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
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-bible-paper/95 backdrop-blur border-b border-stone-200 p-2 md:p-4 flex justify-between items-center shadow-sm gap-2">
         {/* Spacer for menu button */}
         <div className="w-8 lg:hidden"></div>
         
         <div className="flex items-baseline gap-2 overflow-hidden flex-1">
            <h2 className="text-lg md:text-2xl font-bold font-serif text-bible-ink truncate">
                {state.currentBook.name}
            </h2>
            <span className="text-bible-gold text-xl md:text-3xl font-serif">{state.currentChapter}</span>
         </div>
         
         <div className="flex items-center gap-2 md:gap-3">
            
            {/* Voice Selector - Desktop */}
            <div className="relative hidden md:block">
                <button 
                    onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 border border-stone-200 transition-colors"
                >
                    <Mic2 className="w-3 h-3" />
                    <span className="text-xs font-medium">{selectedVoice.name}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </button>

                {showVoiceMenu && (
                    <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowVoiceMenu(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-100 z-20 py-1 overflow-hidden">
                        {AVAILABLE_VOICES.map(voice => (
                            <button
                                key={voice.id}
                                onClick={() => handleVoiceChange(voice)}
                                className={`w-full text-left px-4 py-2.5 text-sm flex flex-col hover:bg-stone-50 transition-colors ${selectedVoice.id === voice.id ? 'bg-bible-gold/5 text-bible-leather border-l-4 border-bible-gold' : 'text-stone-600'}`}
                            >
                                <span className="font-medium flex items-center gap-2">
                                    {voice.name} 
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">{voice.gender}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    </>
                )}
            </div>

            {/* AI Button */}
            <button 
                onClick={onToggleAI}
                className="flex items-center gap-2 px-3 py-2 md:py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
                <MessageCircleQuestion className="w-4 h-4" />
                <span className="hidden md:inline">AI</span>
            </button>
         </div>
      </div>

      {/* Content Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-12 max-w-4xl mx-auto w-full pb-20 scroll-smooth">
        
        {/* Top Actions: Play Chapter Button */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <button
                onClick={toggleWholeChapter}
                className={`w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all transform active:scale-95 shadow-sm ${
                    isPlaying 
                    ? 'bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200' 
                    : 'bg-bible-leather text-white hover:bg-stone-800 hover:shadow-lg'
                }`}
            >
                {isPlaying && !isPaused ? (
                    <>
                        {loadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pause className="w-5 h-5" />}
                        <span>Pausar Leitura</span>
                    </>
                ) : (
                    <>
                        {isPlaying && isPaused ? <Play className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                        <span>{isPlaying && isPaused ? "Continuar Leitura" : "Ouvir Capítulo"}</span>
                    </>
                )}
            </button>

            {/* Mobile Voice Selector */}
            <div className="md:hidden w-full">
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {AVAILABLE_VOICES.map(voice => (
                        <button
                            key={voice.id}
                            onClick={() => handleVoiceChange(voice)}
                            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs border transition-all ${
                                selectedVoice.id === voice.id
                                ? 'bg-bible-leather text-white border-bible-leather shadow-md'
                                : 'bg-white text-stone-600 border-stone-200'
                            }`}
                        >
                            {voice.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* AI Summary Banner */}
        {state.content.summary && (
            <div className="mb-6 md:mb-8 p-4 md:p-6 bg-stone-100 rounded-xl border-l-4 border-bible-gold italic text-stone-600 font-serif text-sm leading-relaxed">
                <span className="block font-bold text-bible-gold mb-1 not-italic text-xs uppercase tracking-widest">Resumo do Capítulo</span>
                {state.content.summary}
            </div>
        )}

        {/* Verses */}
        <div className="space-y-2">
            {state.content.verses.map((verse, index) => (
                <div 
                    id={`verse-${verse.number}`}
                    key={verse.number} 
                    className={`relative group rounded-lg transition-all duration-500 border ${
                        activeVerseNum === verse.number 
                        ? 'bg-bible-gold/10 border-bible-gold/30 py-4 px-3 -mx-3 md:px-4 md:-mx-4 shadow-md' 
                        : 'bg-transparent border-transparent hover:bg-stone-50 py-1'
                    }`}
                >
                    <p className="text-lg md:text-xl leading-loose font-serif text-bible-ink relative text-justify md:text-left pl-8 md:pl-0">
                        {/* Play Button: Visible on Mobile (inline-flex), Absolute on Desktop */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                playFromVerse(verse, index);
                            }}
                            className={`
                                absolute left-0 top-2 md:-left-10 md:top-1.5
                                inline-flex items-center justify-center p-1.5 rounded-full transition-all z-10
                                ${activeVerseNum === verse.number 
                                    ? 'text-bible-leather bg-white shadow-sm opacity-100' 
                                    : 'text-stone-400 hover:text-bible-gold md:opacity-0 md:group-hover:opacity-100 bg-stone-50 md:bg-transparent'
                                }
                            `}
                            title="Ouvir a partir deste versículo"
                        >
                            {activeVerseNum === verse.number && !isPaused ? (
                                loadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />
                            ) : (
                                <Play className="w-4 h-4 ml-0.5" />
                            )}
                        </button>

                        <sup className={`text-xs font-bold mr-2 select-none font-sans transition-colors ${
                            activeVerseNum === verse.number ? 'text-bible-leather' : 'text-bible-gold'
                        }`}>
                            {verse.number}
                        </sup>
                        {verse.text}
                    </p>
                </div>
            ))}
        </div>

        {/* Navigation Footer */}
        <div className="mt-12 pt-6 border-t border-stone-200 flex justify-between items-center pb-8">
            <button 
                onClick={() => onChapterChange(-1)}
                disabled={state.currentBook.name === 'Gênesis' && state.currentChapter === 1}
                className="flex items-center gap-2 px-4 py-3 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-bible-leather disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-1 md:flex-none justify-center md:justify-start mr-2"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-sans font-medium hidden xs:inline">Anterior</span>
            </button>

            <span className="text-stone-400 text-xs font-sans hidden md:block">
                {state.currentBook.name} {state.currentChapter}
            </span>

            <button 
                onClick={() => onChapterChange(1)}
                disabled={state.currentBook.name === 'Apocalipse' && state.currentChapter === 22}
                className="flex items-center gap-2 px-4 py-3 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-bible-leather disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-1 md:flex-none justify-center md:justify-end ml-2"
            >
                <span className="font-sans font-medium hidden xs:inline">Próximo</span>
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Error Toast */}
      {audioError && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg shadow-lg z-50 animate-fadeIn flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
                <p className="font-bold mb-1">Erro de Áudio</p>
                <p>{audioError}</p>
            </div>
            <button onClick={() => setAudioError(null)} className="text-red-400 hover:text-red-700">
                <X className="w-4 h-4" />
            </button>
          </div>
      )}
    </div>
  );
};
