import { invoiceLineAmounts } from '../src/services/invoiceLine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, validateCartStock, makeCartItem, appendInvoiceLine } from '../src/services/productModel.js';
import { settlePayments, cashSessionTotals } from '../src/services/paymentModel.js';
import { calculateTransactionTotals } from '../src/services/discountCalcService.js';
import { generarFacturaXML } from '../src/services/sriService.js';
import { registerInventoryOperations, CENTRAL_BRANCH } from '../src/services/inventoryLedger.js';
import { sincronizarVenta } from '../src/services/integracionFinanzasService.js';

const product = (id, stock = 10, other = {}) => ({ id, name: id, type: 'STANDARD', stock, baseCost: 4, salePrice: 10, taxRate: 15, ...other });
const path = (collection, id) => `artifacts/test/public/data/${collection}/${id}`;
function memoryStore(products = []) {
  const data = new Map(products.map(p => [path('inventory_products', p.id), structuredClone(p)]));
  let queue = Promise.resolve();
  const snapshot = id => ({ id: id.split('/').at(-1), exists: () => data.has(id), data: () => structuredClone(data.get(id)) });
  const api = {
    doc: (_db, ...parts) => parts.join('/'), collection: (_db, ...parts) => parts.join('/'),
    where: (field, _op, value) => ({ field, value }), query: (collection, filter) => ({ collection, filter }),
    getDoc: async id => snapshot(id), serverTimestamp: () => new Date(),
    getDocs: async q => ({ docs: [...data].filter(([k, v]) => k.startsWith(q.collection + '/') && v[q.filter.field] === q.filter.value).map(([k]) => snapshot(k)) }),
    runTransaction: (_db, body) => {
      const run = queue.then(async () => {
        const writes = [];
        const tx = { get: async id => { assert.equal(writes.length, 0, 'Firestore requires reads before writes'); return snapshot(id); }, set: (id, value, options) => writes.push({ id, value, merge: options?.merge }), update: (id, value) => writes.push({ id, value, merge: true }) };
        const result = await body(tx);
        if (api.failCommit) throw new Error('connection lost');
        for (const { id, value, merge } of writes) data.set(id, { ...(merge ? data.get(id) : {}), ...structuredClone(value) });
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return { data, api };
}
const operation = (id, qty, reference = 'sale-1', type = 'SALE', extra = {}) => ({ productId: id, branchId: CENTRAL_BRANCH, type, referenceId: reference, quantity: qty, unitCost: 0, ...extra });

test('zero VAT and tax-inclusive prices survive inventory → POS', () => {
  const zero = normalizeProduct(product('zero', 10, { taxRate: 0 }));
  assert.equal(zero.ivaCategory, 0);
  assert.equal(makeCartItem(zero).tarifa_iva, 0);
  const included = normalizeProduct(product('inc', 10, { tax_mode: 'INCLUIDO', salePrice: 100 }));
  assert.equal(Math.round(included.price), 115);
  const totals = calculateTransactionTotals([makeCartItem(included), makeCartItem(zero)]);
  assert.equal(Math.round(totals.ivaValor), 15);
  assert.equal(Math.round(totals.total), 125);
});

test('combined payment applies only net cash, excludes change and separates credit', () => {
  const payment = settlePayments(115, { efectivo: 100, tarjeta: 40, cruce_cuentas: 25 });
  assert.equal(payment.paymentsBreakdown.efectivo, 50);
  assert.equal(payment.changeDue, 50);
  assert.equal(payment.paidAmount, 90);
  assert.equal(payment.paymentStatus, 'pendiente');
  assert.throws(() => settlePayments(100, { transferencia: 110 }), /superar/);
  assert.throws(() => settlePayments(100, { efectivo: -1 }), /negativos/);
  assert.throws(() => settlePayments(100, { efectivo: NaN }), /válidos/);
  assert.throws(() => settlePayments(100, { efectivo: 99 }), /Falta/);
});

test('inactive payment fields are ignored and rounded cent totals settle', () => {
  const result = settlePayments(0.1 + 0.2, { efectivo: .3, tarjeta: 999 }, { efectivo: true });
  assert.equal(result.paidAmount, .3);
  assert.equal(result.paymentsBreakdown.tarjeta, 0);
});

test('combo and loose lines share component stock; hidden components can be used', () => {
  const items = [product('part', 3, { showInSales: false }), product('combo', 0, { type: 'COMBO', comboItems: [{ productId: 'part', quantity: 2 }] })];
  assert.doesNotThrow(() => validateCartStock([{ productId: 'combo', quantity: 1 }], items));
  assert.throws(() => validateCartStock([{ productId: 'combo', quantity: 2 }], items), /insuficiente/);
  assert.doesNotThrow(() => validateCartStock([{ productId: 'service', quantity: 20 }], [product('service', 0, { type: 'SERVICE' })]));
  assert.throws(() => validateCartStock([{ productId: 'a', quantity: 1 }], [product('a', 0, { type: 'COMBO', comboItems: [{ productId: 'a', quantity: 1 }] })]), /circular/);
});

test('multi-item ledger has no partial writes on stock failure', async () => {
  const store = memoryStore([product('a', 3), product('b', 0)]);
  await assert.rejects(registerInventoryOperations({}, 'test', [operation('a', 2), operation('b', 1)], { api: store.api }), /insuficiente/);
  assert.equal(store.data.get(path('inventory_products', 'a')).stock, 3);
  assert.equal([...store.data.keys()].filter(k => k.includes('inventory_kardex')).length, 0);
});

test('sale retry is idempotent; concurrent sales cannot oversell', async () => {
  const store = memoryStore([product('a', 3)]);
  const run = ref => registerInventoryOperations({}, 'test', [operation('a', 2, ref)], { api: store.api });
  await run('one'); await run('one');
  assert.equal(store.data.get(path('inventory_products', 'a')).stock, 1);
  const results = await Promise.allSettled([run('two'), run('three')]);
  assert.ok(results.every(r => r.status === 'rejected'));
  assert.equal(store.data.get(path('finances_products', 'a')).stock, 1);
});

test('combo sale aggregates quantities, skips service and writes operation marker atomically', async () => {
  const store = memoryStore([product('a', 10), product('service', 0, { type: 'SERVICE' }), product('combo', 0, { type: 'COMBO', comboItems: [{ productId: 'a', quantity: 2 }, { productId: 'service', quantity: 1 }] })]);
  await registerInventoryOperations({}, 'test', [operation('combo', 2), operation('a', 1)], { api: store.api, document: { collection: 'finances_transactions', id: 'sale-1', flag: 'inventarioRegistrado', value: true } });
  assert.equal(store.data.get(path('inventory_products', 'a')).stock, 5);
  assert.equal(store.data.get(path('inventory_products', 'service')).stock, 0);
  assert.equal(store.data.get(path('finances_transactions', 'sale-1')).inventarioRegistrado, true);
});

test('transfer preserves aggregate stock and uses actual source cost', async () => {
  const store = memoryStore([product('a', 10)]);
  await registerInventoryOperations({}, 'test', [operation('a', 3, 'transfer', 'TRANSFER_OUT'), operation('a', 3, 'transfer', 'TRANSFER_IN', { branchId: 'sur', sourceBranchId: CENTRAL_BRANCH, unitCost: 99 })], { api: store.api });
  const saved = store.data.get(path('inventory_products', 'a'));
  assert.equal(saved.stock, 10);
  assert.equal(saved.stockByBranch.sur.quantity, 3);
  assert.equal(saved.stockByBranch.sur.averageCost, 4);
});

test('failed commit does not alter stock or claim completion', async () => {
  const store = memoryStore([product('a', 10)]); store.api.failCommit = true;
  await assert.rejects(registerInventoryOperations({}, 'test', [operation('a', 2)], { api: store.api }), /connection/);
  assert.equal(store.data.size, 1); assert.equal(store.data.get(path('inventory_products', 'a')).stock, 10);
});

test('financial sync is idempotent and preserves subsequent partial payments', async () => {
  const store = memoryStore();
  const sale = { id: 'sale-1', total: 115, baseImponible: 100, ivaValor: 15, paidAmount: 50, paymentStatus: 'pendiente', date: '2026-09-14', thirdParty: { name: 'Cliente', ruc: '123' } };
  await sincronizarVenta(sale, {}, null, store.api);
  const linked = store.data.get('fin_cxc/sale-1');
  linked.abonos.push({ id: 'manual', monto: 20 });
  await sincronizarVenta(sale, {}, null, store.api);
  assert.equal(store.data.get('fin_cxc/sale-1').saldoPendiente, 45);
  assert.equal(store.data.get('fin_cxc/sale-1').abonos.length, 2);
  assert.equal(store.data.get('fin_movimientos/venta_sale-1').saldoPendiente, 45);
  assert.equal([...store.data.keys()].filter(k => k.startsWith('fin_movimientos/')).length, 1);
});

test('invoice XML preserves custom description, escapes XML and agrees with discounted inclusive price', () => {
  const item = { productId: 'product', name: 'Nombre catálogo', invoiceDescription: 'Instalación & soporte <especial>', price: 115, quantity: 1, tax_mode: 'INCLUIDO', tarifa_iva: .15 };
  const generalDiscount = { id: 'd', activo: true, tipo_valor: 'PORCENTAJE', valor: 10 };
  const totals = calculateTransactionTotals([item], generalDiscount);
  const { xml } = generarFacturaXML({ ruc: '1790012345001', ambiente: '1', establecimiento: '001', puntoEmision: '001', razonSocial: 'Prueba' }, { date: '2026-09-14', generalDiscount }, { name: 'Cliente', ruc: '9999999999999', tipoIdentificacion: 'consumidor_final' }, [item]);
  assert.match(xml, /Instalación &amp; soporte &lt;especial&gt;/);
  assert.match(xml, /<importeTotal>103.50<\/importeTotal>/);
  assert.equal(Math.round(totals.total * 100), 10350);
  assert.equal(item.name, 'Nombre catálogo');
});

test('cash closing separates mixed methods and excludes drafts and canceled sales', () => {
  assert.deepEqual(cashSessionTotals([
    { type: 'ingreso', sriStatus: 'autorizado', paymentsBreakdown: { efectivo: 10, tarjeta: 20, cruce_cuentas: 5 } },
    { type: 'ingreso', sriStatus: 'autorizado', paymentMethod: 'efectivo', total: 7 },
    { type: 'ingreso', sriStatus: 'pendiente', paymentMethod: 'efectivo', total: 100 },
    { type: 'ingreso', sriStatus: 'anulado', paymentMethod: 'efectivo', total: 100 }
  ]), { efectivo: 17, tarjeta: 20, transferencia: 0, cruce_cuentas: 5 });
});
test('manual discounts and expired promotions do not diverge from the invoice', () => {
  assert.equal(calculateTransactionTotals([{ price: 10, quantity: 2, taxRate: 0, discount: 3 }]).total, 17);
  assert.equal(calculateTransactionTotals([{ price: 10, quantity: 2, taxRate: 0, id_descuento_aplicado: 'expired', discount_value: 50, discount_type: 'PORCENTAJE', descuento_objeto: { id: 'expired', activo: false, valor: 50 } }]).total, 20);
});

test('printed documents retain their issued amounts after a discount expires', () => {
  const line = { price: 115, quantity: 1, tax_mode: 'INCLUIDO', tarifa_iva: 0.15, precio_base_unitario: 100, monto_descuento_linea: 10, descuento_prorrateado: 5, subtotal_neto_linea_final: 85, total_linea: 97.75, descuento_objeto: { activo: false } };
  assert.deepEqual(invoiceLineAmounts(line), { unitPrice: 100, discount: 15, base: 85, total: 97.75, rate: 15 });
});

test('administrative sales keep repeated products as independent invoice lines', () => {
  const p = product('support', 0, { type: 'SERVICE', salePrice: 10, taxRate: 0 });
  const first = appendInvoiceLine([], p)[0];
  const second = appendInvoiceLine([first], p)[1];
  assert.equal(first.productId, second.productId);
  assert.notEqual(first.lineId, second.lineId);
  assert.equal(appendInvoiceLine([first], p).length, 2);
});
