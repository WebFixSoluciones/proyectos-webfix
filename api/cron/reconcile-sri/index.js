/* global Buffer */
import https from 'https';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { parseSriAuthorization } from '../../../src/services/sriAuthorization.js';

export const config = {
  maxDuration: 60,
};

const SRI_HOST_PROD = 'https://cel.sri.gob.ec';
const SRI_HOST_TEST = 'https://celcer.sri.gob.ec';

function postSoapToSri(targetUrl, soapBody, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const reqHeaders = {
      'Content-Type': 'text/xml;charset=utf-8',
      'SOAPAction': '',
      'Content-Length': Buffer.byteLength(soapBody),
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
    req.write(soapBody);
    req.end();
  });
}

async function querySriAuthorizationDirect(claveAcceso, ambiente = '1') {
  if (!/^\d{49}$/.test(claveAcceso)) {
    throw new Error('La clave de acceso debe contener 49 dígitos numéricos.');
  }

  const isProd = String(ambiente) === '2';
  const baseUrl = isProd ? SRI_HOST_PROD : SRI_HOST_TEST;
  const endpoint = `${baseUrl}/comprobantes-electronicos-ws/AutorizacionComprobantesOffline`;

  const soap = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion"><soapenv:Body><ec:autorizacionComprobante><claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante></ec:autorizacionComprobante></soapenv:Body></soapenv:Envelope>`;

  const resp = await postSoapToSri(endpoint, soap);
  if (resp.status !== 200) {
    throw new Error(`El SRI respondió HTTP ${resp.status}`);
  }

  // Ensure DOMParser is globally available for parser
  globalThis.DOMParser = DOMParser;
  globalThis.XMLSerializer = XMLSerializer;

  return parseSriAuthorization(resp.text, claveAcceso, DOMParser);
}

export default async function handler(req, res) {
  // Permitir GET (llamadas de Vercel Cron) y POST (llamadas programáticas o manuales)
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Verificación de seguridad si CRON_SECRET está configurado en variables de entorno
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || req.headers['x-vercel-cron'] === 'true';

  if (cronSecret && !isVercelCron) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      res.status(401).json({ error: 'Unauthorized: Invalid cron secret' });
      return;
    }
  }

  const documentsToProcess = Array.isArray(req.body?.documents) ? req.body.documents : [];

  const results = [];
  let authorizedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  for (const doc of documentsToProcess) {
    const clave = doc.claveAcceso || doc.key;
    const ambiente = doc.ambiente || doc.sriAmbiente || clave?.[23] || '1';
    
    if (!clave || !/^\d{49}$/.test(clave)) {
      results.push({
        id: doc.id,
        claveAcceso: clave,
        status: 'error_clave',
        message: 'Clave de acceso ausente o inválida'
      });
      failedCount++;
      continue;
    }

    try {
      const sriResult = await querySriAuthorizationDirect(clave, ambiente);
      results.push({
        id: doc.id,
        tenantId: doc.tenantId,
        claveAcceso: clave,
        status: sriResult.status,
        fechaAutorizacion: sriResult.fechaAutorizacion || null,
        xmlAutorizado: sriResult.xmlAutorizado || null,
        message: sriResult.message || null
      });

      if (sriResult.status === 'autorizado') {
        authorizedCount++;
      } else if (sriResult.status === 'pendiente_sri') {
        pendingCount++;
      } else {
        failedCount++;
      }
    } catch (err) {
      results.push({
        id: doc.id,
        tenantId: doc.tenantId,
        claveAcceso: clave,
        status: 'error_conexion',
        message: err.message
      });
      failedCount++;
    }

    // Pequeño throttle de 200ms entre consultas en el endpoint cron
    if (documentsToProcess.length > 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    mode: isVercelCron ? 'vercel_cron' : req.method,
    summary: {
      total: documentsToProcess.length,
      authorized: authorizedCount,
      stillPending: pendingCount,
      failed: failedCount
    },
    results
  });
}
