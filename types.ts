export enum ThemeType {
  LIGHT = 'light',
  PARCHMENT = 'parchment',
  EYE_GREEN = 'green',
  DARK = 'dark'
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  data: ArrayBuffer | string; // Storing base64 or file buffer for local demo
  source: 'local' | 'gutenberg' | 'haodoo' | 'hyread';
  addedAt: number;
}

export interface ExternalBook {
  id: string;
  title: string;
  author: string;
  source: string;
  downloadUrl: string;
}

export interface Note {
  id: string;
  bookId: string;
  cfi: string; // EPUB Canonical Fragment Identifier
  text: string; // The highlighted text
  annotation: string; // User's note
  color: string;
  createdAt: number;
}

export interface UserSettings {
  theme: ThemeType;
  fontSize: number;
  fontFamily: string;
}

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  note: Note;
}