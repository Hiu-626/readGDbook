import React, { useState, useEffect } from 'react';
import { Book, Note, UserSettings, ExternalBook, ThemeType } from './types';
import * as storage from './services/storageService';
import Library from './components/Library';
import Reader from './components/Reader';
import { Search, Download, BookOpen, X, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'search'>('library');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: ThemeType.PARCHMENT,
    fontSize: 100,
    fontFamily: '"Noto Serif TC", serif',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{note: Note, book: Book | undefined}[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Global loading state for downloads

  // 1. 初始化讀取
  useEffect(() => {
    const loadData = async () => {
      const [loadedBooks, loadedSettings] = await Promise.all([
        storage.getBooks(),
        storage.getSettings()
      ]);
      setBooks(loadedBooks);
      setSettings(loadedSettings);
    };
    loadData();
  }, []);

  // 2. 更新設定
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  // 3. 處理書籍匯入 (IndexedDB 儲存)
  const handleAddBook = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const newBook: Book = {
          id: Date.now().toString(),
          title: file.name.replace('.epub', ''),
          author: '未知作者',
          data: e.target.result as ArrayBuffer,
          source: 'local',
          addedAt: Date.now()
        };
        await storage.saveBook(newBook);
        const updatedBooks = await storage.getBooks();
        setBooks(updatedBooks);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4. 搜尋功能 (整合本地筆記與線上資源)
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setExternalResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // 同時啟動本地與線上搜尋
        const [localNotes, onlineBooks] = await Promise.all([
          storage.searchGlobalNotes(searchQuery),
          storage.searchFreeBooks(searchQuery) // 需在 storageService 實作 API 呼叫
        ]);
        
        setSearchResults(localNotes);
        setExternalResults(onlineBooks);
      } catch (error) {
        console.error("搜尋發生錯誤", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // 5. 下載並自動入庫
  const handleDownloadAndAdd = async (externalBook: ExternalBook) => {
    // 檢查是否為 Mock 數據 (無效連結)
    if (externalBook.downloadUrl === '#' || externalBook.downloadUrl.includes('mock-haodoo')) {
      alert("⚠️ 目前顯示的是預覽資料（API 未連接）。\n\n請確保專案已正確部署到 Vercel，且 /api/search 與 /api/download 運作正常。");
      return;
    }

    const confirmDownload = window.confirm(`是否下載並收藏《${externalBook.title}》？`);
    if (!confirmDownload) return;

    setIsLoading(true);
    try {
      // 透過後端 API 獲取檔案 (避免跨域 CORS 問題)
      const downloadApiUrl = `/api/download?url=${encodeURIComponent(externalBook.downloadUrl)}`;
      const response = await fetch(downloadApiUrl);
      
      if (!response.ok) throw new Error('下載伺服器回應錯誤');
      
      // 將下載回來的資料轉成 ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // 封裝成 Book 物件並存入 IndexedDB
      const newBook: Book = {
        id: externalBook.id, // 使用外部 ID
        title: externalBook.title,
        author: externalBook.author,
        data: arrayBuffer, 
        source: externalBook.source.toLowerCase() as any, // 確保格式符合定義
        addedAt: Date.now()
      };

      await storage.saveBook(newBook);
      setBooks(await storage.getBooks());
      
      alert("下載成功！已放入書櫃。");
      setCurrentView('library');
    } catch (err) {
      console.error(err);
      alert("一鍵下載失敗。原因：跨域限制或來源失效。請嘗試手動匯入。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchClick = () => {
    setCurrentView(currentView === 'search' ? 'library' : 'search');
    setSearchQuery('');
  };

  return (
    <div className="h-screen w-screen bg-stone-50 font-sans text-stone-900 overflow-hidden flex flex-col">
      
      {/* 全局 Loading 遮罩 */}
      {isLoading && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col text-white">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="text-lg font-serif">正在從雲端下載書籍...</p>
        </div>
      )}

      {/* 搜尋介面層 (Overlay) */}
      {currentView === 'search' && (
        <div className="absolute inset-0 z-50 bg-white/98 backdrop-blur-md p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-2xl mx-auto mt-8 pb-24">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-stone-800">搜尋與探索</h2>
              <button onClick={() => setCurrentView('library')} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={28} className="text-stone-400" />
              </button>
            </div>

            <div className="relative mb-10">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={22} />
              <input 
                type="text"
                placeholder="搜尋書名、作者或筆記內容..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-stone-100 focus:ring-2 focus:ring-stone-300 text-xl shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 animate-spin" size={20} />}
            </div>

            <div className="space-y-10">
              {/* 本地筆記結果 */}
              <section>
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-4">我的筆記 ({searchResults.length})</h3>
                <div className="space-y-4">
                  {searchResults.map((res) => (
                    <div 
                      key={res.note.id} 
                      onClick={() => { setActiveBook(res.book!); setCurrentView('reader'); }}
                      className="p-5 bg-stone-50 border border-stone-200 rounded-2xl hover:shadow-md transition-all cursor-pointer group"
                    >
                      <p className="font-serif text-lg text-stone-800 italic mb-3">"{res.note.text}"</p>
                      {res.note.annotation && <p className="text-sm text-stone-500 bg-stone-200/50 p-3 rounded-lg mb-3">💡 {res.note.annotation}</p>}
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <BookOpen size={14} /> <span>{res.book?.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 線上資源結果 */}
              {searchQuery.length > 1 && (
                <section>
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-4">線上書庫探索 ({externalResults.length})</h3>
                  <div className="space-y-3">
                    {externalResults.map(book => (
                      <div key={book.id} className="flex items-center justify-between p-5 bg-white border border-stone-200 rounded-2xl shadow-sm">
                        <div className="flex-1">
                          <h4 className="font-bold text-stone-800">{book.title}</h4>
                          <p className="text-sm text-stone-400">{book.author} · <span className="text-blue-500">{book.source}</span></p>
                        </div>
                        <button 
                          onClick={() => handleDownloadAndAdd(book)}
                          className="ml-4 p-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 active:scale-90 transition-all"
                        >
                          <Download size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 主要視圖渲染 */}
      {currentView === 'reader' && activeBook ? (
        <Reader 
          bookData={activeBook} 
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => { setActiveBook(null); setCurrentView('library'); }} 
        />
      ) : (
        <div className="flex-1 overflow-hidden relative">
            <Library 
                books={books} 
                onOpenBook={(book) => { setActiveBook(book); setCurrentView('reader'); }}
                onAddBook={handleAddBook}
            />
            {/* 懸浮搜尋按鈕 (iPad 底部操作區域) */}
            <button 
                onClick={handleSearchClick}
                className="absolute bottom-8 right-8 w-16 h-16 bg-stone-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
            >
                <Search size={28} />
            </button>
        </div>
      )}
    </div>
  );
};

export default App;