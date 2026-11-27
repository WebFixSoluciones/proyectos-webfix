/**
 * Servicio de Inteligencia Artificial con Google Gemini
 * Permite OCR de facturas (PDF/Imágenes), extracción de ítems y clave SRI, y Chatbot Contable.
 */
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, getAppId } from '../firebase';
import {
  GEMINI_MODELS,
  inferMimeType,
  buildFilePart,
  parseGeminiJsonResponse,
  normalizeExtractedInvoice
} from '../utils/geminiHelpers';

export {
  GEMINI_MODELS,
  inferMimeType,
  buildFilePart,
  parseGeminiJsonResponse,
  normalizeExtractedInvoice
};

// Obtener la clave API desde localStorage, env o Firestore del tenant
function getLocalOrEnvApiKey() {
  try {
    const localKey = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('finances_gemini_api_key') || '').trim()
      : '';
    if (localKey) return localKey;
  } catch {
    // localStorage unavailable (tests/SSR)
  }
  const envKey = String(import.meta?.env?.VITE_GEMINI_API_KEY || '').trim();
  return envKey;
}

async function resolveGeminiApiKey() {
  const immediate = getLocalOrEnvApiKey();
  if (immediate) return immediate;

  try {
    const currentAppId = typeof getAppId === 'function' ? getAppId() : '';
    if (db && currentAppId) {
      const metaSnap = await getDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'meta', 'info'));
      const metaKey = String(metaSnap.data()?.geminiApiKey || '').trim();
      if (metaKey) {
        try { localStorage.setItem('finances_gemini_api_key', metaKey); } catch { /* noop */ }
        return metaKey;
      }
      const cfgSnap = await getDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'finances_settings', 'config'));
      const cfgKey = String(cfgSnap.data()?.geminiApiKey || '').trim();
      if (cfgKey) {
        try { localStorage.setItem('finances_gemini_api_key', cfgKey); } catch { /* noop */ }
        return cfgKey;
      }
    }
  } catch {
    // Firestore lookup failed; fall through to server proxy
  }
  return '';
}

// Convertir un archivo en base64 legible para Gemini (Parte válida con wrapper inlineData)
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = String(reader.result || '');
      const commaIdx = raw.indexOf(',');
      const base64Data = commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw;
      if (!base64Data) {
        reject(new Error('No se pudo leer el contenido del archivo.'));
        return;
      }
      resolve(buildFilePart(base64Data, inferMimeType(file)));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

