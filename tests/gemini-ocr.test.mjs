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

test('callGeminiRest automatically falls back to next active model when first returns 404', async () => {
  const calledUrls = [];
  const fakeFetch = async (url) => {
    calledUrls.push(url);
    if (url.includes('gemini-2.5-flash:')) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Model not found' } })
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

  assert.equal(result.model, 'gemini-2.0-flash');
  assert.equal(result.text, '{"total":45}');
  assert.equal(calledUrls.length, 2);
});

test('api/ai/gemini handler verifies Firebase user, resolves tenant key from Firestore and handles ping/OCR', async () => {
  const docs = new Map([
    ['users/u1', { status: 'active', role: 'admin', tenantId: 'org_1' }],
    ['artifacts/org_1/public/data/meta/info', { geminiApiKey: 'AIzaTenantKey123' }]
  ]);
  const fakeDb = {
    doc: (path) => ({
      get: async () => ({ exists: docs.has(path), data: () => docs.get(path) })
    })
  };
  const fakeAuth = {
    verifyIdToken: async (token) => {
      if (token !== 'valid-token') throw new Error('invalid');
      return { uid: 'u1' };
    }
  };
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
  });

  const handler = createGeminiHandler({
    getServices: () => ({ auth: fakeAuth, db: fakeDb }),
    fetchImpl: fakeFetch
  });

  const call = async (body, token = 'valid-token') => {
    const out = { headers: {} };
    const res = {
      setHeader: (k, v) => { out.headers[k] = v; },
      status: (c) => { out.status = c; return res; },
      json: (b) => { out.body = b; return out; }
    };
    await handler({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body }, res);
    return out;
  };

  assert.equal((await call({ action: 'ping' }, '')).status, 401);
  const ping = await call({ action: 'ping' });
  assert.equal(ping.status, 200);
  assert.equal(ping.body.ok, true);
  assert.equal(ping.body.model, 'gemini-2.5-flash');
});
