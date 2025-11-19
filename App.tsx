import React, { useState, useEffect, useCallback } from 'react';
import { Book, BibleState } from './types';
import { BIBLE_BOOKS } from './constants';
import { Sidebar } from './components/Sidebar';
import { Reader } from './components/Reader';
import { AiSidebar } from './components/AiSidebar';
import { SettingsModal } from './components/SettingsModal';
import { Cover } from './components/Cover';
import { fetchChapterContent } from './services/geminiService';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCover, setShowCover] = useState(true);
  
  const [state, setState] = useState<BibleState>({
    currentBook: BIBLE_BOOKS[0], // Genesis
    currentChapter: 1,
    isLoading: true,
    content: null,
    error: null,
    isSidebarOpen: false,
    isAiPanelOpen: false
  });

  // Initial Load
  useEffect(() => {
    loadChapter(state.currentBook, state.currentChapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChapter = useCallback(async (book: Book, chapter: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, currentBook: book, currentChapter: chapter, isSidebarOpen: false }));
    
    try {
      const content = await fetchChapterContent(book.name, chapter);
      
      setState(prev => {
        // Prevenção de Race Condition:
        // Verifica se o usuário ainda está no livro/capítulo que foi solicitado.
        // Se ele mudou de página rapidamente enquanto carregava, ignoramos este resultado antigo.
        if (prev.currentBook.name !== book.name || prev.currentChapter !== chapter) {
            return prev;
        }

        return {
            ...prev,
            isLoading: false,
            content: {
            book: book.name,
            chapter: chapter,
            verses: content.verses,
            summary: content.summary
            }
        };
      });
    } catch (err) {
      setState(prev => {
        // Ignora erros de requisições que não são mais relevantes
        if (prev.currentBook.name !== book.name || prev.currentChapter !== chapter) {
            return prev;
        }

        return {
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : "Erro desconhecido ao carregar capítulo."
        };
      });
    }
  }, []);

  const handleNavigation = (delta: number) => {
    const { currentBook, currentChapter } = state;
    
    let newChapter = currentChapter + delta;
    let newBook = currentBook;

    if (newChapter > currentBook.chapters) {
      // Next book
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.name === currentBook.name);
      if (currentIndex < BIBLE_BOOKS.length - 1) {
        newBook = BIBLE_BOOKS[currentIndex + 1];
        newChapter = 1;
      } else {
        return; // End of Bible
      }
    } else if (newChapter < 1) {
      // Previous book
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.name === currentBook.name);
      if (currentIndex > 0) {
        newBook = BIBLE_BOOKS[currentIndex - 1];
        newChapter = newBook.chapters;
      } else {
        return; // Start of Bible
      }
    }

    loadChapter(newBook, newChapter);
  };

  if (showCover) {
    return (
      <>
        <Cover 
          imageSrc={coverImage} 
          onOpen={() => setShowCover(false)} 
        />
        {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentCover={coverImage}
            onUpdateCover={setCoverImage}
          />
        )}
      </>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-stone-100">
      
      {/* Mobile Header for Menu Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
            onClick={() => setState(prev => ({...prev, isSidebarOpen: true}))}
            className="p-2 bg-white rounded-lg shadow text-stone-700 hover:bg-stone-50"
        >
            <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <Sidebar 
        currentBook={state.currentBook}
        currentChapter={state.currentChapter}
        isOpen={state.isSidebarOpen}
        onClose={() => setState(prev => ({...prev, isSidebarOpen: false}))}
        onSelect={loadChapter}
        onOpenSettings={() => {
          setState(prev => ({...prev, isSidebarOpen: false}));
          setIsSettingsOpen(true);
        }}
        coverImage={coverImage}
        onBackToCover={() => setShowCover(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex relative">
        <Reader 
            state={state} 
            onChapterChange={handleNavigation}
            onToggleAI={() => setState(prev => ({...prev, isAiPanelOpen: !prev.isAiPanelOpen}))}
        />
      </main>

      {/* AI Sidebar */}
      <AiSidebar 
        isOpen={state.isAiPanelOpen} 
        onClose={() => setState(prev => ({...prev, isAiPanelOpen: false}))}
        context={state.content ? `${state.currentBook.name} Capítulo ${state.currentChapter}: ${state.content.summary}` : 'Bíblia Sagrada'}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentCover={coverImage}
          onUpdateCover={setCoverImage}
        />
      )}
      
      {/* Overlay for mobile sidebar */}
      {(state.isSidebarOpen || state.isAiPanelOpen) && (
        <div 
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setState(prev => ({...prev, isSidebarOpen: false, isAiPanelOpen: false}))}
        />
      )}
    </div>
  );
};

export default App;