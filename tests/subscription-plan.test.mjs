import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlanTotal, validatePlanPayment, isBasePlanCategory, getSubscriptionExpiry } from '../src/services/subscriptionPlan.js';

test('administrator price is the only accepted amount for monthly and annual subscriptions', () => {
  const plan = { id: 'sri_pyme', category: 'facturacion', priceMonthly: 22.5, priceYearly: 18.25 };
  assert.equal(getPlanTotal(plan, 'monthly'), 22.5);
  assert.equal(getPlanTotal(plan, 'yearly'), 219);
  assert.equal(validatePlanPayment(plan, { category: 'facturacion', billingPeriod: 'yearly', amount: 219 }), 'facturacion');
  assert.throws(() => validatePlanPayment(plan, { category: 'facturacion', billingPeriod: 'yearly', amount: 19 }), /monto reportado/);
  assert.throws(() => validatePlanPayment(plan, { category: 'paginas', billingPeriod: 'monthly', amount: 22.5 }), /categoría/);
  assert.throws(() => validatePlanPayment({ ...plan, active: false }, { billingPeriod: 'monthly', amount: 22.5 }), /no está disponible/);
});

test('add-on subscriptions are separate from the ERP plan and renew their own expiry', () => {
  assert.equal(isBasePlanCategory('facturacion'), true);
  assert.equal(isBasePlanCategory('erp'), true);
  assert.equal(isBasePlanCategory('paginas'), false);
  assert.equal(isBasePlanCategory('correos'), false);
  assert.equal(isBasePlanCategory('whatsapp'), false);
  const now = new Date('2026-01-15T12:00:00Z');
  assert.equal(getSubscriptionExpiry('2026-01-31T12:00:00Z', 'monthly', now).toISOString(), '2026-02-28T12:00:00.000Z');
  assert.equal(getSubscriptionExpiry('2025-12-01T12:00:00Z', 'monthly', now).toISOString(), '2026-02-15T12:00:00.000Z');
  assert.equal(getSubscriptionExpiry(null, 'yearly', now).toISOString(), '2027-01-15T12:00:00.000Z');
});
