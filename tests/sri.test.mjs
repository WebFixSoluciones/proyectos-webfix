import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { reserveSriEmission, saveSriResult } from '../src/services/sriEmission.js';
import { parseSriAuthorization, sriDocumentLinks } from '../src/services/sriAuthorization.js';
import { recoverInvoiceFromSri, recoveredInvoice } from '../src/services/sriRecovery.js';
import { generarClaveAcceso, simularTransmisionSRI, reintentarDocumentoSRI } from '../src/services/sriService.js';
import { invoiceLineAmounts } from '../src/services/invoiceLine.js';
import { notifyAuthorizedInvoice } from '../src/services/invoiceNotification.js';
import { reconcileSriDocument, batchReconcileSriDocuments, scanAllTenantsPendingSri, getDocumentTypeName } from '../src/services/sriReconciliation.js';
import cronHandler from '../api/cron/reconcile-sri/index.js';

globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
const config = { ruc: '1790012345001', ambiente: '1', establecimiento: '001', puntoEmision: '001', secuencialFactura: '164' };
const path = (name, id) => `artifacts/test/public/data/${name}/${id}`;
function memoryStore() {
  const data = new Map([[path('finances_settings', 'config'), { ...config }]]);
  let queue = Promise.resolve();
  const snap = id => ({ id: id.split('/').at(-1), exists: () => data.has(id), data: () => structuredClone(data.get(id)) });
  const api = {
    doc: (_db, ...parts) => parts.join('/'), collection: (_db, ...parts) => parts.join('/'),
    where: (field, _op, value) => ({ field, value }), query: (collection, filter) => ({ collection, filter }),
    getDoc: async id => snap(id),
    setDoc: async (id, value, options) => { data.set(id, { ...(options?.merge ? data.get(id) : {}), ...structuredClone(value) }); },
    getDocs: async q => ({ docs: [...data].filter(([k, v]) => k.startsWith(q.collection + '/') && v[q.filter.field] === q.filter.value).map(([k]) => snap(k)) }),
    runTransaction: (_db, body) => {
      const result = queue.then(async () => {
        const writes = [];
        const tx = { get: async id => { assert.equal(writes.length, 0); return snap(id); }, set: (id, value, options) => writes.push({ id, value, merge: options?.merge }), update: (id, value) => writes.push({ id, value, merge: true }) };
        const result = await body(tx);
        if (api.failCommit) throw new Error('connection lost');
        writes.forEach(({ id, value, merge }) => data.set(id, { ...(merge ? data.get(id) : {}), ...structuredClone(value) }));
        return result;
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  return { data, api };
}
const keyFor = (secuencial = '164') => generarClaveAcceso({ ...config, fechaEmision: '2026-09-21', tipoComprobante: '01', secuencial, codigoNumerico: '12345678' });
const key = keyFor();
const signedXml = `<factura id="comprobante" version="1.1.0"><infoTributaria><ambiente>1</ambiente><ruc>${config.ruc}</ruc><razonSocial>Emisor de prueba</razonSocial><claveAcceso>${key}</claveAcceso><estab>001</estab><ptoEmi>001</ptoEmi><secuencial>000000164</secuencial><dirMatriz>Dirección original</dirMatriz></infoTributaria><infoFactura><fechaEmision>21/09/2026</fechaEmision><razonSocialComprador>Cliente de prueba</razonSocialComprador><identificacionComprador>9999999999999</identificacionComprador><totalSinImpuestos>18</totalSinImpuestos><totalConImpuestos><totalImpuesto><codigo>2</codigo><valor>2.70</valor></totalImpuesto></totalConImpuestos><importeTotal>20.70</importeTotal></infoFactura><detalles><detalle><codigoPrincipal>SERV</codigoPrincipal><descripcion>Encuestas &amp; usuarios</descripcion><cantidad>2</cantidad><precioUnitario>10</precioUnitario><descuento>2</descuento><precioTotalSinImpuesto>18</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><tarifa>15</tarifa><valor>2.70</valor></impuesto></impuestos></detalle></detalles><Signature>test only</Signature></factura>`;
const soap = (receipt = signedXml, authKey = key) => `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ns:autorizacionComprobanteResponse xmlns:ns="http://ec.gob.sri.ws.autorizacion"><RespuestaAutorizacionComprobante><autorizaciones><autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${authKey}</numeroAutorizacion><fechaAutorizacion>2026-09-21T11:30:44-05:00</fechaAutorizacion><comprobante><![CDATA[${receipt}]]></comprobante></autorizacion></autorizaciones></RespuestaAutorizacionComprobante></ns:autorizacionComprobanteResponse></soap:Body></soap:Envelope>`;
const authorized = () => parseSriAuthorization(soap(), key);
const builder = id => (_config, seq) => ({ id, type: 'ingreso', documentType: 'factura', documentNumber: `001-001-${seq.padStart(9, '0')}`, claveAcceso: keyFor(seq), xml: signedXml, sriStatus: 'pendiente_sri', financialSyncStatus: 'awaiting_authorization' });
const reserve = (store, id = 'sale', build = builder(id)) => reserveSriEmission({ db: {}, appId: 'test', docId: id, secKey: 'secuencialFactura', build, api: store.api });
const save = (store, document, result) => saveSriResult({ db: {}, appId: 'test', document, result, api: store.api });

test('authorization recovery notifies customer and issuer once and records both SMTP results', async () => {
  const store = memoryStore();
  Object.assign(store.data.get(path('finances_settings', 'config')), {
    smtpHost: 'smtp.example.com', smtpUser: 'smtp@example.com', smtpPass: 'test',
    correoContacto: 'emisor@example.com',
  });
  const document = { id: 'recovered', claveAcceso: key, documentType: 'factura', sriStatus: 'autorizado', xmlAutorizado: authorized().xmlAutorizado, documentNumber: '001-001-000000164', total: 20.70 };
  store.data.set(path('finances_transactions', 'recovered'), document);
  const customer = { name: 'Cliente', email: 'cliente@example.com', ruc: '1790012345001' };
  const calls = [];
  const fetchEmail = async (_url, request) => {
    calls.push(JSON.parse(request.body));
    return { ok: true, json: async () => ({ success: true, deliveries: {
      client: { status: 'sent', messageId: 'client-1' }, emitter: { status: 'sent', messageId: 'issuer-1' },
    } }) };
  };
  const send = () => notifyAuthorizedInvoice({ db: {}, appId: 'test', document, customer, api: store.api, fetchEmail });
  assert.equal((await send()).status, 'sent');
  assert.equal(calls[0].to, 'cliente@example.com');
  assert.equal(calls[0].emitterEmail, 'emisor@example.com');
  assert.equal(calls[0].xmlContent, document.xmlAutorizado);
  assert.equal(store.data.get(path('finances_transactions', 'recovered')).emailDelivery.emitter.status, 'sent');
  assert.equal((await send()).status, 'already_sent');
  assert.equal(calls.length, 1);
});

test('a failed issuer copy can be retried without emailing the customer twice', async () => {
  const store = memoryStore();
  Object.assign(store.data.get(path('finances_settings', 'config')), {
    smtpHost: 'smtp.example.com', smtpUser: 'emisor@example.com', smtpPass: 'test',
  });
  const document = { id: 'partial-mail', claveAcceso: key, documentType: 'factura', sriStatus: 'autorizado', xmlAutorizado: authorized().xmlAutorizado };
  store.data.set(path('finances_transactions', 'partial-mail'), document);
  const payloads = [];
  const fetchEmail = async (_url, request) => {
    payloads.push(JSON.parse(request.body));
    return payloads.length === 1
      ? { ok: false, json: async () => ({ deliveries: { client: { status: 'sent', messageId: 'client-1' }, emitter: { status: 'failed', error: 'SMTP rechazó al emisor' } } }) }
      : { ok: true, json: async () => ({ success: true, deliveries: { emitter: { status: 'sent', messageId: 'issuer-2' } } }) };
  };
  const send = () => notifyAuthorizedInvoice({ db: {}, appId: 'test', document, customer: { email: 'cliente@example.com' }, api: store.api, fetchEmail });
  assert.equal((await send()).status, 'partial');
  assert.equal((await send()).status, 'sent');
  assert.equal(payloads[1].to, '');
  assert.equal(payloads[1].emitterEmail, 'emisor@example.com');
  assert.equal(store.data.get(path('finances_transactions', 'partial-mail')).emailDelivery.client.messageId, 'client-1');
});

test('reservation persists invoice, signed XML and sequence atomically; parallel double click allocates once', async () => {
  const store = memoryStore();
  let builds = 0;
  const build = (...args) => { builds++; return builder('sale')(...args); };
  const [a, b] = await Promise.all([reserve(store, 'sale', build), reserve(store, 'sale', build)]);
  assert.equal(builds, 1);
  assert.equal(a.created, true); assert.equal(b.created, false);
  assert.deepEqual(a.document, b.document);
  assert.equal(store.data.get(path('finances_settings', 'config')).secuencialFactura, 165);
  assert.equal(store.data.get(path('finances_transactions', 'sale')).xml, signedXml);
});

test('concurrent sales receive distinct numbers; manually lowering legacy config cannot reuse numbers', async () => {
  const store = memoryStore();
  const results = await Promise.all([reserve(store, 'one'), reserve(store, 'two')]);
  assert.equal(new Set(results.map(r => r.document.claveAcceso)).size, 2);
  store.data.get(path('finances_settings', 'config')).secuencialFactura = 1;
  assert.match((await reserve(store, 'three')).document.documentNumber, /166$/);
});

test('signing and commit failures leave no reservation and do not consume the number', async () => {
  const store = memoryStore();
  await assert.rejects(reserve(store, 'sale', () => { throw new Error('certificate invalid'); }), /certificate/);
  store.api.failCommit = true;
  await assert.rejects(reserve(store), /connection/);
  assert.equal(store.data.size, 1);
  assert.equal(store.data.get(path('finances_settings', 'config')).secuencialFactura, '164');
});

test('SRI timeout keeps fiscal identity reserved; later authorization survives downstream failures and stale results', async () => {
  const store = memoryStore();
  const { document } = await reserve(store);
  await save(store, document, { status: 'pendiente_sri', message: 'timeout' });
  store.api.failCommit = true;
  await assert.rejects(save(store, document, authorized()), /connection/);
  assert.equal(store.data.get(path('finances_transactions', 'sale')).claveAcceso, key);
  assert.equal(store.data.get(path('finances_settings', 'config')).secuencialFactura, 165);
  store.api.failCommit = false;
  await save(store, document, authorized());
  const final = await save(store, document, { status: 'pendiente_sri', message: 'stale timeout' });
  assert.equal(final.sriStatus, 'autorizado');
  assert.equal(final.financialSyncStatus, 'pending');
  assert.equal(final.xmlAutorizado, authorized().xmlAutorizado);
});

test('SOAP authorization preserves original signed XML and rejects wrong identity or SOAP fault', () => {
  assert.equal(authorized().signedXml, signedXml);
  assert.equal(authorized().fechaAutorizacion, '2026-09-21T11:30:44-05:00');
  assert.throws(() => parseSriAuthorization(soap(signedXml, keyFor('165')), key), /no corresponde/);
  assert.throws(() => parseSriAuthorization(soap(signedXml.replace(key, keyFor('165'))), key), /no corresponde/);
  assert.throws(() => parseSriAuthorization('<Envelope><Fault>timeout</Fault></Envelope>', key), /inválida/);
  assert.equal(parseSriAuthorization('<RespuestaAutorizacionComprobante><autorizaciones/></RespuestaAutorizacionComprobante>', key).status, 'pendiente_sri');
});

test('recovered invoice preserves printed line amounts, issuer and customer without inventing payments or product links', () => {
  const document = recoveredInvoice(authorized());
  assert.equal(document.total, 20.7);
  assert.deepEqual(invoiceLineAmounts(document.items[0]), { unitPrice: 10, discount: 2, base: 18, total: 20.7, rate: 15 });
  assert.equal(document.emisorSnapshot.direccionMatriz, 'Dirección original');
  assert.equal(document.thirdParty.name, 'Cliente de prueba');
  assert.equal(document.items[0].productId, '');
  assert.equal(document.financialSyncStatus, 'review_required');
  assert.equal(document.paymentsBreakdown, undefined);
  assert.equal(sriDocumentLinks(document, 'test').xml, authorized().xmlAutorizado);
  assert.match(sriDocumentLinks(document, 'test').ride, /\/#\/public\/ride\?/);
});

test('recovery is idempotent, raises the sequence floor and never writes financial or inventory collections', async () => {
  const store = memoryStore();
  const consult = async () => authorized();
  const first = await recoverInvoiceFromSri({}, 'test', key, store.api, consult);
  const again = await recoverInvoiceFromSri({}, 'test', key, store.api, consult);
  assert.equal(first.id, again.id);
  assert.equal(again.financialSyncStatus, 'review_required');
  assert.equal(store.data.get(path('finances_settings', 'config')).secuencialFactura, 165);
  assert.equal([...store.data.keys()].filter(k => k.includes('finances_transactions')).length, 1);
  assert.ok([...store.data.keys()].every(k => /finances_settings|finances_transactions|sri_sequences/.test(k)));
});

test('recovery rejects another tenant, ambiguous draft and conflicting fiscal key', async () => {
  const store = memoryStore();
  let calls = 0;
  const consult = async () => { calls++; return authorized(); };
  store.data.get(path('finances_settings', 'config')).ruc = '1799999999001';
  await assert.rejects(recoverInvoiceFromSri({}, 'test', key, store.api, consult), /tenant/);
  assert.equal(calls, 0);
  store.data.get(path('finances_settings', 'config')).ruc = config.ruc;
  const existing = { documentType: 'factura', documentNumber: '001-001-000000164' };
  store.data.set(path('finances_transactions', 'existing'), existing);
  await assert.rejects(recoverInvoiceFromSri({}, 'test', key, store.api, consult), /sin clave/);
  existing.claveAcceso = keyFor('165');
  await assert.rejects(recoverInvoiceFromSri({}, 'test', key, store.api, consult), /conflicto/);
});

test('recovering existing invoice preserves payment and ledger references and enables pending reconciliation', async () => {
  const store = memoryStore();
  const { document } = await reserve(store);
  store.data.get(path('finances_transactions', 'sale')).paymentsBreakdown = { transferencia: 20.7 };
  const recovered = await recoverInvoiceFromSri({}, 'test', document.claveAcceso, store.api, async () => authorized());
  assert.equal(recovered.id, 'sale');
  assert.equal(recovered.financialSyncStatus, 'pending');
  assert.equal(recovered.paymentsBreakdown.transferencia, 20.7);
});

test('reception timeout or SRI codes 43 and 70 consult same key and never pretend authorization', async t => {
  for (const scenario of ['timeout', '43', '70', 'RECIBIDA']) {
    let calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url, body: options.body });
      if (url.includes('Recepcion')) {
        if (scenario === 'timeout') throw new Error('connection lost');
        return new Response(`<respuesta><estado>${scenario === 'RECIBIDA' ? 'RECIBIDA' : 'DEVUELTA'}</estado><identificador>${scenario}</identificador></respuesta>`);
      }
      return new Response(soap());
    });
    const result = await simularTransmisionSRI({ claveAcceso: key, xml: signedXml }, { ...config, certificadoCargado: true, certificadoBase64: 'test' });
    assert.equal(result.status, 'autorizado');
    assert.equal(calls.length, 2);
    assert.match(calls[1].body, new RegExp(key));
    t.mock.restoreAll();
  }
  await assert.rejects(simularTransmisionSRI({ claveAcceso: key, xml: '<factura/>' }, config), /firmado/);
});

test('explicit retry checks SRI before sending; an authorized receipt is never resent', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    calls++;
    assert.match(url, /Autorizacion/);
    return new Response(soap());
  });
  assert.equal((await reintentarDocumentoSRI({ claveAcceso: key, xml: signedXml })).status, 'autorizado');
  assert.equal(calls, 1);
});

