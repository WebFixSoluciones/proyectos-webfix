import test from 'node:test';
import assert from 'node:assert/strict';
import { getPosSaleIssues, getAdministrativeSaleIssues } from '../src/services/saleValidation.js';

const product = { productId: 'support', name: 'Soporte digital', quantity: 1, price: 20, invoiceDescription: 'Encuestas' };
const customer = { name: 'Cliente', ruc: '1793193190001' };

test('POS lists missing client and product before opening payment without mutating the cart', () => {
  const cart = [];
  const issues = getPosSaleIssues({ sessionReady: true, cart, selectedClientId: '', clientExists: false, total: 0, documentType: 'factura', cashier: 'Cajero' });
  assert.deepEqual(issues.map(i => i.target), ['items', 'client']);
  assert.deepEqual(cart, []);
});

test('POS accepts explicitly selected final consumer below $50 and blocks an unidentified invoice above it', () => {
  const input = { sessionReady: true, cart: [product], selectedClientId: 'consumidor_final', clientExists: true, client: { name: 'Consumidor Final', ruc: '9999999999999' }, documentType: 'factura', cashier: 'Cajero' };
  assert.deepEqual(getPosSaleIssues({ ...input, total: 20 }), []);
  assert.ok(getPosSaleIssues({ ...input, total: 51 }).some(i => i.target === 'client'));
});

test('both sale paths block invalid lines and administrative sale explains missing payment', () => {
  assert.ok(getPosSaleIssues({ sessionReady: true, cart: [{ ...product, quantity: 0 }], selectedClientId: 'client', clientExists: true, client: customer, total: 20, documentType: 'factura', cashier: 'Cajero' }).some(i => i.target === 'items'));
  const issues = getAdministrativeSaleIssues({ clientId: 'client', client: customer, identificationValid: true, items: [product], total: 20, documentType: 'factura', paymentStatus: { isValid: false, error: 'Faltan $20.' }, payments: {} });
  assert.deepEqual(issues.map(i => i.target), ['payment']);
  assert.match(issues[0].message, /medio de pago/);
});
