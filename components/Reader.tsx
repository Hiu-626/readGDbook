import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book as EpubBook, Rendition } from 'epubjs';
import { Book, Note, ThemeType, UserSettings } from '../types';
import { ChevronLeft, Settings as SettingsIcon, Highlighter, Bookmark, PenLine, Loader2 } from 'lucide-react';
import * as storage from '../services/storageService';

interface ReaderProps {
  bookData: Book;
  settings: UserSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

// 定義主題色值，方便主介面同步
const THEME_MAP = {
  [ThemeType.LIGHT]: { bg: '#ffffff', fg: '#3C3C3C' },
  [ThemeType.PARCHMENT]: { bg: '#F4ECD8', fg: '#3C3C3C' },
  [ThemeType.EYE_GREEN]: { bg: '#C7EDCC', fg: '#003300' },
  [ThemeType.DARK]: { bg: '#1a1a1a', fg: '#cccccc' },
};

const Reader: React.FC<ReaderProps> = ({ bookData, settings, onClose, onUpdateSettings }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookInstance = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, cfi: string, text: string } | null>(null);

  // --- 核心：動態樣式注入 (解決繁體與護眼色) ---
  const applyTheme = useCallback((rendition: Rendition) => {
    const activeColors = THEME_MAP[settings.theme];
    
    rendition.themes.register('active', {
      body: {
        'background': `${activeColors.bg} !important`,
        'color': `${activeColors.fg} !important`,
        'font-family': '"Noto Serif TC", "思源宋體", serif !important',
        'line-height': '1.8 !important',
      },
      '::selection': {
        'background': 'rgba(255, 235, 59, 0.4)'
      }
    });
    
    rendition.themes.select('active');
    rendition.themes.fontSize(`${settings.fontSize}%`);
  }, [settings.theme, settings.fontSize]);


  // --- 初始化閱讀器 ---
  useEffect(() => {
    if (!viewerRef.current) return;

    const book = ePub(bookData.data);
    bookInstance.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      manager: 'default',
    });
    renditionRef.current = rendition;

    rendition.display().then(() => {
      setLoading(false);
      applyTheme(rendition);
    });

    // 監聽文字選取 (畫線功能)
    rendition.on('selected', (cfiRange: string, contents: any) => {
      const range = rendition.getRange(cfiRange);
      const text = range.toString();
      
      setSelectionMenu({
        x: 0, y: 0, // 採用固定底部彈窗，避免座標計算位移
        cfi: cfiRange,
        text: text
      });
      // 選取時關閉上下選單
      setIsMenuOpen(false);
    });

    // 點擊事件：切換選單或清除選取
    rendition.on('click', () => {
      if (selectionMenu) {
        setSelectionMenu(null);
      } else {
        setIsMenuOpen(prev => !prev);
      }
    });

    // --- iPad 手勢支持 (Swipe) ---
    let touchStartX = 0;
    rendition.on('touchstart', (e: any) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    rendition.on('touchend', (e: any) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diffX = touchStartX - touchEndX;
      if (Math.abs(diffX) > 60) {
        if (diffX > 0) rendition.next();
        else rendition.prev();
      }
    });

