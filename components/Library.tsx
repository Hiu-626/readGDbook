import React, { useRef } from 'react';
import { Book } from '../types';
import { Plus, BookOpen, Trash2, Cloud, ExternalLink } from 'lucide-react';

interface LibraryProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onAddBook: (file: File) => void;
}

const Library: React.FC<LibraryProps> = ({ books, onOpenBook, onAddBook }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddBook(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-800 mb-2">我的書櫃</h1>
          <p className="text-gray-500 text-sm">ZenReader for iPad Mini</p>
        </div>
        
        <div className="flex gap-3">
            {/* Simulation of Cloud Sync Status */}
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-gray-600 text-sm border border-gray-200">
                <Cloud size={16} className="text-blue-500" />
                <span className="hidden sm:inline">已同步 Drive</span>
            </button>

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2 bg-stone-800 text-white rounded-full shadow hover:bg-stone-700 transition-colors"
            >
                <Plus size={18} />
                <span>匯入 EPUB</span>
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

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-dashed border-gray-300 text-gray-400">
          <BookOpen size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">書櫃是空的</p>
          <p className="text-sm">點擊右上角匯入您的第一本書</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {books.map((book) => (
            <div 
                key={book.id} 
                onClick={() => onOpenBook(book)}
                className="group relative flex flex-col cursor-pointer"
            >
              <div className="aspect-[2/3] bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 border border-stone-200 overflow-hidden relative">
                {/* Mock Cover */}
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                    <div>
                        <h3 className="font-serif font-bold text-gray-800 line-clamp-3 mb-2">{book.title}</h3>
                        <p className="text-xs text-gray-500 font-sans">{book.author}</p>
                    </div>
                </div>
                {/* Spine decoration */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-stone-300/50"></div>
              </div>
              
              <div className="mt-3">
                <h3 className="font-bold text-gray-800 text-sm truncate font-serif">{book.title}</h3>
                <p className="text-xs text-gray-500 truncate">{new Date(book.addedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-serif font-bold text-gray-700 mb-4">線上資源 (整合預覽)</h2>
          {/* Optimization: Use md:grid-cols-3 to show all 3 items in one row on iPad Mini/Tablets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <a 
                  href="http://www.haodoo.net/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors group"
              >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-blue-800 group-hover:underline">好讀網 (Haodoo)</h3>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">繁體中文經典文學庫。點擊瀏覽目錄。</p>
              </a>
              
              <a 
                  href="https://www.gutenberg.org/browse/languages/zh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 cursor-pointer transition-colors group"
              >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-green-800 group-hover:underline">Project Gutenberg</h3>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-green-500" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">超過 60,000 本免費電子書。</p>
              </a>

              <a 
                  href="https://ebook.hyread.com.tw/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer transition-colors group"
              >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-indigo-800 group-hover:underline">公共圖書館 (HyRead)</h3>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">台灣各大公共圖書館電子書借閱平台。</p>
              </a>
          </div>
      </div>
    </div>
  );
};

export default Library;