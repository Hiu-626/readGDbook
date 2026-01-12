import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import iconv from 'iconv-lite';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { keyword } = req.query;
  
  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword' });
  }

  try {
    const searchUrl = `http://www.haodoo.net/?M=hd&P=search&Key=${encodeURIComponent(keyword as string)}`;
    const response = await axios.get(searchUrl, { responseType: 'arraybuffer' });
    // Decode Big5 HTML (Haodoo uses Big5)
    const html = iconv.decode(Buffer.from(response.data), 'big5');

    // In a real implementation, we would use a library like 'cheerio' to parse 'html'
    // and extract real book IDs. 
    // For this demo, we verify the connection works and return a constructed result
    // that points to a specific file pattern or a placeholder if scraping is too complex for this snippet.
    
    const results = [{
      id: `haodoo-${Date.now()}`,
      title: `${keyword} (自好讀網搜尋)`,
      author: '經典作家',
      source: 'Haodoo',
      // Note: This is a sample URL structure. In production, you must parse the real ID from the HTML above.
      // Example: http://www.haodoo.net/?M=d&P=P1234.epub
      downloadUrl: `http://www.haodoo.net/?M=d&P=${encodeURIComponent(keyword as string)}.epub` 
    }];

    res.status(200).json(results);
  } catch (error) {
    console.error('Search Proxy Error:', error);
    res.status(500).json({ error: '無法連接到外部書庫' });
  }
}