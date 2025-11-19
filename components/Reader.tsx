
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BibleState, Verse } from '../types';
import { AVAILABLE_VOICES } from '../constants';
import { Loader2, ArrowLeft, ArrowRight, MessageCircleQuestion, Play, Square, Volume2, Mic2, ChevronDown } from 'lucide-react';
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
      // Normaliza de Int16 (-32768 a 32767) para Float32 (-1.0 a 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Reader: React.FC<ReaderProps> = ({ state, onChapterChange, onToggleAI }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVerseNum, setActiveVerseNum] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0]);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  
  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false); 
  const versesRef = useRef<Verse[]>([]);
  
  // Smart Audio Queue / Cache
  // Armazena promessas de áudio para evitar download duplicado e permitir prefetch
  const audioCacheRef = useRef<Map<number, Promise<AudioBuffer>>>(new Map());

  // Scroll to top when chapter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    stopAudio();
    audioCacheRef.current.clear(); // Limpa cache ao mudar capítulo
  }, [state.currentBook, state.currentChapter]);

  // Update verses ref
  useEffect(() => {
    if (state.content?.verses) {
        versesRef.current = state.content.verses;
    }
  }, [state.content]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Change Voice Handler
  const handleVoiceChange = (voice: typeof AVAILABLE_VOICES[0]) => {
      setSelectedVoice(voice);
      setShowVoiceMenu(false);
      if (isPlaying) {
          stopAudio();
          audioCacheRef.current.clear(); // Limpa cache pois a voz mudou
          // Opcional: Reiniciar leitura ou esperar usuário dar play
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
    setActiveVerseNum(null);
    setLoadingAudio(false);
    // Nota: Não limpamos o cache de áudio aqui para permitir retomar rapidamente se o usuário pausou
  };

  // Busca e decodifica o áudio (com cache)
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

  // Toca um buffer
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
          if (onComplete && isPlayingRef.current) {
              onComplete();
          } else if (!onComplete) {
              setIsPlaying(false);
              setActiveVerseNum(null);
              isPlayingRef.current = false;
          }
      };

      sourceRef.current = source;
      
      const element = document.getElementById(`verse-${verseNumber}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      source.start(0);
  };

  // "Smart Buffer" Logic
  const prefetchUpcoming = (currentIndex: number) => {
      const verses = versesRef.current;
      // Olha 3 versículos à frente
      const LOOKAHEAD = 3;
      
      for (let i = 1; i <= LOOKAHEAD; i++) {
          const nextIndex = currentIndex + i;
          if (nextIndex < verses.length) {
              // Dispara o fetch e armazena no cache map se não existir
              if (!audioCacheRef.current.has(nextIndex)) {
                  fetchAndDecodeAudio(verses[nextIndex].text, nextIndex)
                    .catch(e => console.warn(`Background prefetch failed for verse ${verses[nextIndex].number}`, e));
              }
          }
      }
  };

  // Loop de leitura principal
  const playChapter = useCallback(async (startIndex = 0) => {
    const verses = versesRef.current;
    if (!verses || startIndex >= verses.length) {
        stopAudio();
        return;
    }

    if (startIndex === 0) {
        setIsPlaying(true);
        isPlayingRef.current = true;
        initAudioContext();
    }

    const currentVerse = verses[startIndex];
    
    // Mostra loading apenas se não tivermos o audio em cache ainda
    if (!audioCacheRef.current.has(startIndex)) {
        setLoadingAudio(true);
    }

    try {
        // 1. Dispara prefetch dos próximos IMEDIATAMENTE
        prefetchUpcoming(startIndex);

        // 2. Obtém audio atual (do cache ou espera terminar de baixar)
        const audioBuffer = await fetchAndDecodeAudio(currentVerse.text, startIndex);

        // Verificação de segurança
        if (!isPlayingRef.current) return;
        setLoadingAudio(false);

        // 3. Toca
        playAudioBuffer(audioBuffer, currentVerse.number, () => {
            if (isPlayingRef.current) {
                // Recursão para o próximo
                playChapter(startIndex + 1);
            }
        });

    } catch (error) {
        console.error("Erro no fluxo de leitura:", error);
        if (isPlayingRef.current) {
             // Retry simples: espera um pouco e tenta o próximo
             setTimeout(() => playChapter(startIndex + 1), 1000);
        } else {
            stopAudio();
        }
    }
  }, [selectedVoice]); // Recria função se a voz mudar

  const togglePlayChapter = () => {
    if (isPlaying) {
        stopAudio();
    } else {
        playChapter(0);
    }
  };

  const playSpecificVerse = async (verse: Verse, index: number) => {
      if (activeVerseNum === verse.number && isPlaying) {
          stopAudio();
          return;
      }
      stopAudio();
      initAudioContext();
      
      setIsPlaying(true);
      isPlayingRef.current = true;
      setLoadingAudio(true);
      setActiveVerseNum(verse.number);

      try {
          const buffer = await fetchAndDecodeAudio(verse.text, index);
          setLoadingAudio(false);
          playAudioBuffer(buffer, verse.number);
      } catch (e) {
          console.error(e);
          stopAudio();
      }
  };

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
      {/* Top Bar inside Reader */}
      <div className="sticky top-0 z-10 bg-bible-paper/95 backdrop-blur border-b border-stone-200 p-2 md:p-4 flex justify-between items-center shadow-sm gap-2">
         {/* Left side spacer for menu button on mobile */}
         <div className="w-8 lg:hidden"></div>
         
         <div className="flex items-baseline gap-2 overflow-hidden flex-1">
            <h2 className="text-lg md:text-2xl font-bold font-serif text-bible-ink truncate">
                {state.currentBook.name}
            </h2>
            <span className="text-bible-gold text-xl md:text-3xl font-serif">{state.currentChapter}</span>
         </div>
         
         <div className="flex items-center gap-1 md:gap-3">
            
            {/* Voice Selector */}
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
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100">
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Selecione a Voz</p>
                        </div>
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
                                <span className="text-xs text-stone-400 mt-0.5">{voice.style}</span>
                            </button>
                        ))}
                    </div>
                    </>
                )}
            </div>

            {/* Audio Control */}
            <button 
                onClick={togglePlayChapter}
                className={`flex items-center gap-2 px-3 py-2 md:py-1.5 text-sm rounded-full transition-all border ${
                    isPlaying && !activeVerseNum 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                }`}
                title={isPlaying ? "Parar Leitura" : "Ouvir Capítulo"}
            >
                {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span className="hidden sm:inline font-medium">{isPlaying ? "Parar" : "Ouvir"}</span>
            </button>

            {/* AI Button */}
            <button 
                onClick={onToggleAI}
                className="flex items-center gap-2 px-3 py-2 md:py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
                <MessageCircleQuestion className="w-4 h-4" />
                <span className="hidden sm:inline">AI</span>
            </button>
         </div>
      </div>

      {/* Content Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-12 max-w-4xl mx-auto w-full pb-32">
        
        {/* Mobile Voice Selector (Visible only on mobile) */}
        <div className="md:hidden mb-6">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Voz da Narração</label>
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
                        {voice.name} ({voice.gender.charAt(0)})
                    </button>
                ))}
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
        <div className="space-y-1">
            {state.content.verses.map((verse, index) => (
                <div 
                    id={`verse-${verse.number}`}
                    key={verse.number} 
                    className={`relative group rounded-lg transition-all duration-500 ${
                        activeVerseNum === verse.number 
                        ? 'bg-bible-gold/15 py-4 px-3 -mx-3 md:px-4 md:-mx-4 shadow-sm ring-1 ring-bible-gold/20' 
                        : 'hover:bg-stone-50 py-1'
                    }`}
                >
                    <p className="text-lg md:text-xl leading-loose font-serif text-bible-ink relative text-justify md:text-left">
                        {/* Verse Number */}
                        <sup className={`text-xs font-bold mr-2 select-none font-sans transition-colors ${
                            activeVerseNum === verse.number ? 'text-bible-leather' : 'text-bible-gold'
                        }`}>
                            {verse.number}
                        </sup>
                        
                        {/* Text */}
                        {verse.text}

                        {/* Inline Play Button (Visible on Hover or Active) */}
                        <button
                            onClick={() => playSpecificVerse(verse, index)}
                            className={`absolute -left-8 top-1.5 p-1.5 rounded-full transition-opacity ${
                                activeVerseNum === verse.number ? 'opacity-100 text-bible-leather' : 'opacity-0 group-hover:opacity-100 text-stone-400 hover:text-bible-gold'
                            } hidden md:inline-flex`}
                            title="Ouvir este versículo"
                        >
                            {activeVerseNum === verse.number ? (
                                loadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4 animate-pulse" />
                            ) : (
                                <Play className="w-3 h-3" />
                            )}
                        </button>
                    </p>
                </div>
            ))}
        </div>

        {/* Navigation Footer */}
        <div className="mt-12 pt-6 border-t border-stone-200 flex justify-between items-center pb-8">
            <button 
                onClick={() => onChapterChange(-1)}
                disabled={state.currentBook.name === 'Gênesis' && state.currentChapter === 1}
                className="flex items-center gap-2 px-4 py-3 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-bible-leather disabled:opacity-30 disabled:cursor-not-allowed transition-colors group flex-1 md:flex-none justify-center md:justify-start mr-2"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-sans font-medium">Anterior</span>
            </button>

            <span className="text-stone-400 text-xs font-sans hidden md:block">
                {state.currentBook.name} {state.currentChapter}
            </span>

            <button 
                onClick={() => onChapterChange(1)}
                disabled={state.currentBook.name === 'Apocalipse' && state.currentChapter === 22}
                className="flex items-center gap-2 px-4 py-3 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-bible-leather disabled:opacity-30 disabled:cursor-not-allowed transition-colors group flex-1 md:flex-none justify-center md:justify-end ml-2"
            >
                <span className="font-sans font-medium">Próximo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
      </div>
    </div>
  );
};
