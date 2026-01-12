import React, { useRef } from 'react';
import { Book, ExternalBook } from '../types';
import { Plus, BookOpen, Download, Cloud, Search } from 'lucide-react';

interface LibraryProps {
  books: Book[];
  externalResults: ExternalBook[];
  isSearching: boolean;
  onOpenBook: (book: Book) => void;
  onAddBook: (file: File) => void;
  onDownloadBook: (book: ExternalBook) => void;
  onTriggerSearch?: () => void;
}

const Library: React.FC<LibraryProps> = ({ 
  books, 
  externalResults, 
  isSearching, 
  onOpenBook, 
  onAddBook,
  onDownloadBook,
  onTriggerSearch
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddBook(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto h-full overflow-y-auto no-scrollbar bg-zen-paper">
      {/* Header Area: Clean & Airy */}
      <header className="mb-14 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-serif font-bold text-stone-900 tracking-tight mb-2">
            我的書櫃
          </h1>
          <p className="text-stone-400 text-base font-medium tracking-widest uppercase pl-1">
            ZenReader · Personal Library
          </p>
        </div>
        
        <div className="flex gap-4 self-stretch md:self-auto">
             {/* Search Trigger for Mobile/Tablet convenience */}
            <button 
                onClick={onTriggerSearch}
                className="md:hidden flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/50 rounded-full text-stone-600 active:bg-white transition-all"
            >
                <Search size={20} />
                <span className="font-medium">搜尋</span>
            </button>

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-stone-900 text-[#F8F5F0] rounded-full shadow-xl shadow-stone-900/20 hover:bg-stone-800 hover:scale-105 transition-all active:scale-95"
            >
                <Plus size={20} />
                <span className="font-medium text-base">匯入書籍</span>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".epub"
                onChange={handleFileChange}
            />
        </div>
      </header>

      {/* Online Search Results (Horizontal Scroll) - No Borders, Soft Shadows */}
      {(externalResults.length > 0 || isSearching) && (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6 ml-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full ring-4 ring-blue-500/20"></div>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              線上探索
            </h2>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-10 pt-2 px-2 no-scrollbar -mx-2">
            {isSearching ? (
              <div className="flex items-center gap-4 text-stone-400 text-base py-12 pl-6 bg-white/40 rounded-3xl w-full max-w-md">
                <div className="animate-spin w-5 h-5 border-2 border-stone-300 border-t-stone-500 rounded-full"></div>
                正在雲端書庫搜尋中...
              </div>
            ) : (
              externalResults.map(extBook => (
                <div 
                  key={extBook.id}
                  className="flex-shrink-0 w-72 bg-white/60 backdrop-blur-md p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between mb-4">
                     <div className="p-3 bg-stone-100/50 rounded-2xl text-stone-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <BookOpen size={28} />
                     </div>
                     <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${extBook.source === 'Demo' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                        {extBook.source}
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-serif font-bold text-stone-800 text-xl leading-snug mb-2 line-clamp-2">{extBook.title}</h4>
                    <p className="text-sm text-stone-500 font-medium">{extBook.author}</p>
                  </div>

                  <button 
                    onClick={() => onDownloadBook(extBook)}
                    className="w-full py-4 bg-stone-800/5 text-stone-600 rounded-2xl text-sm font-bold hover:bg-stone-800 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    <Download size={18} /> 
                    <span>收藏書籍</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Local Books Grid - Realistic 3D Books */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white/40 rounded-[2.5rem] text-stone-400 mt-4 border border-white/50">
          <div className="w-24 h-24 bg-[#F0EBE0] rounded-full flex items-center justify-center mb-6 shadow-inner">
            <BookOpen size={40} className="opacity-40 text-stone-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-700 mb-3">書櫃空空如也</p>
          <p className="text-base text-stone-500">試著搜尋「投資」或匯入您的 EPUB 檔案</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-10 gap-y-16 px-2 pb-32">
          {books.map((book, index) => (
            <div 
                key={book.id} 
                onClick={() => onOpenBook(book)}
                className="group relative flex flex-col cursor-pointer animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards"
                style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* 3D Book Cover Container */}
              <div className="aspect-[2/3] bg-[#FDFBF7] rounded-r-2xl rounded-l-md shadow-book-3d group-hover:-translate-y-3 group-hover:shadow-[20px_20px_40px_-5px_rgba(0,0,0,0.15)] transition-all duration-300 relative overflow-hidden">
                
                {/* Spine Crease Effect (The "Hinge") */}
                <div className="absolute left-0 top-0 bottom-0 w-5 spine-crease z-20 mix-blend-multiply pointer-events-none"></div>
                <div className="absolute left-[2px] top-0 bottom-0 w-[1px] bg-stone-900/5 z-20"></div>
                
                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 mix-blend-multiply pointer-events-none"></div>

                {/* Cover Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center z-10">
                    <div className="w-full h-full border-2 border-stone-800/5 rounded-lg p-2 flex flex-col justify-center items-center">
                        <h3 className="font-serif font-bold text-stone-800 text-lg leading-relaxed line-clamp-3 mb-4 group-hover:text-black transition-colors">
                            {book.title}
                        </h3>
                        <div className="w-8 h-[2px] bg-stone-800/10 mb-3"></div>
                        <p className="text-xs text-stone-500 font-sans font-medium uppercase tracking-widest line-clamp-1">{book.author}</p>
                    </div>
                </div>

                {/* Subtle sheen on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
              
              {/* Metadata */}
              <div className="mt-5 px-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest bg-stone-200/50 inline-block px-2 py-1 rounded-full">
                    {book.source === 'local' ? '已下載' : '雲端'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;