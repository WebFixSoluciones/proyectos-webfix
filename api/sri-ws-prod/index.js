// Función serverless de Vercel: proxy server-side de los WebServices SOAP del SRI
// en AMBIENTE DE PRODUCCIÓN (cel.sri.gob.ec). Ver explicación en
// api/sri-ws-pruebas/[...path].js — esta es la variante de producción.
//
// El cliente llama, por ejemplo:
//   POST /api/sri-ws-prod/comprobantes-electronicos-ws/RecepcionComprobantesOffline
// y se reenvía a:
//   https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
const SRI_HOST = 'https://cel.sri.gob.ec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const segs = req.query?.path;
  const path = Array.isArray(segs) ? segs.join('/') : (segs || '');
  const target = `${SRI_HOST}/${path}`;

  let body = req.body;
  if (typeof body !== 'string') {
    if (body && Buffer.isBuffer(body)) {
      body = body.toString('utf8');
    } else if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      body = JSON.stringify(body);
    } else {
      body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
    }
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
    res.status(502).send(`<error>Fallo el proxy del SRI (producción): ${err.message || err}</error>`);
  }
}