async function callGeminiDirect({ apiKey, contents, generationConfig, fetchImpl = fetch }) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(generationConfig ? { generationConfig } : {})
      })
    });

    if (response.ok) {
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts
        ?.map(p => p?.text || '')
        .join('')
        .trim() || '';
      return { text, model };
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Error HTTP ${response.status} al conectar con Gemini`;
    lastError = new Error(errMsg);
    if (![404, 429, 503].includes(response.status)) {
      throw lastError;
    }
  }
  throw lastError || new Error('No se pudo conectar con los modelos de Gemini.');
}

async function callGeminiViaProxy({ action, contents, generationConfig, apiKey, fetchImpl = fetch }) {
  const token = await auth?.currentUser?.getIdToken?.();
  if (!token) {
    throw new Error('No se ha configurado la clave API de Gemini. Configúrala en Ajustes → Google Gemini.');
  }
  const response = await fetchImpl('/api/ai/gemini', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...(action ? { action } : {}),
      ...(contents ? { contents } : {}),
      ...(generationConfig ? { generationConfig } : {}),
      ...(apiKey ? { apiKey } : {})
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(
      data?.error ||
      'No se ha configurado la clave API de Gemini. Ingresa tu clave en Ajustes → Google Gemini.'
    );
  }
  return data;
}

async function generateWithGemini({ contents, generationConfig, apiKeyOverride } = {}) {
  const apiKey = String(apiKeyOverride || '').trim() || await resolveGeminiApiKey();
  if (apiKey) {
    return callGeminiDirect({ apiKey, contents, generationConfig });
  }
  return callGeminiViaProxy({ contents, generationConfig });
}

export async function probarConexionGemini(apiKeyOverride = '') {
  const cleanOverride = String(apiKeyOverride || '').trim();
  if (cleanOverride) {
    return callGeminiDirect({
      apiKey: cleanOverride,
      contents: [{ parts: [{ text: 'Responde únicamente: OK' }] }]
    });
  }
  const resolved = await resolveGeminiApiKey();
  if (resolved) {
    return callGeminiDirect({
      apiKey: resolved,
      contents: [{ parts: [{ text: 'Responde únicamente: OK' }] }]
    });
  }
  return callGeminiViaProxy({ action: 'ping' });
}

// Parseador de XML nativo para evitar llamadas innecesarias a Gemini en archivos XML
export function parsearXMLComprobante(xmlText) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const ruc = xmlDoc.getElementsByTagName('ruc')[0]?.textContent || '';
    const razonSocial = xmlDoc.getElementsByTagName('razonSocial')[0]?.textContent || '';
    const correo = xmlDoc.getElementsByTagName('correoElectronico')[0]?.textContent ||
                   xmlDoc.getElementsByTagName('email')[0]?.textContent || '';
    const telefono = xmlDoc.getElementsByTagName('telefono')[0]?.textContent || '';

    const estab = xmlDoc.getElementsByTagName('estab')[0]?.textContent || '001';
    const ptoEmi = xmlDoc.getElementsByTagName('ptoEmi')[0]?.textContent || '001';
    const secuencial = xmlDoc.getElementsByTagName('secuencial')[0]?.textContent || '';
    const documentNumber = secuencial ? `${estab}-${ptoEmi}-${secuencial}` : '';

    const fechaEmisionRaw = xmlDoc.getElementsByTagName('fechaEmision')[0]?.textContent || '';
    let date = new Date().toISOString().split('T')[0];
    if (fechaEmisionRaw) {
      const partes = fechaEmisionRaw.split('/');
      if (partes.length === 3) {
        date = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    }

    const baseImponible = parseFloat(xmlDoc.getElementsByTagName('totalSinImpuestos')[0]?.textContent || '0');
    const total = parseFloat(xmlDoc.getElementsByTagName('importeTotal')[0]?.textContent || '0');
    const ivaValor = parseFloat(xmlDoc.getElementsByTagName('valor')[0]?.textContent || (total - baseImponible).toFixed(2));

    let category = 'otros';
    const razonSocialLower = razonSocial.toLowerCase();
    if (razonSocialLower.includes('movistar') || razonSocialLower.includes('claro') || razonSocialLower.includes('cnt') || razonSocialLower.includes('netlife')) {
      category = 'gastos_administrativos';
    } else if (razonSocialLower.includes('supermaxi') || razonSocialLower.includes('comisariato') || razonSocialLower.includes('restaurante') || razonSocialLower.includes('alimentos')) {
      category = 'gastos_administrativos';
    } else if (razonSocialLower.includes('facebook') || razonSocialLower.includes('google') || razonSocialLower.includes('hosting') || razonSocialLower.includes('aws')) {
      category = 'gastos_marketing';
    } else if (razonSocialLower.includes('sri') || razonSocialLower.includes('municipio') || razonSocialLower.includes('notaria')) {
      category = 'gastos_administrativos';
    }

    return {
      success: true,
      data: {
        ruc,
        razonSocial,
        documentNumber,
        date,
        baseImponible,
        ivaPorcentaje: 15,
        ivaValor,
        retencionFuente: 0,
        retencionIva: 0,
        total,
        paymentMethod: 'transferencia',
        category,
        email: correo,
        phone: telefono
      }
    };
  } catch (err) {
    console.error('Error al parsear XML nativo', err);
    return { success: false, error: err.message };
  }
}

// Analizar archivo PDF o Imagen con Gemini (2.5 Flash con fallback)
export async function analizarComprobanteConGemini(file) {
  if (!file) {
    throw new Error('Selecciona un archivo PDF o imagen válido.');
  }
  if (file.size && file.size > 15 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 15 MB. Comprime el PDF o sube una captura.');
  }

  const generativePart = await fileToGenerativePart(file);
  const prompt = `Actúa como un extractor experto de facturas y comprobantes electrónicos del SRI de Ecuador.
Analiza el PDF o imagen adjunto y extrae TODOS los datos en formato JSON estricto.
Esquema de salida JSON esperado:
{
  "ruc": "Número de RUC o CI del emisor/proveedor (10 o 13 dígitos, solo números)",
  "razonSocial": "Razón Social o Nombre Comercial del emisor/proveedor",
  "documentNumber": "Número de factura en formato 001-001-000000001",
  "claveAcceso": "Clave de acceso SRI de exactamente 49 dígitos si aparece en el documento, sino cadena vacía",
  "date": "Fecha de emisión en formato YYYY-MM-DD",
  "baseImponible": 0.00,
  "ivaValor": 0.00,
  "total": 0.00,
  "paymentMethod": "transferencia",
  "category": "compras",
  "description": "Resumen corto de lo comprado (máx 100 caracteres)",
  "email": "Correo del emisor si aparece",
  "phone": "Teléfono del emisor si aparece",
  "items": [
    {
      "code": "Código principal del producto si existe",
      "name": "Descripción del producto o servicio",
      "quantity": 1,
      "price": 0.00,
      "ivaRate": 15,
      "total": 0.00
    }
  ]
}
Reglas:
- "paymentMethod" debe ser uno de: 'transferencia', 'efectivo', 'tarjeta', 'credito'.
- "category" debe ser uno de: 'compras', 'costos', 'gastos_administrativos', 'gastos_marketing', 'activos', 'otros'.
- Todos los montos y cantidades deben ser números (no strings).
- Extrae cada línea de detalle en "items".
- Devuelve únicamente el objeto JSON válido, sin markdown ni texto adicional.`;

  const { text } = await generateWithGemini({
    contents: [{
      parts: [
        generativePart,
        { text: prompt }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const parsed = parseGeminiJsonResponse(text);
  return normalizeExtractedInvoice(parsed);
}

// Chatbot Contable Asistente
export async function chatearConAsistenteContable(mensaje, historial, transactions) {
  const contextData = {
    totalComprobantes: transactions.length,
    comprobantesResumen: transactions.slice(0, 50).map(t => ({
      fecha: t.date,
      tipo: t.type,
      documento: t.documentNumber,
      total: t.total,
      categoria: t.category,
      sriStatus: t.sriStatus
    }))
  };

  const systemPrompt = `Eres un Asistente Contable Inteligente integrado en el ERP de control de ingresos y egresos de la empresa.
Responde las dudas financieras del usuario de forma clara, directa y estructurada en formato markdown.
Contexto financiero actual:
${JSON.stringify(contextData)}
Usa estos datos reales para responder sumas, filtros, promedios, listados o alertas. Mantén tus respuestas profesionales y en español.`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Entendido. Estoy listo para asistirte con la información contable y tributaria de tu empresa.' }] }
  ];

  (historial || []).forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  contents.push({ role: 'user', parts: [{ text: mensaje }] });

  const { text } = await generateWithGemini({ contents });
  return text || 'No obtuve respuesta de la IA.';
}

// Analizar el contexto consolidado del ERP
export async function analizarERPContextoConGemini(projects, tasks, products, transactions) {
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  const lowStockProducts = products
    .filter(p => p.type === 'producto' && Number(p.stock) <= Number(p.minStock))
    .map(p => ({ name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock }));

  let totalIncome = 0;
  let totalExpense = 0;
  let outstandingCollections = 0;

  transactions.forEach(t => {
    const val = Number(t.total) || 0;
    if (t.type === 'ingreso') {
      totalIncome += val;
      if (t.paymentStatus === 'pendiente') outstandingCollections += val;
    } else if (t.type === 'egreso') {
      totalExpense += val;
    }
  });

  const contextData = {
    proyectos: { total: projects.length, tareasTotales: tasks.length, tareasPendientes: pendingTasks, tareasCompletadas: completedTasks },
    inventario: { totalItems: products.length, bajoStock: lowStockProducts },
    finanzas: {
      ingresosTotales: totalIncome.toFixed(2),
      egresosTotales: totalExpense.toFixed(2),
      cuentasPorCobrar: outstandingCollections.toFixed(2),
      balanceNeto: (totalIncome - totalExpense).toFixed(2)
    }
  };

  const prompt = `Eres un Consultor Estratégico de Negocios (AI ERP Advisor) integrado en el ERP de la empresa.
Analiza la siguiente información consolidada y genera un diagnóstico ejecutivo en español con Markdown claro:
${JSON.stringify(contextData)}
Incluye: 1) Análisis de Estado, 2) Alertas Críticas y 3) Recomendaciones de Acción concretas.`;

  const { text } = await generateWithGemini({
    contents: [{ parts: [{ text: prompt }] }]
  });
  return text || 'No obtuve respuesta de la IA.';
}

// Analizar texto copiado de una factura digital
export async function analizarTextoFacturaConGemini(texto) {
  const prompt = `Actúa como un extractor de datos de facturas del SRI de Ecuador a partir del siguiente texto:
"${texto}"

Extrae los datos en formato JSON estricto:
{
  "ruc": "Número de RUC o CI del emisor (10 o 13 dígitos)",
  "razonSocial": "Razón Social o Nombre del Emisor",
  "documentNumber": "Número de documento en formato 000-000-000000000",
  "claveAcceso": "Clave de acceso de 49 dígitos si aparece, sino vacío",
  "date": "Fecha de emisión en formato YYYY-MM-DD",
  "baseImponible": 0.00,
  "ivaValor": 0.00,
  "total": 0.00,
  "paymentMethod": "transferencia",
  "category": "gastos_administrativos",
  "description": "Concepto resumido",
  "email": "",
  "phone": ""
}
Devuelve únicamente el objeto JSON válido.`;

  const { text } = await generateWithGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const parsed = parseGeminiJsonResponse(text);
  return normalizeExtractedInvoice(parsed);
}
