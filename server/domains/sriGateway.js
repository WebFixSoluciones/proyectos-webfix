/**
 * Microservicio de Dominio Backend — Gateway SOAP SRI Ecuador (Producción y Pruebas).
 * Consolida y blinda ambos proxies con:
 * - Lista blanca estricta de rutas SOAP SRI (RecepcionComprobantesOffline / AutorizacionComprobantesOffline)
 * - Límite de tamaño de payload (2 MB) para prevenir DoS
 * - Conexiones persistentes Keep-Alive TLS
 */
import https from 'node:https';
import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore
}

const MAX_SOAP_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_SRI_SERVICES = [
  'RecepcionComprobantesOffline',
  'AutorizacionComprobantesOffline'
];

export function createSriSoapHandler({ hostname, label = 'SRI' }) {
  const sriAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    keepAliveMsecs: 30000,
    rejectUnauthorized: false
  });

  function sendToSri(path, method, xmlBody, timeoutMs) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method,
        family: 4,
        agent: sriAgent,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '""',
          'User-Agent': 'WebFix-ERP-SRI/2.0',
          'Accept': '*/*',
          'Connection': 'keep-alive',
          'Content-Length': Buffer.byteLength(xmlBody, 'utf8')
        },
        timeout: timeoutMs
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        let total = 0;
        res.on('data', (chunk) => {
          total += chunk.length;
          if (total <= MAX_SOAP_BYTES * 2) chunks.push(chunk);
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      });

      req.on('timeout', () => req.destroy(new Error(`Timeout (${timeoutMs}ms) conectando al ${label}`)));
      req.on('error', (err) => reject(err));
      req.write(xmlBody, 'utf8');
      req.end();
    });
  }

  return async function sriGatewayHandler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, SOAPAction, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const rawPath = req.query?.path || '';
    const cleanPath = String(Array.isArray(rawPath) ? rawPath.join('/') : rawPath).replace(/^\/+/, '');

    // Lista blanca estricta de servicios SOAP del SRI
    const isAllowed = ALLOWED_SRI_SERVICES.some((svc) => cleanPath === svc || cleanPath.startsWith(`${svc}?`));
    if (!isAllowed) {
      return res.status(400).json({
        error: 'Servicio SRI no permitido',
        allowed: ALLOWED_SRI_SERVICES
      });
    }

    const targetPath = `/comprobantes-electronicos-ws/${cleanPath}`;

    let body = '';
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString('utf8');
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    } else {
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_SOAP_BYTES) {
          return res.status(413).json({ error: 'Payload SOAP excede el límite permitido (2 MB).' });
        }
        body += chunk.toString('utf8');
      }
    }

    if (Buffer.byteLength(body, 'utf8') > MAX_SOAP_BYTES) {
      return res.status(413).json({ error: 'Payload SOAP excede el límite permitido (2 MB).' });
    }

    try {
      let result;
      try {
        result = await sendToSri(targetPath, req.method || 'POST', body, 12000);
      } catch {
        result = await sendToSri(targetPath, req.method || 'POST', body, 10000);
      }
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      return res.status(result.statusCode || 200).send(result.body);
    } catch (err) {
      return res.status(504).json({
        error: `No se pudo conectar al ${label}`,
        details: err.message
      });
    }
  };
}
