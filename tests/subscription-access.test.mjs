import test from 'node:test';
import assert from 'node:assert/strict';
import { isSubscriptionBlocked, getSubscriptionExpiry } from '../src/services/subscriptionAccess.js';

const now = new Date('2026-11-09T12:00:00.000Z');

test('an expired trial is blocked even if its status was never updated', () => {
  const tenant = {
    planStatus: 'trial',
    expiresAt: '2099-01-01T00:00:00.000Z',
    trialExpiresAt: { toDate: () => new Date('2026-11-08T12:00:00.000Z') }
  };
  assert.equal(isSubscriptionBlocked(tenant, now), true);
  assert.equal(getSubscriptionExpiry(tenant).toISOString(), '2026-11-08T12:00:00.000Z');
});

test('an active subscription remains available until its expiry', () => {
  const tenant = { planStatus: 'active', expiresAt: '2026-11-10T12:00:00.000Z' };
  assert.equal(isSubscriptionBlocked(tenant, now), false);
  assert.equal(isSubscriptionBlocked(tenant, new Date('2026-11-10T12:00:00.000Z')), true);
});

test('an active subscription uses its protected expiry instead of the legacy date', () => {
  const tenant = {
    planStatus: 'active',
    expiresAt: '2099-01-01T00:00:00.000Z',
    subscriptionExpiresAt: { toDate: () => new Date('2026-11-08T12:00:00.000Z') }
  };
  assert.equal(isSubscriptionBlocked(tenant, now), true);
  assert.equal(getSubscriptionExpiry(tenant).toISOString(), '2026-11-08T12:00:00.000Z');
});

test('explicit suspension blocks access without an expiry date', () => {
  assert.equal(isSubscriptionBlocked({ planStatus: 'suspended' }, now), true);
});

test('a new registration stays blocked until SuperAdmin approves its trial', () => {
  assert.equal(isSubscriptionBlocked({ planStatus: 'pending_approval' }, now), true);
  assert.equal(isSubscriptionBlocked({
    planStatus: 'trial',
    trialExpiresAt: { toDate: () => new Date('2026-11-23T12:00:00.000Z') }
  }, now), false);
});
