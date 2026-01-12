import { Book, Note, UserSettings, ThemeType, ExternalBook } from '../types';
import { openDB, IDBPDatabase } from 'idb'; 

const DB_NAME = 'ZenReaderDB';
const STORES = {
  BOOKS: 'books',
  NOTES: 'notes',
  SETTINGS: 'settings'
};

// --- 初始化 IndexedDB (解決 LocalStorage 空間不足問題) ---
const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.BOOKS)) db.createObjectStore(STORES.BOOKS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.NOTES)) db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) db.createObjectStore(STORES.SETTINGS);
    },
  });
};

// --- Notion 同步接口 (預留) ---
const syncToNotion = async (note: Note) => {
  // 這裡填入你之後申請的 Notion API Token 和 Database ID
  console.log('正在同步筆記到 Notion...', note);
};

// --- 筆記操作 ---
export const saveNote = async (note: Note): Promise<void> => {
  const db = await initDB();
  await db.put(STORES.NOTES, note);
  await syncToNotion(note);
};

export const getNotes = async (): Promise<Note[]> => {
  const db = await initDB();
  return db.getAll(STORES.NOTES);
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORES.NOTES, noteId);
};

// --- 書籍操作 (IndexedDB 支援存放大體積 EPUB) ---
export const saveBook = async (book: Book): Promise<void> => {
  const db = await initDB();
  await db.put(STORES.BOOKS, book);
};

export const getBooks = async (): Promise<Book[]> => {
  const db = await initDB();
  return db.getAll(STORES.BOOKS);
};

export const deleteBook = async (bookId: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORES.BOOKS, bookId);
};

// --- 設定操作 ---
export const getSettings = async (): Promise<UserSettings> => {
  const db = await initDB();
  const settings = await db.get(STORES.SETTINGS, 'current');
  return settings || {
    theme: ThemeType.PARCHMENT,
    fontSize: 100,
    fontFamily: '"Noto Serif TC", serif',
  };
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  const db = await initDB();
  await db.put(STORES.SETTINGS, settings, 'current');
};

// --- 搜尋邏輯 ---
export const searchGlobalNotes = async (query: string): Promise<{ note: Note, book: Book | undefined }[]> => {
  const notes = await getNotes();
  const books = await getBooks();
  const lowerQuery = query.toLowerCase();
  
  const filtered = notes.filter(n => 
    n.text.toLowerCase().includes(lowerQuery) || 
    (n.annotation && n.annotation.toLowerCase().includes(lowerQuery))
  );

  return filtered.map(note => ({
    note,
    book: books.find(b => b.id === note.bookId)
  }));
};

// --- 線上搜尋 (使用 Vercel Serverless Proxy) ---
export const searchFreeBooks = async (query: string): Promise<ExternalBook[]> => {
  try {
    // 呼叫你的後端 API (解決 CORS 問題)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒 timeout 機制，避免開發時等待過久

    const response = await fetch(`/api/search?keyword=${encodeURIComponent(query)}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error("API unavailable or returned HTML");
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Search API unavailable (Using Mock Data):', error);
    
    // 強制回傳 Mock 數據，確保 UI 上的「一鍵下載」按鈕能顯示出來
    return [
        {
            id: 'mock-haodoo',
            title: `${query} (好讀網範例)`,
            author: '金庸',
            source: 'Demo',
            downloadUrl: '#' // App.tsx 會攔截此 URL 並提示
        },
        {
            id: 'demo-book-1',
            title: '老人與海',
            author: '海明威',
            source: 'Gutenberg',
            downloadUrl: '#'
        },
        {
            id: 'demo-book-2',
            title: '傲慢與偏見',
            author: '珍·奧斯汀',
            source: 'Haodoo',
            downloadUrl: '#'
        }
    ];
  }
};