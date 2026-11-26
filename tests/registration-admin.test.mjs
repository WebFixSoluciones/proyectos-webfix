import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsersHandler, registrationSummary } from '../api/admin/users.js';
function setup() {
  const rows = new Map([['users/root', { role: 'superadmin', status: 'active' }]]);
  const accounts = new Map([['new', { uid: 'new', email: 'new@example.test', emailVerified: false, passwordHash: 'secret', metadata: { creationTime: '2026-11-13T00:00:00Z' } }], ['anonymous', { uid: 'anonymous' }]]);
  let counter = 0;
  const ref = path => ({ path, id: path.split('/').at(-1), async get() { return snapshot(this); }, collection: name => col(`${path}/${name}`) });
  const col = path => ({ doc: () => ref(`${path}/generated-${++counter}`) });
  const snapshot = item => ({ exists: rows.has(item.path), id: item.id, data: () => rows.get(item.path) });
  const db = { doc: ref, collection: col, getAll: async (...refs) => refs.map(snapshot), async runTransaction(body) {
    const writes = [];
    const result = await body({ get: async item => snapshot(item), create: (item, data) => writes.push(() => { if (rows.has(item.path)) throw new Error('Already exists'); rows.set(item.path, data); }), update: (item, data) => writes.push(() => rows.set(item.path, { ...rows.get(item.path), ...data })) });
    writes.forEach(write => write()); return result;
  } };
  const auth = { async verifyIdToken(token, revoked) { assert.equal(revoked, true); if (token !== 'valid') throw new Error('bad-token'); return { uid: 'root' }; }, async listUsers() { return { users: [...accounts.values()] }; }, async getUser(uid) { return accounts.get(uid); } };
  const handler = createUsersHandler(() => ({ auth, db, serverTimestamp: () => 'server-time', timestamp: date => date }));
  async function call(body, token = 'valid', method = body ? 'POST' : 'GET') {
    const result = { headers: {} };
    const res = { setHeader: (key, value) => { result.headers[key] = value; }, status: code => { result.status = code; return res; }, json: value => { result.body = value; return result; } };
    await handler({ method, headers: { authorization: token ? `Bearer ${token}` : '' }, query: {}, body }, res);
    return result;
  }
  return { rows, accounts, call };
}
test('registration summary tells the administrator what is missing without exposing Auth secrets', () => {
  const result = registrationSummary({ uid: 'a', email: 'a@example.test', emailVerified: true, passwordHash: 'secret' }, null, null);
  assert.equal(result.incomplete, true); assert.equal(result.canComplete, true);
  assert.deepEqual(result.missing, ['Falta crear el perfil de usuario', 'Falta crear o vincular la empresa']);
  assert.equal('passwordHash' in result, false);
});
test('registration administration requires a non-revoked session and an active superadmin profile', async () => {
  const { rows, call } = setup();
  assert.equal((await call(null, '')).status, 401);
  assert.equal((await call(null, 'bad')).status, 401);
  rows.set('users/root', { role: 'admin', status: 'active' });
  assert.equal((await call()).status, 403);
  rows.set('users/root', { role: 'superadmin', status: 'inactive' });
  assert.equal((await call()).status, 403);
});
test('list joins Authentication profiles and tenants and separates accounts without contact', async () => {
  const { call } = setup(); const result = await call();
  assert.equal(result.status, 200); assert.equal(result.body.withoutEmail, 1);
  assert.equal(result.body.users.length, 1); assert.equal(result.body.users[0].incomplete, true);
  assert.equal(JSON.stringify(result.body).includes('secret'), false);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
});
test('recovery creates a pending isolated tenant and explicit approval grants a trial only once', async () => {
  const { rows, call } = setup();
  assert.equal((await call({ uid: 'new', action: 'complete', name: 'Cliente', companyName: '' })).status, 400);
  assert.equal(rows.has('users/new'), false);
  const completed = await call({ uid: 'new', action: 'complete', name: 'Cliente', companyName: 'Negocio' });
  assert.equal(completed.status, 200);
  const tenant = `tenants/${completed.body.tenantId}`;
  assert.equal(rows.get(tenant).planStatus, 'pending_approval');
  assert.equal(rows.get(tenant).requireEmailVerification, true);
  assert.equal(rows.get('users/new').tenantId, completed.body.tenantId);
  assert.equal((await call({ uid: 'new', action: 'complete', name: 'Otro', companyName: 'Otra' })).status, 409);
  assert.equal((await call({ uid: 'new', action: 'enable' })).status, 200);
  assert.equal(rows.get(tenant).planStatus, 'trial');
  assert.ok(rows.get(tenant).trialExpiresAt > new Date());
  assert.equal(rows.get(tenant).requireEmailVerification, true);
  assert.equal((await call({ uid: 'new', action: 'enable' })).status, 409);
  assert.equal([...rows.keys()].filter(key => key.includes('/admin_events/')).length, 2);
});
test('an employee cannot enable a pending company on behalf of the owner', async () => {
  const { rows, call } = setup();
  rows.set('users/new', { tenantId: 'other', status: 'active', role: 'staff' });
  rows.set('tenants/other', { ownerUid: 'another', planStatus: 'pending_approval' });
  assert.equal((await call({ uid: 'new', action: 'enable' })).status, 409);
  assert.equal(rows.get('tenants/other').planStatus, 'pending_approval');
});

