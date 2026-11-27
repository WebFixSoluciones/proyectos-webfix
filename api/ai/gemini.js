import process from 'node:process';
import { adminServices } from '../../server/firebaseAdmin.js';

export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite'
];

const errorWithStatus = (message, status) => Object.assign(new Error(message), { status });

async function resolveServerApiKey(db, tenantId, overrideKey) {
  const envKey = String(
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ''
  ).trim();
  if (envKey) return envKey;

  const cleanOverride = String(overrideKey || '').trim();
  if (cleanOverride) return cleanOverride;

  if (db && tenantId) {
    try {
      const metaSnap = await db.doc(`artifacts/${tenantId}/public/data/meta/info`).get();
      const metaKey = String(metaSnap.data()?.geminiApiKey || '').trim();
      if (metaKey) return metaKey;
      const cfgSnap = await db.doc(`artifacts/${tenantId}/public/data/finances_settings/config`).get();
      const cfgKey = String(cfgSnap.data()?.geminiApiKey || '').trim();
      if (cfgKey) return cfgKey;
    } catch {
      // ignore lookup failures and let missing-key error handle it
    }
  }
  return '';
}

export async function callGeminiRest({ apiKey, contents, generationConfig, fetchImpl = fetch, models = GEMINI_FALLBACK_MODELS }) {
  let lastError = null;
  for (const model of models) {
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
      return { text, model, raw: result };
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Error HTTP ${response.status} en Gemini (${model})`;
    lastError = errorWithStatus(errMsg, response.status);

    // Retry next model only on model-unavailable (404), overloaded (503), or rate-limit (429)
    if (![404, 429, 503].includes(response.status)) {
      throw lastError;
    }
  }
  throw lastError || errorWithStatus('No se pudo conectar con ningún modelo de Gemini.', 502);
}

export function createGeminiHandler({ getServices = adminServices, fetchImpl = fetch } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido.' });
    }

    const token = /^Bearer ([^\s]+)$/.exec(req.headers?.authorization || '')?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Inicia sesión para usar el asistente de IA.' });
    }

    try {
      const { auth, db } = getServices();
      let caller;
      try {
        caller = await auth.verifyIdToken(token, false);
      } catch {
        throw errorWithStatus('Tu sesión no es válida. Inicia sesión nuevamente.', 401);
      }

      const profileSnap = await db.doc(`users/${caller.uid}`).get();
      const profile = profileSnap.data();
      if (!profile || profile.status !== 'active') {
        throw errorWithStatus('Tu cuenta no tiene permisos activos para usar la IA.', 403);
      }

      const { action, contents, generationConfig, apiKey: clientApiKey } = req.body || {};
      const apiKey = await resolveServerApiKey(db, profile.tenantId, clientApiKey);
      if (!apiKey) {
        throw errorWithStatus(
          'No hay una clave API de Gemini configurada. Ingresa tu clave en Ajustes → Google Gemini o configura GEMINI_API_KEY en el servidor.',
          503
        );
      }

      if (action === 'ping') {
        const pingResult = await callGeminiRest({
          apiKey,
          contents: [{ parts: [{ text: 'Responde únicamente: OK' }] }],
          fetchImpl
        });
        return res.status(200).json({ ok: true, model: pingResult.model, text: pingResult.text });
      }

      if (!Array.isArray(contents) || contents.length === 0) {
        throw errorWithStatus('Contenido de consulta inválido.', 400);
      }

      const result = await callGeminiRest({ apiKey, contents, generationConfig, fetchImpl });
      return res.status(200).json({ text: result.text, model: result.model });
    } catch (error) {
      const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
      if (status === 500) {
        console.error('Error en proxy Gemini:', error.message || error);
      }
      return res.status(status).json({
        error: error.message || 'Error al procesar la solicitud con Gemini IA.'
      });
    }
  };
}

export default createGeminiHandler();
