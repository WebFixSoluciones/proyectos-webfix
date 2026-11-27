/**
 * Helpers puros para payload, MIME, parsing y normalización de facturas con Google Gemini.
 * Sin dependencias de Firebase ni Vite para pruebas unitarias directas en Node ESM.
 */

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

export function buildModelChain(preferredModel = '') {
  const clean = String(preferredModel || '').trim();
  if (!clean) return [...GEMINI_MODELS];
  return [clean, ...GEMINI_MODELS.filter(m => m !== clean)];
}

const MIME_BY_EXTENSION = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif'
};

export function inferMimeType(file) {
  const rawType = String(file?.type || '').trim().toLowerCase();
  if (rawType && rawType !== 'application/octet-stream') {
    return rawType;
  }
  const name = String(file?.name || '').trim().toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return MIME_BY_EXTENSION[ext] || 'application/pdf';
}

export function buildFilePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: String(base64Data || ''),
      mimeType: String(mimeType || 'application/pdf')
    }
  };
}

export function parseGeminiJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('La IA devolvió una respuesta vacía.');
  }
  let cleaned = rawText.trim();
  // Eliminar posibles bloques markdown ```json ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Intentar extraer el primer objeto JSON balanceado si vino con texto extra
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('La respuesta de la IA no tiene el formato JSON esperado. Intenta subir el archivo nuevamente.');
  }
}

export function normalizeExtractedInvoice(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const toNum = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const cleaned = String(v ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const cleanClave = String(raw.claveAcceso || '').replace(/\D/g, '');
  const claveAcceso = cleanClave.length === 49 ? cleanClave : '';

  const rawDate = String(raw.date || '').trim();
  let date = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    date = rawDate;
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
    const [d, m, y] = rawDate.split('/');
    date = `${y}-${m}-${d}`;
  }

  const baseImponible = toNum(raw.baseImponible);
  const ivaValor = toNum(raw.ivaValor);
  let total = toNum(raw.total);
  if (total <= 0 && (baseImponible > 0 || ivaValor > 0)) {
    total = Number((baseImponible + ivaValor).toFixed(2));
  }

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems
    .filter(item => item && (item.name || item.descripcion || item.description))
    .map(item => {
      const qty = Math.max(0.01, toNum(item.quantity ?? item.cantidad ?? 1) || 1);
      const price = toNum(item.price ?? item.precioUnitario ?? item.unitPrice ?? 0);
      const lineTotal = toNum(item.total ?? item.subtotal) || Number((qty * price).toFixed(2));
      const ivaRate = toNum(item.ivaRate ?? item.iva ?? (ivaValor > 0 ? 15 : 0));
      return {
        code: String(item.code || item.codigo || '').trim(),
        name: String(item.name || item.descripcion || item.description || '').trim(),
        quantity: qty,
        price: price > 0 ? price : Number((lineTotal / qty).toFixed(4)),
        ivaRate,
        total: lineTotal
      };
    });

  const validMethods = ['transferencia', 'efectivo', 'tarjeta', 'credito', 'cheque'];
  const rawMethod = String(raw.paymentMethod || 'transferencia').toLowerCase().trim();
  const paymentMethod = validMethods.includes(rawMethod) ? rawMethod : 'transferencia';

  return {
    ruc: String(raw.ruc || '').replace(/\s+/g, '').trim(),
    razonSocial: String(raw.razonSocial || '').trim(),
    documentNumber: String(raw.documentNumber || '').trim(),
    claveAcceso,
    date,
    baseImponible,
    ivaValor,
    total,
    paymentMethod,
    category: String(raw.category || 'otros').trim(),
    description: String(raw.description || raw.concepto || '').trim(),
    email: String(raw.email || '').trim(),
    phone: String(raw.phone || '').trim(),
    items
  };
}