test('enable supports direct active plan activation with chosen planId, billingPeriod and expiry', async () => {
  const { rows, call } = setup();
  const completed = await call({ uid: 'new', action: 'complete', name: 'Ana', companyName: 'Comercial Ana' });
  const tenantPath = `tenants/${completed.body.tenantId}`;
  const enabled = await call({
    uid: 'new',
    action: 'enable',
    planStatus: 'active',
    planId: 'professional',
    billingPeriod: 'yearly',
    expiresAt: '2027-11-25'
  });
  assert.equal(enabled.status, 200);
  assert.equal(rows.get(tenantPath).planStatus, 'active');
  assert.equal(rows.get(tenantPath).planId, 'professional');
  assert.equal(rows.get(tenantPath).billingPeriod, 'yearly');
  assert.equal(rows.get(tenantPath).expiresAt, '2027-11-25T23:59:59.000Z');
  assert.ok(rows.get(tenantPath).subscriptionExpiresAt instanceof Date);
  assert.equal('trialExpiresAt' in rows.get(tenantPath), false);
});

test('update_tenant and save_plan allow superadmin to persist tenant plan assignments and plan catalog via Admin SDK', async () => {
  const { rows, call } = setup();
  rows.set('tenants/org_f5tar', {
    id: 'org_f5tar',
    companyName: 'F5TAR',
    planId: 'starter',
    planStatus: 'trial',
    billingPeriod: 'monthly'
  });

  const updated = await call({
    action: 'update_tenant',
    tenantId: 'org_f5tar',
    companyName: 'F5TAR',
    planId: 'enterprise',
    planStatus: 'active',
    billingPeriod: 'yearly',
    expiresAt: '2027-12-10'
  });
  assert.equal(updated.status, 200);
  assert.equal(rows.get('tenants/org_f5tar').planStatus, 'active');
  assert.equal(rows.get('tenants/org_f5tar').planId, 'enterprise');
  assert.equal(rows.get('tenants/org_f5tar').billingPeriod, 'yearly');
  assert.equal(rows.get('tenants/org_f5tar').expiresAt, '2027-12-10T23:59:59.000Z');
  assert.ok(rows.get('tenants/org_f5tar').subscriptionExpiresAt instanceof Date);

  const savedPlan = await call({
    action: 'save_plan',
    plan: {
      id: 'starter',
      name: 'Starter Plus',
      category: 'erp',
      priceMonthly: 29.99,
      priceYearly: 24.5,
      maxUsers: 5,
      maxProducts: 250,
      modules: ['dashboard', 'ventas']
    }
  });
  assert.equal(savedPlan.status, 200);
  assert.equal(rows.get('plans/starter').name, 'Starter Plus');
  assert.equal(rows.get('plans/starter').priceMonthly, 29.99);
});
