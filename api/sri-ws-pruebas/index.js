/* global Buffer */
// Función serverless de Vercel: proxy server-side de los WebServices SOAP del SRI
// en AMBIENTE DE PRUEBAS (celcer.sri.gob.ec).
//
// ¿Por qué existe? El navegador no puede llamar directo al SRI (CORS) y los
// `rewrites` de Vercel hacia URLs externas no reenvían de forma fiable el cuerpo
// POST del SOAP. Esta función reenvía la petición server-side (sin CORS), con
// control total del cuerpo, las cabeceras y el timeout, y devuelve el XML crudo.
//
// El cliente llama, por ejemplo:
//   POST /api/sri-ws-pruebas/comprobantes-electronicos-ws/RecepcionComprobantesOffline
// y se reenvía a:
//   https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
const SRI_HOST = 'https://celcer.sri.gob.ec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Reconstruir la ruta destino a partir del catch-all [...path]
  const segs = req.query?.path;
  const path = Array.isArray(segs) ? segs.join('/') : (segs || '');
  const target = `${SRI_HOST}/${path}`;

  // Obtener el cuerpo SOAP crudo. Vercel entrega text/xml como string en req.body;
  // si no estuviera, lo leemos del stream.
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
    res.status(502).send(`<error>Fallo el proxy del SRI (pruebas): ${err.message || err}</error>`);
  }
}
