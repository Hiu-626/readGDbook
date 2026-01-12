import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    console.log(`[Download Proxy] Fetching: ${url}`);
    
    // 偽裝成 iPad Safari 請求，繞過防盜鏈 (Hotlink Protection)
    const response = await axios.get(url, {
      responseType: 'arraybuffer', // 關鍵：必須以二進制方式接收
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Referer': 'http://www.haodoo.net/', // 關鍵：告訴伺服器我們來自其主站
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000 // 下載大檔可能需要時間
    });

    console.log(`[Download Proxy] Success. Size: ${response.data.length} bytes`);

    // 設定 CORS 標頭，允許前端存取
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // 強制設定 EPUB 相關標頭，確保前端能正確識別為檔案
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', 'attachment; filename="download.epub"');
    
    // 回傳二進制數據
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error('[Download Proxy] Error:', error.message);
    
    // 嘗試回傳 500 讓前端知道失敗
    res.status(500).send(`Download failed: ${error.message}`);
  }
}