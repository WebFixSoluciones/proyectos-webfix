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
  const path = Array.isArray(segs) ? segs.join('/') : (segs || '');
  const target = `${SRI_HOST}/${path}`;

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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const sriRes = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml;charset=utf-8', 'SOAPAction': '' },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await sriRes.text();
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.status(sriRes.status).send(text);
  } catch (err) {
    res.status(502).send(`<error>Fallo el proxy del SRI (pruebas): ${err.message || err}</error>`);
  }
}

