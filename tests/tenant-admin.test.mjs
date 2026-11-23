import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationOptions, subscriptionUpdate, tenantDateInput, tenantStatus, tenantSetupChecks } from '../src/services/tenantAdminModel.js';

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
