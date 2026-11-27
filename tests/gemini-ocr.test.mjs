import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_MODELS,
  inferMimeType,
  buildFilePart,
  parseGeminiJsonResponse,
  normalizeExtractedInvoice
} from '../src/utils/geminiHelpers.js';
import { callGeminiRest, createGeminiHandler } from '../api/ai/gemini.js';

test('buildFilePart wraps base64 payload inside inlineData and inferMimeType handles empty PDF file.type', () => {
  const mime = inferMimeType({ name: 'FACTURA_001.PDF', type: '' });
  assert.equal(mime, 'application/pdf');
  assert.equal(inferMimeType({ name: 'ticket.png', type: 'application/octet-stream' }), 'image/png');

  const part = buildFilePart('JVBERi0xLjQ=', mime);
  assert.deepEqual(part, {
    inlineData: {
      data: 'JVBERi0xLjQ=',
      mimeType: 'application/pdf'
    }
  });
  assert.ok(!GEMINI_MODELS.includes('gemini-1.5-flash'));
  assert.equal(GEMINI_MODELS[0], 'gemini-2.5-flash');
  assert.equal(GEMINI_MODELS[1], 'gemini-2.5-flash-lite');
});

test('parseGeminiJsonResponse strips markdown fences and normalizeExtractedInvoice extracts items and 49-digit claveAcceso', () => {
  const raw = '```json\n{"ruc":"1793231882001","razonSocial":"NIVUSOFTWARE SAS","documentNumber":"001-001-000000255","claveAcceso":"2711202601179323188200120010010000002551234567819","date":"27/11/2026","baseImponible":"90.00","ivaValor":"13.50","total":"103.50","paymentMethod":"transferencia","category":"compras","items":[{"code":"WF-CE","name":"Email Starter","quantity":3,"price":30,"ivaRate":15,"total":90}]}\n```';
  const parsed = parseGeminiJsonResponse(raw);
  const norm = normalizeExtractedInvoice(parsed);

  assert.equal(norm.ruc, '1793231882001');
  assert.equal(norm.date, '2026-11-27');
  assert.equal(norm.claveAcceso.length, 49);
  assert.equal(norm.baseImponible, 90);
  assert.equal(norm.ivaValor, 13.5);
  assert.equal(norm.total, 103.5);
  assert.equal(norm.items.length, 1);
  assert.equal(norm.items[0].name, 'Email Starter');
  assert.equal(norm.items[0].quantity, 3);
  assert.equal(norm.items[0].price, 30);
});

test('callGeminiRest automatically falls back to next free-tier model on 429 or 404', async () => {
  const calledUrls = [];
  const fakeFetch = async (url) => {
    calledUrls.push(url);
    if (url.includes('gemini-2.5-flash:')) {
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Resource exhausted' } })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"total":45}' }] } }]
      })
    };
  };

  const result = await callGeminiRest({
    apiKey: 'AIzaTestKey',
    contents: [{ parts: [{ inlineData: { data: 'abc', mimeType: 'application/pdf' } }, { text: 'Extract' }] }],
    fetchImpl: fakeFetch
  });

  assert.equal(result.model, 'gemini-2.5-flash-lite');
  assert.equal(result.text, '{"total":45}');
  assert.equal(calledUrls.length, 2);
});

test('api/ai/gemini supports SuperAdmin global free-tier config without exposing keys to tenant admins', async () => {
  const docs = new Map([
    ['users/super1', { status: 'active', role: 'superadmin', tenantId: 'org_root' }],
    ['users/tenant1', { status: 'active', role: 'admin', tenantId: 'org_1' }]
  ]);
  const fakeDb = {
    doc: (path) => ({
      get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
      set: async (data) => {
        docs.set(path, { ...(docs.get(path) || {}), ...data });
      }
    })
  };
  const fakeAuth = {
    verifyIdToken: async (token) => {
      if (token === 'super-token') return { uid: 'super1' };
      if (token === 'tenant-token') return { uid: 'tenant1' };
      throw new Error('invalid');
    }
  };
  const calledModels = [];
  const fakeFetch = async (url) => {
    calledModels.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
    };
  };

  const handler = createGeminiHandler({
    getServices: () => ({ auth: fakeAuth, db: fakeDb, serverTimestamp: () => 'NOW' }),
    fetchImpl: fakeFetch
  });

  const call = async (body, token) => {
    const out = { headers: {} };
    const res = {
      setHeader: (k, v) => { out.headers[k] = v; },
      status: (c) => { out.status = c; return res; },
      json: (b) => { out.body = b; return out; }
    };
    await handler({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body }, res);
    return out;
  };

  // Unauthenticated rejected
  assert.equal((await call({ action: 'ping' }, '')).status, 401);

  // Tenant admin cannot modify global AI config
  const denied = await call({ action: 'save_global_config', geminiApiKey: 'AIzaHack' }, 'tenant-token');
  assert.equal(denied.status, 403);

  // SuperAdmin saves global free-tier key and preferred model
  const saved = await call({
    action: 'save_global_config',
    geminiApiKey: 'AIzaGlobalFreeKey9999',
    preferredModel: 'gemini-2.5-flash-lite',
    enabled: true
  }, 'super-token');
  assert.equal(saved.status, 200);
  assert.equal(saved.body.configured, true);
  assert.equal(saved.body.source, 'platform');
  assert.equal(saved.body.preferredModel, 'gemini-2.5-flash-lite');
  assert.ok(saved.body.maskedKey.endsWith('9999'));

  // Tenant checks status: sees configured=true without ever seeing maskedKey or real key
  const tenantStatus = await call({ action: 'status' }, 'tenant-token');
  assert.equal(tenantStatus.status, 200);
  assert.equal(tenantStatus.body.configured, true);
  assert.equal(tenantStatus.body.source, 'platform');
  assert.equal(tenantStatus.body.maskedKey, undefined);

  // Tenant runs ping using global free key without any local setup
  const ping = await call({ action: 'ping' }, 'tenant-token');
  assert.equal(ping.status, 200);
  assert.equal(ping.body.ok, true);
  assert.equal(ping.body.model, 'gemini-2.5-flash-lite');
  assert.equal(ping.body.source, 'platform');
  assert.ok(calledModels[0].includes('gemini-2.5-flash-lite:generateContent?key=AIzaGlobalFreeKey9999'));
});
