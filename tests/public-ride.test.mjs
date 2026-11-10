import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicReceipt } from '../api/public-ride/receipt.js';
import handler from '../api/public-ride/index.js';
import { sriDocumentLinks } from '../src/services/sriAuthorization.js';

const key = '2109202601175437690100120010010000001645699241016';
const invoice = {
  id: 'invoice-164', type: 'ingreso', documentType: 'factura',
  documentNumber: '001-001-000000164', claveAcceso: key, sriStatus: 'autorizado',
  thirdPartyName: 'Cliente', thirdPartyRuc: '0912345678', total: 10.5,
  items: [{ name: 'Soporte', quantity: 1, price: 10.5, productId: 'private-product', stockCost: 3 }],
  emisorSnapshot: { ruc: '1754376901001', razonSocial: 'WebFix', smtpPass: 'private' },
  xmlFirmado: 'private', financialSyncStatus: 'pending', cashSessionId: 'private-session'
};
const store = {
  async getById(_tenantId, id) { return id === invoice.id ? invoice : null; },
  async getByKey(_tenantId, candidate) { return candidate === key ? invoice : null; }
};

test('the public invoice endpoint requires its fiscal key and exposes only RIDE fields', async () => {
  const receipt = await resolvePublicReceipt(store, { tenantId: 'tenant-a', txId: invoice.id, claveAcceso: key });
  assert.equal(receipt.documentNumber, invoice.documentNumber);
  assert.equal(receipt.emisorSnapshot.ruc, '1754376901001');
  assert.equal(receipt.items[0].name, 'Soporte');
  assert.equal('smtpPass' in receipt.emisorSnapshot, false);
  assert.equal('productId' in receipt.items[0], false);
  assert.equal('cashSessionId' in receipt, false);
  assert.equal(await resolvePublicReceipt(store, { tenantId: 'tenant-a', txId: invoice.id }), null);
  assert.equal(await resolvePublicReceipt(store, { tenantId: 'tenant-a', txId: invoice.id, claveAcceso: '0'.repeat(49) }), null);
  assert.equal((await resolvePublicReceipt(store, { tenantId: 'tenant-a', claveAcceso: key })).total, 10.5);
});

test('the public endpoint rejects purchases, unfinished invoices, and invalid note tokens', async () => {
  for (const altered of [
    { type: 'egreso' },
    { sriStatus: 'pendiente_sri' }
  ]) {
    const candidate = { ...invoice, ...altered };
    const receipt = await resolvePublicReceipt({ getById: async () => candidate }, { tenantId: 'tenant-a', txId: invoice.id, claveAcceso: key });
    assert.equal(receipt, null);
  }
  const note = { id: 'note-1', type: 'ingreso', documentType: 'nota_venta', documentNumber: '001-001-1', sriStatus: 'autorizado', publicRideToken: 'secret', total: 5 };
  const noteStore = { getById: async () => note };
  assert.equal(await resolvePublicReceipt(noteStore, { tenantId: 'tenant-a', txId: note.id }), null);
  assert.equal((await resolvePublicReceipt(noteStore, { tenantId: 'tenant-a', txId: note.id, token: 'secret' })).total, 5);
  assert.match(sriDocumentLinks(note, 'tenant-a').ride, /[?&]token=secret/);
  assert.equal((await resolvePublicReceipt({ getById: async () => ({ ...note, publicRideToken: '' }) }, { tenantId: 'tenant-a', txId: note.id })).total, 5);
  assert.equal(await resolvePublicReceipt({ getById: async () => ({ ...note, sriStatus: 'pendiente' }) }, { tenantId: 'tenant-a', txId: note.id, token: 'secret' }), null);
});

test('the public HTTP route rejects invalid links and stays unavailable without server credentials', async () => {
  const makeResponse = () => ({
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  });
  const invalid = makeResponse();
  await handler({ method: 'GET', query: { tenantId: 'tenant/a', txId: invoice.id } }, invalid);
  assert.equal(invalid.statusCode, 400);
  const savedCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    const unavailable = makeResponse();
    await handler({ method: 'GET', query: { tenantId: 'tenant-a', txId: invoice.id, claveAcceso: key } }, unavailable);
    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.headers['Cache-Control'], 'private, no-store');
  } finally {
    if (savedCredentials === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = savedCredentials;
  }
});
