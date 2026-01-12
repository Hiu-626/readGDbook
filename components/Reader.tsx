import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book as EpubBook, Rendition } from 'epubjs';
import { Book, Note, ThemeType, UserSettings } from '../types';
import { ChevronLeft, Loader2, Highlighter, PenLine } from 'lucide-react';
import * as storage from '../services/storageService';

interface ReaderProps {
  bookData: Book;
  settings: UserSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

// 定義主題色值
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
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, cfi: string, text: string } | null>(null);

  // --- 核心：擬真書籍樣式注入 ---
  const applyTheme = useCallback((rendition: Rendition) => {
    const activeColors = THEME_MAP[settings.theme];
    
    rendition.themes.register('active', {
      body: {
        'background': `${activeColors.bg} !important`,
        'color': `${activeColors.fg} !important`,
        'font-family': '"Noto Serif TC", "思源宋體", serif !important',
        'line-height': '1.8 !important', // 舒適行高
        'text-align': 'justify !important', // 左右齊行
        'padding': '0px 20px !important' // 頁面內距 (手機/平板適配)
      },
      p: {
        'text-indent': '2em !important', // 中文段落縮排
        'margin-bottom': '0 !important', // 緊湊段落
        'padding-top': '0.5em !important'
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

    setLoading(true);

    const book = ePub(bookData.data);
    bookInstance.current = book;

    // 1. 設定為分頁模式 (Paginated)
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: "paginated",      // 關鍵：分頁模式
      manager: "default",     // Default manager 處理分頁較穩定
      allowScriptedContent: false
    });
    renditionRef.current = rendition;

    // 2. 準備與渲染
    book.ready.then(async () => {
        // 產生 Locations 用於計算進度 (耗時操作，但對進度條很重要)
        // 為了效能，我們這裡先只產生少量，真實產品應在背景做
        return book.locations.generate(1000); 
    }).then(() => {
      rendition.display();
      setLoading(false);
      applyTheme(rendition);
    }).catch(err => {
      console.error("Render Error:", err);
      setLoading(false);
    });

    // 3. 事件監聽
    rendition.on('selected', (cfiRange: string, contents: any) => {
        const range = rendition.getRange(cfiRange);
        const text = range.toString();
        // 修正選單位置 (paginated 模式下需要計算 iframe 位置，這裡簡化為固定底部)
        setSelectionMenu({ x: 0, y: 0, cfi: cfiRange, text });
    });

    rendition.on('relocated', (location: any) => {
        setCurrentCfi(location.start.cfi);
        // 更新進度百分比
        if (book.locations.length() > 0) {
            const percentage = book.locations.percentageFromCfi(location.start.cfi);
            setProgress(Math.round(percentage * 100) + '%');
        }
    });

    rendition.on('click', () => setSelectionMenu(null));

    // 鍵盤左右鍵翻頁支援
    const keyListener = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft") rendition.prev();
        if (e.key === "ArrowRight") rendition.next();
    };
    document.addEventListener("keyup", keyListener);

    return () => {
      document.removeEventListener("keyup", keyListener);
      if (bookInstance.current) bookInstance.current.destroy();
    };
  }, [bookData.id]); 

  // 即時更新樣式
  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current);
  }, [settings, applyTheme]);

  // 畫線邏輯
  const handleSaveAnnotation = async (type: 'highlight' | 'note') => {
    if (!selectionMenu) return;
    let annotationText = '';
    if (type === 'note') {
        const input = window.prompt("💡 筆記內容：");
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
    renditionRef.current?.annotations.add('highlight', newNote.cfi, {}, null, 'hl-style');
    setSelectionMenu(null);
  };

  // 翻頁動作
  const prevPage = () => renditionRef.current?.prev();
  const nextPage = () => renditionRef.current?.next();

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 flex flex-col overflow-hidden transition-colors duration-300" 
         style={{ backgroundColor: THEME_MAP[settings.theme].bg }}>
      
      {/* 頂部導航 (閱讀時自動淡化，滑鼠靠近顯示) */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-stone-900/5 bg-white/0 hover:bg-white/80 transition-all z-30 group">
        <button onClick={onClose} className="text-stone-500 hover:text-stone-800 flex items-center gap-1">
            <ChevronLeft size={24} />
            <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">書櫃</span>
        </button>
        <div className="text-xs text-stone-400 font-serif tracking-widest uppercase opacity-50">{bookData.title}</div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onUpdateSettings({ ...settings, fontSize: Math.max(80, settings.fontSize - 10) })} className="w-8 h-8 rounded-full bg-stone-200/50 text-xs">A-</button>
             <button onClick={() => onUpdateSettings({ ...settings, fontSize: Math.min(180, settings.fontSize + 10) })} className="w-8 h-8 rounded-full bg-stone-200/50 text-xs font-bold">A+</button>
        </div>
      </div>
  
      {/* 閱讀器主區域 */}
      <div className="flex-1 w-full relative">
        
        {/* 1. 書脊陰影效果 (模擬實體書中縫) */}
        {settings.theme === ThemeType.PARCHMENT && (
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] shadow-[0_0_30px_15px_rgba(0,0,0,0.08)] z-0 pointer-events-none transform -translate-x-1/2 h-full hidden md:block" />
        )}

        {/* 2. Epub 容器 */}
        <div ref={viewerRef} className="w-full h-full z-10 relative" />

        {/* 3. 隱形翻頁觸控區 (Tap Zones) */}
        <div className="absolute inset-y-0 left-0 w-[20%] z-20 cursor-w-resize active:bg-black/5 transition-colors" 
             onClick={prevPage} title="上一頁" />
        <div className="absolute inset-y-0 right-0 w-[20%] z-20 cursor-e-resize active:bg-black/5 transition-colors" 
             onClick={nextPage} title="下一頁" />

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 z-30 backdrop-blur-sm">
             <Loader2 className="animate-spin text-stone-400" size={40} />
          </div>
        )}

        {/* Selection Tooltip */}
        {selectionMenu && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center bg-stone-800 text-stone-100 rounded-full shadow-xl px-4 py-3 z-40 gap-4">
            <button onClick={() => handleSaveAnnotation('highlight')} className="flex items-center gap-2 hover:text-yellow-400">
              <Highlighter size={18} /> <span className="text-xs font-bold">劃線</span>
            </button>
            <div className="w-px h-4 bg-stone-600"></div>
            <button onClick={() => handleSaveAnnotation('note')} className="flex items-center gap-2 hover:text-blue-400">
              <PenLine size={18} /> <span className="text-xs font-bold">筆記</span>
            </button>
          </div>
        )}
      </div>

      {/* 底部進度條 */}
      <div className="h-8 flex items-center justify-center border-t border-stone-900/5 text-[10px] text-stone-400 font-sans tracking-widest bg-white/0 hover:bg-white/80 transition-all z-30">
        {progress ? `${progress} · ${bookData.author}` : '計算頁數中...'}
      </div>
    </div>
  );
};

export default Reader;