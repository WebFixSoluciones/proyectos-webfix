/* global Buffer */
// Función serverless de Vercel: proxy server-side de los WebServices SOAP del SRI
// en AMBIENTE DE PRUEBAS (celcer.sri.gob.ec).
const SRI_HOST = 'https://celcer.sri.gob.ec';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const segs = req.query?.path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const target = `${SRI_HOST}/${cleanPath}`;

  let body;
  if (req.body) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString('utf8');
    } else {
      body = JSON.stringify(req.body);
    }
  } else {
    body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  }

  let lastErr = null;
  const headers = {
    'Content-Type': 'text/xml;charset=utf-8',
    'SOAPAction': '',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 WebFix/2.0',
    'Accept': 'text/xml, text/html, */*',
    'Connection': 'close'
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const sriRes = await fetch(target, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await sriRes.text();
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      res.status(sriRes.status).send(text);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  const cause = lastErr?.cause ? ` (${lastErr.cause.code || lastErr.cause.message || lastErr.cause})` : '';
  res.status(502).send(`<error>Fallo el proxy del SRI (pruebas): ${lastErr?.message || lastErr}${cause}</error>`);
}

