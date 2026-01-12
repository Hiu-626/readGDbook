import React, { useState, useEffect } from 'react';
import { Book, Note, UserSettings, ExternalBook, ThemeType } from './types';
import * as storage from './services/storageService';
import Library from './components/Library';
import Reader from './components/Reader';
import { Search, Download, BookOpen, X, Loader2, Library as LibraryIcon, ArrowRight } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);

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

  // 3. 處理書籍匯入
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

  // 4. 搜尋功能
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setExternalResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const [localNotes, onlineBooks] = await Promise.all([
          storage.searchGlobalNotes(searchQuery),
          storage.searchFreeBooks(searchQuery)
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

  // 5. 下載邏輯 (修復版)
  const handleDownloadAndAdd = async (externalBook: ExternalBook) => {
    // 移除阻擋 Mock 的邏輯，讓使用者可以測試 API
    
    const confirmDownload = window.confirm(`是否下載並收藏《${externalBook.title}》？`);
    if (!confirmDownload) return;

    setIsLoading(true);
    console.log("🚀 Starting download process for:", externalBook.title);
    console.log("🔗 Target URL:", externalBook.downloadUrl);

    try {
      // 1. 呼叫我們自己的 Vercel API 代理
      const proxyUrl = `/api/download?url=${encodeURIComponent(externalBook.downloadUrl)}`;
      console.log("📡 Requesting Proxy:", proxyUrl);

      const response = await fetch(proxyUrl);
      console.log("📥 Response Status:", response.status);
      console.log("📄 Content-Type:", response.headers.get('Content-Type'));
      
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server Error: ${response.status} - ${errorText}`);
      }
      
      // 2. 轉換為 ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      console.log("📦 Received Data Size:", arrayBuffer.byteLength, "bytes");

      if (arrayBuffer.byteLength < 1000) {
          console.warn("⚠️ Warning: File size too small, might be an error page.");
          alert("警告：下載的檔案過小，可能不是有效的 EPUB 檔案。");
      }
      
      // 3. 封裝成書本物件
      const newBook: Book = {
        id: externalBook.id,
        title: externalBook.title,
        author: externalBook.author,
        data: arrayBuffer, 
        source: externalBook.source.toLowerCase() as any,
        addedAt: Date.now()
      };

      // 4. 存入 IndexedDB 並更新 UI
      await storage.saveBook(newBook);
      const updatedBooks = await storage.getBooks();
      setBooks(updatedBooks);
      
      alert(`《${externalBook.title}》下載成功！已放入書櫃。`);
      setCurrentView('library');
    } catch (err) {
      console.error("❌ Download Error:", err);
      alert(`下載失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchClick = () => {
    setCurrentView(currentView === 'search' ? 'library' : 'search');
    setSearchQuery('');
  };

  const handleOpenBook = (book: Book) => {
    if (!book.data) {
        alert("書籍資料損毀，無法開啟");
        return;
    }
    // Debug log to ensure data valid before opening reader
    console.log(`Opening book: ${book.title}`, {
        id: book.id,
        dataType: book.data.constructor.name,
        byteLength: (book.data as ArrayBuffer).byteLength
    });
    setActiveBook(book);
    setCurrentView('reader');
  };

  return (
    <div className="h-screen w-screen bg-zen-paper font-serif text-stone-900 overflow-hidden flex flex-col">
      
      {/* Loading Overlay with Backdrop Blur */}
      {isLoading && (
        <div className="absolute inset-0 z-[60] bg-stone-900/30 backdrop-blur-md flex items-center justify-center flex-col text-white animate-in fade-in duration-300">
          <div className="bg-white/10 p-10 rounded-[2rem] border border-white/20 shadow-2xl flex flex-col items-center backdrop-blur-xl">
            <Loader2 size={48} className="animate-spin mb-6 text-parchment" />
            <p className="text-xl font-serif font-medium tracking-wide">正在下載與處理書籍...</p>
            <p className="text-sm text-stone-300 mt-2">請稍候，這可能需要幾秒鐘</p>
          </div>
        </div>
      )}

      {/* Modern Glassmorphism Search Overlay */}
      {currentView === 'search' && (
        <div className="absolute inset-0 z-50 bg-[#F8F5F0]/95 backdrop-blur-xl transition-all animate-in slide-in-from-bottom-[5%] duration-300 flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-12">
            <div className="max-w-3xl mx-auto mt-4 pb-32">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3">
                    探索
                </h2>
                <button 
                    onClick={() => setCurrentView('library')} 
                    className="p-4 bg-white hover:bg-stone-100 rounded-full transition-colors text-stone-500 shadow-sm"
                >
                  <X size={26} />
                </button>
              </div>

              {/* Enhanced Input Field: Rounded, Inner Shadow, No Border */}
              <div className="relative mb-16 group">
                <input 
                  type="text"
                  placeholder="搜尋書名、作者或筆記關鍵字..." 
                  className="w-full pl-8 pr-16 py-6 rounded-full bg-stone-200/50 focus:bg-white shadow-inner focus:shadow-lg transition-all outline-none text-xl font-serif placeholder:font-sans placeholder:text-stone-400 text-stone-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    {isSearching ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                </div>
              </div>

              {searchQuery.length < 2 && (
                  <div className="text-center text-stone-400 mt-24 opacity-50">
                      <BookOpen size={64} className="mx-auto mb-6" />
                      <p className="text-sm tracking-[0.2em] uppercase font-bold">Type to Explore</p>
                  </div>
              )}

              <div className="space-y-16">
                {/* Local Notes Results - Card Style with Breathing Room */}
                {searchResults.length > 0 && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-6 ml-2">我的筆記 ({searchResults.length})</h3>
                        <div className="grid gap-6">
                        {searchResults.map((res) => (
                            <div 
                            key={res.note.id} 
                            onClick={() => handleOpenBook(res.book!)}
                            className="p-8 bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all cursor-pointer group border border-stone-50"
                            >
                                <div className="flex gap-6">
                                    <div className="w-1.5 bg-yellow-300/60 rounded-full self-stretch"></div>
                                    <div className="flex-1">
                                        <p className="font-serif text-xl text-stone-800 leading-loose italic mb-4 text-justify">
                                            "{res.note.text}"
                                        </p>
                                        {res.note.annotation && (
                                            <div className="text-base text-stone-600 bg-[#F8F5F0] p-4 rounded-xl mb-4 inline-block">
                                                <span className="font-bold text-stone-400 text-xs mr-3 uppercase tracking-wider">Note</span>
                                                {res.note.annotation}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm text-stone-400 font-sans mt-2 font-medium">
                                            <span className="group-hover:text-stone-700 transition-colors border-b border-transparent group-hover:border-stone-300 pb-0.5">
                                                《{res.book?.title}》
                                            </span>
                                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </section>
                )}

                {/* External Results - List Style with Soft Buttons */}
                {externalResults.length > 0 && (
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-6 ml-2">線上書庫 ({externalResults.length})</h3>
                    <div className="grid gap-4">
                      {externalResults.map(book => (
                        <div key={book.id} className="flex items-center justify-between p-5 pl-8 bg-white/60 rounded-[2rem] hover:bg-white transition-colors">
                          <div className="flex-1">
                            <h4 className="font-bold font-serif text-xl text-stone-800">{book.title}</h4>
                            <p className="text-sm text-stone-500 mt-2 flex items-center gap-3 font-medium">
                                {book.author}
                                <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${book.source === 'Demo' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {book.source}
                                </span>
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDownloadAndAdd(book)}
                            className="ml-6 px-6 py-3 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-800 hover:text-white transition-all font-medium text-sm flex items-center gap-2"
                          >
                            <Download size={18} />
                            下載
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Controller */}
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
                externalResults={externalResults}
                isSearching={isSearching}
                onOpenBook={handleOpenBook}
                onAddBook={handleAddBook}
                onDownloadBook={handleDownloadAndAdd}
                onTriggerSearch={handleSearchClick}
            />
            {/* Floating Search Button - Larger for iPad */}
            <button 
                onClick={handleSearchClick}
                className="hidden md:flex absolute bottom-10 right-10 w-16 h-16 bg-stone-900 text-[#F8F5F0] rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] items-center justify-center hover:scale-110 hover:-translate-y-2 active:scale-95 transition-all z-40 border border-stone-700/50"
            >
                <Search size={28} />
            </button>
        </div>
      )}
    </div>
  );
};

export default App;