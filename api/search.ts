import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import iconv from 'iconv-lite';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { keyword } = req.query;
  
  if (!keyword || typeof keyword !== 'string') {
    return res.status(400).json({ error: 'Missing keyword' });
  }

  try {
    console.log(`[Search Proxy] Searching Haodoo for: ${keyword}`);

    // 1. 爬取好讀網搜尋結果頁面 (Big5 編碼)
    const searchUrl = `http://www.haodoo.net/?M=hd&P=search&Key=${encodeURIComponent(keyword)}`;
    
    const response = await axios.get(searchUrl, {
      responseType: 'arraybuffer', // 必須抓取原始二進制數據以處理 Big5
      timeout: 8000
    });

    // 2. 解碼 Big5 HTML
    const html = iconv.decode(Buffer.from(response.data), 'big5');

    // 3. 使用 Regex 提取書籍 ID
    // 抓取 ?M=book&P=([\w\d]+) 這種最常見的連結模式
    const regex = /\?M=book&P=([A-Za-z0-9]+)/g;
    const matches = [...html.matchAll(regex)];
    
    const uniqueIds = new Set();
    const results = [];

    for (const match of matches) {
        const bookId = match[1];
        
        // 嚴格過濾：
        // 1. 去除重複 ID
        // 2. 去除 'audio' 開頭的 ID (這些是有聲書，沒有 EPUB)
        if (!uniqueIds.has(bookId) && !bookId.toLowerCase().startsWith('audio')) {
            uniqueIds.add(bookId);
            results.push({
                id: `haodoo-${bookId}`,
                title: `${keyword} (ID: ${bookId})`, 
                author: '好讀藏書',
                source: 'Haodoo',
                downloadUrl: `http://www.haodoo.net/?M=d&P=${bookId}.epub`
            });
        }
        if (results.length >= 5) break; 
    }

    // 4. Fallback (保底)
    if (results.length === 0) {
      console.log('[Search Proxy] No EPUB results found on Haodoo.');
      // 僅在沒有任何結果時回傳測試書，方便開發者確認系統運作中
      return res.status(200).json([{
        id: 'gutenberg-fallback',
        title: `未找到「${keyword}」的 EPUB`,
        author: 'System',
        source: 'Gutenberg',
        downloadUrl: 'https://www.gutenberg.org/ebooks/1513.epub.images'
      }]);
    }

    console.log(`[Search Proxy] Found ${results.length} valid books.`);
    res.status(200).json(results);

  } catch (error: any) {
    console.error('[Search Proxy] Error:', error.message);
    res.status(500).json({ 
        error: '無法連接到好讀網', 
        details: error.message 
    });
  }
}