test('explicit retry after an interrupted first send uses the identical signed XML and key', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url);
    if (calls.length === 1) return new Response('<RespuestaAutorizacionComprobante><autorizaciones/></RespuestaAutorizacionComprobante>');
    if (url.includes('Recepcion')) {
      const sent = new DOMParser().parseFromString(options.body, 'text/xml').getElementsByTagName('xml')[0].textContent;
      assert.equal(Buffer.from(sent, 'base64').toString('utf8'), signedXml);
      return new Response('<respuesta><estado>RECIBIDA</estado></respuesta>');
    }
    return new Response(soap());
  });
  assert.equal((await reintentarDocumentoSRI({ claveAcceso: key, xml: signedXml })).status, 'autorizado');
  assert.equal(calls.length, 3);
});

test('getDocumentTypeName identifies all tax document types in Ecuador', () => {
  assert.equal(getDocumentTypeName('factura'), 'Factura');
  assert.equal(getDocumentTypeName('retencion'), 'Retención');
  assert.equal(getDocumentTypeName('comprobante_retencion'), 'Retención');
  assert.equal(getDocumentTypeName('nota_credito'), 'Nota de Crédito');
  assert.equal(getDocumentTypeName('nota_debito'), 'Nota de Débito');
  assert.equal(getDocumentTypeName('guia_remision'), 'Guía de Remisión');
  assert.equal(getDocumentTypeName('liquidacion_compra'), 'Liquidación de Compra');
  assert.equal(getDocumentTypeName('nota_venta'), 'Nota de Venta');
});

