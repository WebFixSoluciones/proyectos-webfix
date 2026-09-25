/* global Buffer */
import https from 'https';

// Función serverless de Vercel: proxy server-side de los WebServices SOAP del SRI
// en AMBIENTE DE PRODUCCIÓN (cel.sri.gob.ec).
const SRI_HOST = 'https://cel.sri.gob.ec';

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

function postWithHttps(targetUrl, headers, body, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const reqHeaders = {
      ...headers,
      'Content-Length': Buffer.byteLength(body),
    };

    const req = https.request({
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'POST',
      headers: reqHeaders,
      rejectUnauthorized: false, // Bypass cert chain issues on SRI government servers
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 200, text: data });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout de ${timeoutMs}ms contactando al SRI (${urlObj.hostname})`));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const segs = req.query?.path;
  const path = Array.isArray(segs) ? segs.join('/') : (segs || '');
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
      // Prioridad 1: https.request nativo con rejectUnauthorized: false (evita fetch failed)
      const result = await postWithHttps(target, headers, body, 20000);
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      res.status(result.status).send(result.text);
      return;
    } catch (err) {
      lastErr = err;
      try {
        // Fallback: fetch estándar
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
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
      } catch (fetchErr) {
        lastErr = err || fetchErr;
      }

      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  const cause = lastErr?.cause ? ` (${lastErr.cause.code || lastErr.cause.message || lastErr.cause})` : '';
  res.status(502).send(`<error>Fallo el proxy del SRI (producción): ${lastErr?.message || lastErr}${cause}</error>`);
}
