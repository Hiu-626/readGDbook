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
    // 注意：好讀網搜尋 URL 格式為 ?M=hd&P=search&Key=...
    const searchUrl = `http://www.haodoo.net/?M=hd&P=search&Key=${encodeURIComponent(keyword)}`;
    
    const response = await axios.get(searchUrl, {
      responseType: 'arraybuffer', // 必須抓取原始二進制數據以處理 Big5
      timeout: 8000 // 給予較長超時，避免對方伺服器慢
    });

    // 2. 解碼 Big5 HTML
    const html = iconv.decode(Buffer.from(response.data), 'big5');

    // 3. 使用 Regex 提取書籍 ID
    // 目標格式通常是 href="?M=book&P=1234" 或 onClick="SetTitle('1234')"
    // 我們抓取 ?M=book&P=([\w\d]+) 這種最常見的連結模式
    const regex = /\?M=book&P=([A-Za-z0-9]+)/g;
    const matches = [...html.matchAll(regex)];
    
    // 過濾重複 ID
    const uniqueIds = new Set();
    const results = [];

    for (const match of matches) {
        const bookId = match[1];
        if (!uniqueIds.has(bookId)) {
            uniqueIds.add(bookId);
            results.push({
                id: `haodoo-${bookId}`,
                title: `${keyword} (ID: ${bookId})`, // 暫時無法從簡單 regex 抓取精確書名，用 ID 標示
                author: '好讀藏書',
                source: 'Haodoo',
                // 構造真實的下載連結 (這是好讀網下載 EPUB 的標準格式)
                downloadUrl: `http://www.haodoo.net/?M=d&P=${bookId}.epub`
            });
        }
        if (results.length >= 5) break; // 最多抓 5 本，避免列表過長
    }

    // 4. 如果沒抓到結果，回傳 Gutenberg 的真實書籍作為保底，確保測試流程能走通
    if (results.length === 0) {
      console.log('[Search Proxy] No results found on Haodoo, returning fallback.');
      return res.status(200).json([{
        id: 'gutenberg-fallback',
        title: `未找到「${keyword}」，試試這本測試書`,
        author: 'William Shakespeare',
        source: 'Gutenberg',
        downloadUrl: 'https://www.gutenberg.org/ebooks/1513.epub.images'
      }]);
    }

    console.log(`[Search Proxy] Found ${results.length} books.`);
    res.status(200).json(results);

  } catch (error: any) {
    console.error('[Search Proxy] Error:', error.message);
    // 回傳錯誤但不崩潰，方便前端顯示
    res.status(500).json({ 
        error: '無法連接到好讀網', 
        details: error.message 
    });
  }
}