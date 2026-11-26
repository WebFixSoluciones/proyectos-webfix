import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registrationOptions,
  subscriptionUpdate,
  tenantDateInput,
  tenantStatus,
  tenantSetupChecks,
  computeDefaultExpiryDate,
  buildTenantFirestorePatch,
  sanitizePlanForSave
} from '../src/services/tenantAdminModel.js';

test('registration normalizes untrusted plan and billing query parameters', () => {
  assert.deepEqual(registrationOptions('inexistente', 'free'), { planId: 'starter', billingPeriod: 'monthly' });
  assert.deepEqual(registrationOptions('enterprise', 'yearly'), { planId: 'enterprise', billingPeriod: 'yearly' });
});
test('admin edits use the protected expiry rather than a stale legacy date', () => {
  const tenant = { planStatus: 'trial', expiresAt: '2099-01-01', trialExpiresAt: { toDate: () => new Date('2026-11-01') } };
  assert.equal(tenantDateInput(tenant), '2026-11-01');
  assert.equal(tenantStatus(tenant, new Date('2026-11-13')), 'Vencido');
  assert.equal(tenantDateInput({}), '');
});
test('subscription edits retain company and billing period and reject invalid dates', () => {
  const tenant = { companyName: ' Empresa ', planId: 'starter', planStatus: 'trial', billingPeriod: 'yearly', expiresAt: '2026-12-01' };
  assert.deepEqual(subscriptionUpdate(tenant), { ...tenant, companyName: 'Empresa', expiresAt: '2026-12-01T00:00:00.000Z' });
  assert.throws(() => subscriptionUpdate({ ...tenant, expiresAt: '' }), /fecha/);
  assert.throws(() => subscriptionUpdate({ ...tenant, companyName: ' ' }), /nombre/);
});
test('setup distinguishes a missing or inactive owner and does not claim SRI readiness', () => {
  const tenant = { ownerUid: 'owner', planStatus: 'trial', expiresAt: '2026-12-01' };
  assert.equal(tenantSetupChecks(tenant, [])[0].ready, false);
  assert.equal(tenantSetupChecks(tenant, [{ id: 'owner', role: 'admin', status: 'inactive' }])[0].ready, false);
  const checks = tenantSetupChecks(tenant, [{ id: 'owner', role: 'admin', status: 'active' }]);
  assert.equal(checks[0].ready, true);
  assert.equal(checks[2].ready, false);
  assert.equal(checks[3].ready, false);
});

test('a pending tenant has no expiry until approved and is labelled for approval', () => {
  const tenant = { companyName: 'Negocio', planId: 'starter', planStatus: 'pending_approval', billingPeriod: 'monthly', expiresAt: '' };
  assert.equal(tenantStatus(tenant), 'Por aprobar');
  assert.equal('expiresAt' in subscriptionUpdate(tenant), false);
});

test('direct activation from pending_approval to active sets chosen plan, subscriptionExpiresAt and approval metadata', () => {
  const { patch } = buildTenantFirestorePatch(
    {
      companyName: 'Nivu Software SAS',
      planId: 'sri_pyme',
      planStatus: 'active',
      billingPeriod: 'yearly',
      expiresAt: '2027-11-25'
    },
    {
      previousStatus: 'pending_approval',
      actorUid: 'super-1',
      timestampFactory: d => ({ toDate: () => d })
    }
  );
  assert.equal(patch.planStatus, 'active');
  assert.equal(patch.planId, 'sri_pyme');
  assert.equal(patch.billingPeriod, 'yearly');
  assert.equal(patch.expiresAt, '2027-11-25T23:59:59.000Z');
  assert.equal(patch.subscriptionExpiresAt.toDate().toISOString(), '2027-11-25T23:59:59.000Z');
  assert.equal('trialExpiresAt' in patch, false);
  assert.equal(patch.approvedBy, 'super-1');
  assert.ok(patch.approvedAt);
});

test('computeDefaultExpiryDate generates valid future dates for trial, monthly and yearly', () => {
  const ref = new Date('2026-11-25T12:00:00.000Z');
  assert.equal(computeDefaultExpiryDate('trial', 'monthly', ref), '2026-12-09');
  assert.equal(computeDefaultExpiryDate('active', 'monthly', ref), '2026-12-25');
  assert.equal(computeDefaultExpiryDate('active', 'yearly', ref), '2027-11-25');
});

test('sanitizePlanForSave accepts decimal prices, zero limits for add-ons and strips undefined fields', () => {
  const clean = sanitizePlanForSave({
    id: 'mail_pro',
    name: ' Plan Mail Pro ',
    category: 'correos',
    priceMonthly: '9.99',
    priceYearly: '7.50',
    maxUsers: undefined,
    maxProducts: '',
    featuresText: '10 GB\nWebmail\n\n',
    modules: ['ventas', 'ventas'],
    description: undefined
  });
  assert.equal(clean.priceMonthly, 9.99);
  assert.equal(clean.priceYearly, 7.5);
  assert.equal(clean.maxUsers, 0);
  assert.equal(clean.maxProducts, 0);
  assert.deepEqual(clean.features, ['10 GB', 'Webmail']);
  assert.deepEqual(clean.modules, ['ventas']);
  assert.equal(Object.values(clean).some(v => v === undefined), false);
});
