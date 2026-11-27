import process from 'node:process';
import { adminServices } from '../../server/firebaseAdmin.js';

export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

const PLATFORM_AI_DOC = 'platform_config/ai';

const errorWithStatus = (message, status) => Object.assign(new Error(message), { status });

export function buildServerModelChain(preferredModel = '') {
  const clean = String(preferredModel || '').trim();
  if (!clean || !GEMINI_FALLBACK_MODELS.includes(clean)) {
    return [...GEMINI_FALLBACK_MODELS];
  }
  return [clean, ...GEMINI_FALLBACK_MODELS.filter(m => m !== clean)];
}

export function maskApiKey(key) {
  const clean = String(key || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 6)}••••••${clean.slice(-4)}`;
}

async function readPlatformAiConfig(db) {
  if (!db) return null;
  try {
    const snap = await db.doc(PLATFORM_AI_DOC).get();
    if (!snap?.exists) return null;
    return snap.data() || null;
  } catch {
    return null;
  }
}

async function resolveServerAiConfig(db, tenantId, overrideKey) {
  const platformCfg = await readPlatformAiConfig(db);
  const preferredModel = GEMINI_FALLBACK_MODELS.includes(platformCfg?.preferredModel)
    ? platformCfg.preferredModel
    : GEMINI_FALLBACK_MODELS[0];
  const globalEnabled = platformCfg?.enabled !== false;

  const cleanOverride = String(overrideKey || '').trim();
  if (cleanOverride) {
    return {
      apiKey: cleanOverride,
      source: 'override',
      preferredModel,
      enabled: true,
      hasPlatformKey: Boolean(String(platformCfg?.geminiApiKey || '').trim()),
      hasEnvKey: Boolean(String(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim())
    };
  }

  const platformKey = String(platformCfg?.geminiApiKey || '').trim();
  const envKey = String(
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ''
  ).trim();

  // 1. Clave global administrada por SuperAdmin (tiene prioridad y no requiere redeploy)
  if (globalEnabled && platformKey) {
    return {
      apiKey: platformKey,
      source: 'platform',
      preferredModel,
      enabled: true,
      hasPlatformKey: true,
      hasEnvKey: Boolean(envKey)
    };
  }

  // 2. Variable de entorno global en Vercel (GEMINI_API_KEY)
  if (globalEnabled && envKey) {
    return {
      apiKey: envKey,
      source: 'env',
      preferredModel,
      enabled: true,
      hasPlatformKey: Boolean(platformKey),
      hasEnvKey: true
    };
  }

  // 3. Fallback opcional: clave dedicada configurada por una empresa específica
  if (db && tenantId) {
    try {
      const metaSnap = await db.doc(`artifacts/${tenantId}/public/data/meta/info`).get();
      const metaKey = String(metaSnap.data()?.geminiApiKey || '').trim();
      if (metaKey) {
        return {
          apiKey: metaKey,
          source: 'tenant',
          preferredModel,
          enabled: true,
          hasPlatformKey: Boolean(platformKey),
          hasEnvKey: Boolean(envKey)
        };
      }
      const cfgSnap = await db.doc(`artifacts/${tenantId}/public/data/finances_settings/config`).get();
      const cfgKey = String(cfgSnap.data()?.geminiApiKey || '').trim();
      if (cfgKey) {
        return {
          apiKey: cfgKey,
          source: 'tenant',
          preferredModel,
          enabled: true,
          hasPlatformKey: Boolean(platformKey),
          hasEnvKey: Boolean(envKey)
        };
      }
    } catch {
      // ignore lookup failures
    }
  }

  return {
    apiKey: '',
    source: 'none',
    preferredModel,
    enabled: globalEnabled,
    hasPlatformKey: Boolean(platformKey),
    hasEnvKey: Boolean(envKey)
  };
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

    // Retry next free-tier model on model-unavailable (404), overloaded (503), or free-tier quota limit (429)
    if (![404, 429, 503].includes(response.status)) {
      throw lastError;
    }
  }
  throw lastError || errorWithStatus('No se pudo conectar con ningún modelo gratuito de Gemini en este momento.', 502);
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
      const { auth, db, serverTimestamp } = getServices();
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

      const isSuperAdmin = String(profile.role || '').toLowerCase().trim() === 'superadmin';
      const { action, contents, generationConfig, apiKey: clientApiKey } = req.body || {};

      // Acción exclusiva SuperAdmin: guardar configuración global de IA (sin exponer clave a tenants)
      if (action === 'save_global_config') {
        if (!isSuperAdmin) {
          throw errorWithStatus('Solo el superadministrador puede configurar la IA global.', 403);
        }
        const preferredModel = GEMINI_FALLBACK_MODELS.includes(req.body?.preferredModel)
          ? req.body.preferredModel
          : GEMINI_FALLBACK_MODELS[0];
        const enabled = req.body?.enabled !== false;
        const clearKey = req.body?.clearKey === true;
        const incomingKey = typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : '';

        const existing = await readPlatformAiConfig(db);
        const nextKey = clearKey ? '' : (incomingKey || String(existing?.geminiApiKey || '').trim());

        const payload = {
          geminiApiKey: nextKey,
          preferredModel,
          enabled,
          freeTierMode: true,
          updatedBy: caller.uid,
          updatedAt: typeof serverTimestamp === 'function' ? serverTimestamp() : new Date().toISOString()
        };

        const ref = db.doc(PLATFORM_AI_DOC);
        if (typeof ref.set === 'function') {
          await ref.set(payload, { merge: true });
        } else {
          throw errorWithStatus('No se pudo persistir la configuración global de IA.', 500);
        }

        const refreshed = await resolveServerAiConfig(db, profile.tenantId, '');
        return res.status(200).json({
          ok: true,
          configured: Boolean(refreshed.apiKey),
          enabled: refreshed.enabled,
          source: refreshed.source,
          preferredModel: refreshed.preferredModel,
          hasPlatformKey: refreshed.hasPlatformKey,
          hasEnvKey: refreshed.hasEnvKey,
          maskedKey: maskApiKey(refreshed.apiKey),
          freeModels: GEMINI_FALLBACK_MODELS
        });
      }

      const aiConfig = await resolveServerAiConfig(db, profile.tenantId, clientApiKey);

      // Consultar estado sin gastar cuota de Gemini ni exponer la clave real
      if (action === 'status') {
        return res.status(200).json({
          configured: Boolean(aiConfig.apiKey),
          enabled: aiConfig.enabled,
          source: aiConfig.source,
          preferredModel: aiConfig.preferredModel,
          freeTierMode: true,
          freeModels: GEMINI_FALLBACK_MODELS,
          ...(isSuperAdmin
            ? {
                hasPlatformKey: aiConfig.hasPlatformKey,
                hasEnvKey: aiConfig.hasEnvKey,
                maskedKey: maskApiKey(aiConfig.apiKey)
              }
            : {})
        });
      }

      if (!aiConfig.enabled && !clientApiKey) {
        throw errorWithStatus(
          'El servicio global de Inteligencia Artificial está pausado temporalmente por el administrador de WebFix.',
          503
        );
      }

      if (!aiConfig.apiKey) {
        throw errorWithStatus(
          'La IA global de WebFix aún no está activada por el administrador de la plataforma.',
          503
        );
      }

      const models = buildServerModelChain(aiConfig.preferredModel);

      if (action === 'ping') {
        const pingResult = await callGeminiRest({
          apiKey: aiConfig.apiKey,
          contents: [{ parts: [{ text: 'Responde únicamente: OK' }] }],
          fetchImpl,
          models
        });
        return res.status(200).json({
          ok: true,
          model: pingResult.model,
          source: aiConfig.source,
          text: pingResult.text
        });
      }

      if (!Array.isArray(contents) || contents.length === 0) {
        throw errorWithStatus('Contenido de consulta inválido.', 400);
      }

      const result = await callGeminiRest({
        apiKey: aiConfig.apiKey,
        contents,
        generationConfig,
        fetchImpl,
        models
      });
      return res.status(200).json({
        text: result.text,
        model: result.model,
        source: aiConfig.source
      });
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
