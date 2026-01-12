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
        'padding-bottom': '50px !important' // Extra padding for scrolling
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
    if (!viewerRef.current || !bookData.data) return;

    // 強制重置 loading
    setLoading(true);

    // 初始化書籍
    const book = ePub(bookData.data);
    bookInstance.current = book;

    // 配置 Rendition - 先用最穩定的 scrolled 模式
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: "scrolled",      // 先改成捲動模式，成功率 100%
      manager: "continuous"
    });
    renditionRef.current = rendition;

    // 開始渲染
    book.ready.then(() => {
      return rendition.display();
    }).then(() => {
      console.log("✅ 渲染成功");
      setLoading(false);
      applyTheme(rendition);
    }).catch(err => {
      console.error("❌ 渲染出錯:", err);
      // 萬一 display 失敗，嘗試強制顯示第一部分
      if (book.spine && (book.spine as any).length > 0) {
        // @ts-ignore
        rendition.display(book.spine.get(0).href);
      }
      setLoading(false);
    });

    // 監聽文字選取 (畫線功能)
    rendition.on('selected', (cfiRange: string, contents: any) => {
        const range = rendition.getRange(cfiRange);
        const text = range.toString();
        
        setSelectionMenu({
            x: 0, y: 0, // 採用固定底部彈窗
            cfi: cfiRange,
            text: text
        });
    });

    // 點擊事件 - 隱藏選單
    rendition.on('click', () => {
        setSelectionMenu(null);
    });

    return () => {
      if (bookInstance.current) {
        bookInstance.current.destroy();
      }
    };
  }, [bookData.id]); // 當書籍 ID 改變時重新執行

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
    /* 使用 fixed 確保在 iPad 上佔滿全螢幕，避免 Safari 工具列干擾 */
    <div className="fixed inset-0 w-screen h-screen z-50 bg-white flex flex-col overflow-hidden" style={{ backgroundColor: THEME_MAP[settings.theme].bg }}>
      
      {/* 頂部導航 (固定高度) */}
      <div className="h-16 flex items-center justify-between px-6 border-b shrink-0 bg-white/50 backdrop-blur-sm z-20">
        <button onClick={onClose} className="text-stone-600 font-medium flex items-center gap-1 active:scale-95 transition-transform">
            <ChevronLeft size={20} />
            返回
        </button>
        <div className="font-serif font-bold truncate px-4 text-stone-800">{bookData.title}</div>
        
        {/* 字體調整 - 簡化版 */}
        <div className="flex items-center gap-3">
             <button 
                onClick={() => onUpdateSettings({ ...settings, fontSize: Math.max(80, settings.fontSize - 10) })}
                className="w-8 h-8 flex items-center justify-center bg-stone-200/50 rounded-full"
              >A-</button>
              <button 
                onClick={() => onUpdateSettings({ ...settings, fontSize: Math.min(180, settings.fontSize + 10) })}
                className="w-8 h-8 flex items-center justify-center bg-stone-200/50 rounded-full font-bold"
              >A+</button>
        </div>
      </div>
  
      {/* 關鍵：閱讀器主區域 */}
      <div className="flex-1 w-full relative overflow-hidden">
        {/* 加上一個 key，確保更換書籍時容器會徹底重啟 */}
        <div 
          ref={viewerRef} 
          key={bookData.id}
          className="w-full h-full" 
          style={{ minHeight: '100%' }}
        />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 z-20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
               <Loader2 className="animate-spin text-stone-600" size={32} />
               <p className="text-stone-500 text-sm font-serif">正在排版中...</p>
            </div>
          </div>
        )}

        {/* 選取文字後的彈窗 (Selection UI) */}
        {selectionMenu && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-stone-900/95 backdrop-blur text-white rounded-2xl shadow-2xl px-2 py-2 z-40 animate-in fade-in zoom-in duration-200">
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
    </div>
  );
};

export default Reader;