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
  // 實際上線時，這部分會移動到後端以保護 Token
  console.log('正在同步筆記到 Notion...', note);
};

// --- 筆記操作 ---
export const saveNote = async (note: Note): Promise<void> => {
  const db = await initDB();
  await db.put(STORES.NOTES, note);
  
  // 自動同步到外部 (如 Notion)
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
  // 這裡存的是二進制 ArrayBuffer，IndexedDB 完美支援
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
    // 需確保專案已部署至 Vercel，或本地有配置 API Proxy
    const response = await fetch(`/api/search?keyword=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
        // 如果 API 不存在 (例如本地純前端開發環境)，回傳一個 Mock 作為 fallback，方便 UI 測試
        console.warn('API call failed, falling back to mock data.');
        return [
            {
                id: 'mock-haodoo',
                title: `${query} (預覽 - API 未連接)`,
                author: '請部署至 Vercel',
                source: 'System',
                downloadUrl: '#'
            }
        ];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Search API Error:', error);
    return []; // 出錯時回傳空陣列
  }
};