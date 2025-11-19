
import React, { useMemo, useState } from 'react';
import { Book, Testament } from '../types';
import { BIBLE_BOOKS } from '../constants';
import { Search, BookOpen, ChevronDown, ChevronRight, X, Settings, Home } from 'lucide-react';

interface SidebarProps {
  currentBook: Book;
  currentChapter: number;
  onSelect: (book: Book, chapter: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  coverImage: string | null;
  onBackToCover: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentBook, 
  currentChapter, 
  onSelect, 
  isOpen, 
  onClose,
  onOpenSettings,
  coverImage,
  onBackToCover
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTestament, setExpandedTestament] = useState<Testament | null>(Testament.NEW);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const groupedBooks = useMemo(() => {
    return {
      [Testament.OLD]: filteredBooks.filter(b => b.testament === Testament.OLD),
      [Testament.NEW]: filteredBooks.filter(b => b.testament === Testament.NEW)
    };
  }, [filteredBooks]);

  const toggleTestament = (t: Testament) => {
    setExpandedTestament(expandedTestament === t ? null : t);
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm bg-white border-r border-stone-200 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-72 flex flex-col shadow-2xl lg:shadow-none`}>
      
      {/* Header */}
      <div className="relative cursor-pointer" onClick={onBackToCover} title="Voltar para capa">
        <div className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${coverImage ? 'opacity-100' : 'opacity-0'}`}>
            {coverImage && (
                <>
                    <img key={coverImage} src={coverImage} alt="" className="w-full h-full object-cover opacity-20 blur-[2px] animate-fadeIn" />
                    <div className="absolute inset-0 bg-gradient-to-b from-stone-900/10 to-white/90"></div>
                </>
            )}
        </div>
        <div className={`p-4 border-b border-stone-200 flex justify-between items-center relative z-10 ${coverImage ? 'bg-stone-900/5 text-stone-800' : 'bg-stone-50'}`}>
          <div className="flex items-center gap-2 font-bold text-xl font-serif text-bible-leather">
            <div className="w-8 h-8 rounded bg-bible-gold flex items-center justify-center text-white shadow-sm">
                <BookOpen className="w-5 h-5" />
            </div>
            <span>Bíblia Sagrada</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="lg:hidden p-2 hover:bg-stone-200 rounded-full -mr-2">
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-stone-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar livro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-stone-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-bible-gold outline-none placeholder-stone-400"
          />
        </div>
      </div>

      {/* Book List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {Object.values(Testament).map((testament) => (
          <div key={testament}>
            <button 
              onClick={() => toggleTestament(testament)}
              className="w-full px-4 py-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 border-b border-stone-100 transition-colors"
            >
              <span className="font-semibold text-stone-700 text-sm uppercase tracking-wider">{testament}</span>
              {expandedTestament === testament ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {expandedTestament === testament && (
              <div className="bg-white">
                {groupedBooks[testament].map((book) => (
                  <div key={book.name} className="border-b border-stone-50 last:border-0">
                    <details className="group">
                      <summary className={`px-6 py-3 cursor-pointer list-none hover:bg-stone-50 flex justify-between items-center ${currentBook.name === book.name ? 'text-bible-gold font-semibold' : 'text-stone-600'}`}>
                        <span>{book.name}</span>
                        <span className="text-xs text-stone-400">{book.chapters}</span>
                      </summary>
                      <div className="px-6 py-3 grid grid-cols-5 gap-3 bg-stone-50">
                        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => (
                          <button
                            key={chapter}
                            onClick={() => {
                              onSelect(book, chapter);
                              if (window.innerWidth < 1024) onClose();
                            }}
                            className={`aspect-square flex items-center justify-center text-sm rounded hover:bg-bible-gold hover:text-white transition-colors p-2 ${
                              currentBook.name === book.name && currentChapter === chapter
                                ? 'bg-bible-gold text-white shadow-md'
                                : 'bg-white text-stone-600 border border-stone-200'
                            }`}
                          >
                            {chapter}
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-2">
         <button 
            onClick={onBackToCover}
            className="flex items-center gap-2 text-stone-600 hover:text-bible-leather transition-colors text-sm font-medium w-full px-2 py-3 rounded hover:bg-stone-100"
        >
            <Home className="w-4 h-4" />
            <span>Fechar Livro (Ir para Capa)</span>
        </button>
        <button 
            onClick={onOpenSettings}
            className="flex items-center gap-2 text-stone-600 hover:text-bible-leather transition-colors text-sm font-medium w-full px-2 py-3 rounded hover:bg-stone-100"
        >
            <Settings className="w-4 h-4" />
            <span>Configurações da Capa</span>
        </button>
      </div>
    </div>
  );
};