    return () => {
      if (bookInstance.current) {
        bookInstance.current.destroy();
      }
    };
  }, [bookData.id]);

  // 設定更新時即時重繪
  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current);
  }, [settings, applyTheme]);


  // --- 畫線與筆記處理 ---
  const handleSaveAnnotation = async (type: 'highlight' | 'note') => {
    if (!selectionMenu) return;

    let annotationText = '';
    if (type === 'note') {
      const input = window.prompt("💡 紀錄您的理財心得：");
      if (input === null) return;
      annotationText = input;
    }

    const newNote: Note = {
      id: Date.now().toString(),
      bookId: bookData.id,
      cfi: selectionMenu.cfi,
      text: selectionMenu.text,
      annotation: annotationText,
      color: type === 'highlight' ? '#FFEB3B' : '#90EE90',
      createdAt: Date.now()
    };

    await storage.saveNote(newNote);
    
    // 渲染畫線到書中
    renditionRef.current?.annotations.add(
      'highlight', 
      newNote.cfi, 
      {}, 
      null, 
      'hl-style'
    );

    setSelectionMenu(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none" style={{ backgroundColor: THEME_MAP[settings.theme].bg }}>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <Loader2 className="animate-spin text-stone-400" size={32} />
        </div>
      )}

      {/* 頂部工具列：自動隱藏 */}
      <div className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 transform ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${settings.theme === ThemeType.DARK ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white/95 backdrop-blur text-stone-800'}`}>
          <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-stone-200"><ChevronLeft size={28} /></button>
          <h2 className="font-serif font-bold truncate flex-1 text-center px-4">{bookData.title}</h2>
          <button className="p-2 rounded-full"><Bookmark size={24} /></button>
        </div>
      </div>

      {/* 閱讀主區域 */}
      <div className="flex-1 w-full h-full relative cursor-pointer">
        <div ref={viewerRef} className="w-full h-full" />
        
        {/* 選取文字後的彈窗 (Selection UI) */}
        {selectionMenu && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center bg-stone-900/95 backdrop-blur text-white rounded-2xl shadow-2xl px-2 py-2 z-40 animate-in fade-in zoom-in duration-200">
            <button onClick={() => handleSaveAnnotation('highlight')} className="flex flex-col items-center gap-1 px-4 py-2 hover:text-yellow-400">
              <Highlighter size={22} />
              <span className="text-[10px]">畫線</span>
            </button>
            <div className="w-px h-8 bg-stone-700 mx-1" />
            <button onClick={() => handleSaveAnnotation('note')} className="flex flex-col items-center gap-1 px-4 py-2 hover:text-blue-400">
              <PenLine size={22} />
              <span className="text-[10px]">筆記</span>
            </button>
          </div>
        )}
      </div>

      {/* 底部控制台 */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 transform ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className={`p-8 pb-12 rounded-t-[2rem] shadow-2xl ${settings.theme === ThemeType.DARK ? 'bg-stone-900 text-white' : 'bg-white/98 text-stone-800'}`}>
          
          <div className="flex items-center gap-4 mb-8">
            <span className="text-[10px] text-stone-400 font-mono tracking-tighter">0%</span>
            <div className="h-1.5 flex-1 bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full bg-stone-800 w-[15%] transition-all" />
            </div>
            <span className="text-[10px] text-stone-400 font-mono">100%</span>
          </div>

          <div className="flex justify-between items-center">
            {/* 配色切換 */}
            <div className="flex gap-4">
              {Object.keys(THEME_MAP).map((t) => (
                <button 
                  key={t}
                  onClick={() => onUpdateSettings({ ...settings, theme: t as ThemeType })}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${settings.theme === t ? 'border-stone-800 scale-125 shadow-lg' : 'border-stone-100'}`}
                  style={{ backgroundColor: THEME_MAP[t as ThemeType].bg }}
                />
              ))}
            </div>

            {/* 字體調整 */}
            <div className="flex items-center bg-stone-100 rounded-2xl p-1">
              <button 
                onClick={() => onUpdateSettings({ ...settings, fontSize: Math.max(80, settings.fontSize - 10) })}
                className="w-12 h-10 flex items-center justify-center text-lg font-serif"
              >A-</button>
              <div className="w-px h-4 bg-stone-300" />
              <button 
                onClick={() => onUpdateSettings({ ...settings, fontSize: Math.min(180, settings.fontSize + 10) })}
                className="w-12 h-10 flex items-center justify-center text-xl font-serif font-bold"
              >A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* 點擊區域幫助（左右點擊翻頁，中間喚出選單） */}
      {!isMenuOpen && !selectionMenu && (
        <>
          <div className="absolute top-0 left-0 w-20 h-full z-10" onClick={() => renditionRef.current?.prev()} />
          <div className="absolute top-0 right-0 w-20 h-full z-10" onClick={() => renditionRef.current?.next()} />
        </>
      )}
    </div>
  );
};

export default Reader;