test('reconcileSriDocument reconciles pending document, persists xml and emits notification without altering sequence', async () => {
  const store = memoryStore();
  const doc = {
    id: 'ret-001',
    documentType: 'retencion',
    documentNumber: '001-001-000000005',
    claveAcceso: key,
    sriStatus: 'pendiente_sri',
    thirdParty: { name: 'Proveedor SA', email: 'proveedor@example.com' }
  };
  store.data.set(path('finances_transactions', 'ret-001'), doc);
  
  let notified = false;
  const mockNotify = async () => { notified = true; return { status: 'sent' }; };
  const result = await reconcileSriDocument({
    db: {},
    appId: 'test',
    document: doc,
    api: store.api,
    consultSri: async () => authorized(),
    notify: mockNotify
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'autorizado');
  assert.equal(notified, true);
  const saved = store.data.get(path('finances_transactions', 'ret-001'));
  assert.equal(saved.sriStatus, 'autorizado');
  assert.equal(saved.documentNumber, '001-001-000000005');
  assert.equal(saved.claveAcceso, key);
  assert.match(saved.xmlAutorizado, /AUTORIZADO/);
});

test('scanAllTenantsPendingSri and batchReconcileSriDocuments mitigate simultaneous failures across 21 tenants', async () => {
  const allData = new Map();
  const multiApi = {
    doc: (_db, ...p) => p.join('/'),
    collection: (_db, ...p) => p.join('/'),
    where: (field, _op, value) => ({ field, value }),
    query: (collection, filter) => ({ collection, filter }),
    getDocs: async q => {
      const docs = [...allData]
        .filter(([k, v]) => k.startsWith(q.collection + '/') && v[q.filter.field] === q.filter.value)
        .map(([k, v]) => ({ id: k.split('/').at(-1), data: () => structuredClone(v) }));
      return { docs };
    },
    runTransaction: async (_db, fn) => {
      const writes = [];
      const tx = {
        get: async id => ({ exists: () => allData.has(id), data: () => structuredClone(allData.get(id)) }),
        set: (id, val, opt) => writes.push({ id, val, merge: opt?.merge }),
        update: (id, val) => writes.push({ id, val, merge: true })
      };
      const res = await fn(tx);
      writes.forEach(({ id, val, merge }) => allData.set(id, { ...(merge ? allData.get(id) : {}), ...structuredClone(val) }));
      return res;
    }
  };

  const tenantsList = [];
  const docTypes = ['factura', 'retencion', 'nota_credito', 'liquidacion_compra', 'guia_remision'];
  const typeCodes = { factura: '01', liquidacion_compra: '03', nota_credito: '04', nota_debito: '05', guia_remision: '06', retencion: '07' };
  for (let i = 1; i <= 21; i++) {
    const tId = 'tenant_' + i;
    tenantsList.push({ id: tId, companyName: 'Empresa ' + i + ' SA' });
    const docType = docTypes[i % docTypes.length];
    const secStr = String(i);
    const docKey = generarClaveAcceso({
      ...config,
      tipoComprobante: typeCodes[docType] || '01',
      fechaEmision: '2026-09-25',
      secuencial: secStr,
      codigoNumerico: '100000' + (i < 10 ? '0' + i : i)
    });
    const txDoc = {
      id: 'tx_' + tId + '_01',
      tenantId: tId,
      documentType: docType,
      documentNumber: '001-001-' + secStr.padStart(9, '0'),
      claveAcceso: docKey,
      sriStatus: 'pendiente_sri',
      total: 50.00 + i
    };
    allData.set('artifacts/' + tId + '/public/data/finances_transactions/tx_' + tId + '_01', txDoc);
  }

  const scan = await scanAllTenantsPendingSri({ db: {}, tenants: tenantsList, api: multiApi });
  assert.equal(scan.totalPendingCount, 21);
  assert.equal(scan.affectedTenantCount, 21);

  const progressEvents = [];
  const stats = await batchReconcileSriDocuments({
    db: {},
    documents: scan.pendingDocs,
    api: multiApi,
    consultSri: async (k) => parseSriAuthorization(soap(signedXml.replace(key, k), k), k),
    notify: async () => ({ status: 'sent' }),
    onProgress: (prog) => progressEvents.push(prog),
    delayMs: 0
  });

  assert.equal(stats.total, 21);
  assert.equal(stats.authorized, 21);
  assert.equal(stats.failed, 0);
  assert.equal(stats.stillPending, 0);
  assert.ok(progressEvents.length >= 21);

  for (let i = 1; i <= 21; i++) {
    const tId = 'tenant_' + i;
    const saved = allData.get('artifacts/' + tId + '/public/data/finances_transactions/tx_' + tId + '_01');
    assert.equal(saved.sriStatus, 'autorizado');
    assert.equal(saved.documentNumber, '001-001-' + String(i).padStart(9, '0'));
  }
});

test('cron reconcile-sri endpoint handles cron execution and document processing', async () => {
  let statusCode = 0;
  let jsonResult = null;
  const mockRes = () => ({
    status: (code) => { statusCode = code; return mockRes(); },
    json: (data) => { jsonResult = data; return mockRes(); }
  });

  // 1. Rejects invalid method
  await cronHandler({ method: 'DELETE', headers: {} }, mockRes());
  assert.equal(statusCode, 405);

  // 2. Accepts GET from Vercel Cron
  await cronHandler({ method: 'GET', headers: { 'x-vercel-cron': '1' } }, mockRes());
  assert.equal(statusCode, 200);
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.mode, 'vercel_cron');

  // 3. Flags invalid keys in document batch
  await cronHandler({
    method: 'POST',
    headers: {},
    body: {
      documents: [
        { id: 'bad-1', key: 'short' },
        { id: 'bad-2' }
      ]
    }
  }, mockRes());
  assert.equal(statusCode, 200);
  assert.equal(jsonResult.summary.failed, 2);
  assert.equal(jsonResult.results[0].status, 'error_clave');
});
