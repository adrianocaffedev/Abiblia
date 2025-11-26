import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, FileText, Calendar } from 'lucide-react';
import { Note } from '../types';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookName: string;
  currentChapter: number;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ isOpen, onClose, currentBookName, currentChapter }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Carregar notas do localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('user_notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Erro ao carregar notas", e);
      }
    }
  }, []);

  // Salvar notas no localStorage sempre que mudarem
  const saveNotesToStorage = (updatedNotes: Note[]) => {
    localStorage.setItem('user_notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const handleAddNote = () => {
    if (!currentNoteText.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      bookName: currentBookName,
      chapter: currentChapter,
      text: currentNoteText,
      createdAt: Date.now(),
    };

    saveNotesToStorage([newNote, ...notes]);
    setCurrentNoteText('');
    setIsEditing(false);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta anotação?')) {
        const updated = notes.filter(n => n.id !== id);
        saveNotesToStorage(updated);
    }
  };

  const filteredNotes = notes.filter(n => n.bookName === currentBookName && n.chapter === currentChapter);

  return (
    <div className={`fixed inset-y-0 right-0 z-[55] w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-stone-200`}>
      
      {/* Header */}
      <div className="p-4 bg-stone-100 border-b border-stone-200 flex justify-between items-center">
        <div className="flex items-center gap-2 text-bible-leather font-serif font-bold">
            <FileText className="w-5 h-5 text-bible-gold" />
            <h3>Minhas Anotações</h3>
        </div>
        <button onClick={onClose} className="hover:bg-stone-200 p-1 rounded transition-colors text-stone-500">
            <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-bible-paper">
        
        {/* Context Header */}
        <div className="mb-6 pb-4 border-b border-stone-200">
            <h4 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">Capítulo Atual</h4>
            <p className="text-xl font-serif text-bible-ink">{currentBookName} {currentChapter}</p>
        </div>

        {/* Editor Area */}
        <div className="mb-8">
            <label className="block text-sm font-medium text-stone-700 mb-2">
                Nova Anotação
            </label>
            <textarea
                value={currentNoteText}
                onChange={(e) => {
                    setCurrentNoteText(e.target.value);
                    if (!isEditing) setIsEditing(true);
                }}
                placeholder="Escreva seus pensamentos, revelações ou estudos aqui..."
                className="w-full h-32 p-3 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-bible-gold focus:border-bible-gold outline-none resize-none bg-white shadow-sm"
            />
            <button
                onClick={handleAddNote}
                disabled={!currentNoteText.trim()}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-bible-leather text-white py-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Plus className="w-4 h-4" />
                Salvar Anotação
            </button>
        </div>

        {/* List */}
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Anotações deste Capítulo ({filteredNotes.length})
            </h4>
            
            {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-lg">
                    <p>Nenhuma anotação neste capítulo ainda.</p>
                </div>
            ) : (
                filteredNotes.map(note => (
                    <div key={note.id} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200 group relative">
                        <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        
                        <div className="mt-3 flex justify-between items-center text-xs text-stone-400 border-t border-stone-100 pt-2">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(note.createdAt).toLocaleDateString()} às {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <button 
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};