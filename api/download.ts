import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    // Request the external file with headers to mimic a real iPad browser visiting the site
    // This often bypasses hotlink protection (Referer check).
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Referer': 'http://www.haodoo.net/' 
      }
    });

    // Forward headers appropriate for an EPUB download
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', 'attachment; filename="book.epub"');
    
    // Send the binary data
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).send('Proxy Download Failed');
  }
}