export enum Testament {
  OLD = 'Antigo Testamento',
  NEW = 'Novo Testamento'
}

export interface Book {
  name: string;
  chapters: number;
  testament: Testament;
  abbreviation?: string;
}

export interface Verse {
  number: number;
  text: string;
}

export interface ChapterContent {
  book: string;
  chapter: number;
  verses: Verse[];
  summary?: string;
}

export interface BibleState {
  currentBook: Book;
  currentChapter: number;
  isLoading: boolean;
  content: ChapterContent | null;
  error: string | null;
  isSidebarOpen: boolean;
  isAiPanelOpen: boolean;
}
