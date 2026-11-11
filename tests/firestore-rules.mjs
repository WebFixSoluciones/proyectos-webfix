import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where,
  writeBatch, serverTimestamp, Timestamp
} from 'firebase/firestore';

const projectId = 'demo-webfix';
const env = await initializeTestEnvironment({
  projectId,
  firestore: { rules: readFileSync('firestore.rules', 'utf8') }
});

function client(uid, verified = false) {
  return env.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: verified,
    firebase: { sign_in_provider: 'password' }
  }).firestore();
}

try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'owner-a'), { uid: 'owner-a', tenantId: 'tenant-a', email: 'a@example.test', role: 'admin', status: 'active' });
    await setDoc(doc(db, 'tenants', 'tenant-a'), { id: 'tenant-a', ownerUid: 'owner-a', planId: 'starter', planStatus: 'active', expiresAt: '2027-01-01T00:00:00Z', subscriptionExpiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000) });
    await setDoc(doc(db, 'users', 'owner-b'), { uid: 'owner-b', tenantId: 'tenant-b', email: 'b@example.test', role: 'admin', status: 'active' });
    await setDoc(doc(db, 'tenants', 'tenant-b'), { id: 'tenant-b', ownerUid: 'owner-b', planId: 'starter', planStatus: 'active', expiresAt: '2027-01-01T00:00:00Z', subscriptionExpiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000) });
    await setDoc(doc(db, 'users', 'root'), { uid: 'root', tenantId: 'tenant-a', email: 'root@example.test', role: 'superadmin', status: 'active' });
    await setDoc(doc(db, 'fin_movimientos', 'movement-b'), { tenantId: 'tenant-b', amount: 10 });
    await setDoc(doc(db, 'plans', 'starter'), { id: 'starter', category: 'erp', priceMonthly: 29, priceYearly: 23 });
    await setDoc(doc(db, 'plans', 'web_landing'), { id: 'web_landing', category: 'paginas', priceMonthly: 15, priceYearly: 12 });
    await setDoc(doc(db, 'users', 'expired-owner'), { uid: 'expired-owner', tenantId: 'expired-tenant', role: 'admin', status: 'active' });
    await setDoc(doc(db, 'tenants', 'expired-tenant'), {
      id: 'expired-tenant', ownerUid: 'expired-owner', planStatus: 'trial',
      trialExpiresAt: Timestamp.fromMillis(Date.now() - 86400000)
    });
    await setDoc(doc(db, 'users', 'expired-paid-owner'), { uid: 'expired-paid-owner', tenantId: 'expired-paid', role: 'admin', status: 'active' });
    await setDoc(doc(db, 'tenants', 'expired-paid'), {
      id: 'expired-paid', ownerUid: 'expired-paid-owner', planStatus: 'active',
      expiresAt: '2099-01-01T00:00:00Z',
      subscriptionExpiresAt: Timestamp.fromMillis(Date.now() - 86400000)
    });
  });

  const a = client('owner-a');
  const b = client('owner-b');
  const root = client('root');
  await assertFails(updateDoc(doc(a, 'tenants', 'tenant-a'), { planStatus: 'active', planId: 'enterprise' }));
  await assertFails(setDoc(doc(a, 'transfers', 'fake-approved'), {
    id: 'fake-approved', tenantId: 'tenant-a', status: 'approved', amount: 29, planId: 'starter', category: 'erp',
    billingPeriod: 'monthly', referenceNumber: 'FAKE'
  }));
  await assertSucceeds(setDoc(doc(a, 'transfers', 'pending-a'), {
    id: 'pending-a', tenantId: 'tenant-a', status: 'pending', amount: 29, planId: 'starter', category: 'erp',
    billingPeriod: 'monthly', referenceNumber: 'BANK-123'
  }));
  await assertFails(setDoc(doc(a, 'transfers', 'underpaid'), {
    id: 'underpaid', tenantId: 'tenant-a', status: 'pending', amount: 1, planId: 'starter', category: 'erp',
    billingPeriod: 'monthly', referenceNumber: 'BANK-UNDER'
  }));
  await assertFails(setDoc(doc(a, 'transfers', 'wrong-category'), {
    id: 'wrong-category', tenantId: 'tenant-a', status: 'pending', amount: 15, planId: 'web_landing', category: 'erp',
    billingPeriod: 'monthly', referenceNumber: 'BANK-WRONG'
  }));
  await assertSucceeds(setDoc(doc(a, 'transfers', 'addon'), {
    id: 'addon', tenantId: 'tenant-a', status: 'pending', amount: 15, planId: 'web_landing', category: 'paginas',
    billingPeriod: 'monthly', referenceNumber: 'BANK-ADDON'
  }));
  await assertSucceeds(getDocs(query(collection(a, 'transfers'), where('tenantId', '==', 'tenant-a'))));
  await assertFails(updateDoc(doc(a, 'transfers', 'pending-a'), { status: 'approved' }));
  await assertFails(getDoc(doc(b, 'transfers', 'pending-a')));
  await assertSucceeds(updateDoc(doc(root, 'transfers', 'pending-a'), { status: 'approved' }));
  const anonymous = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(anonymous, 'landing_leads', 'public-inquiry'), {
    nombre: 'Prueba', email: 'test@example.test', telefono: '', empresa: '',
    mensaje: 'Consulta de prueba', fecha: serverTimestamp(), estado: 'nuevo'
  }));
  await assertFails(getDoc(doc(anonymous, 'landing_leads', 'public-inquiry')));
  await assertFails(getDoc(doc(a, 'landing_leads', 'public-inquiry')));
  await assertSucceeds(getDoc(doc(root, 'landing_leads', 'public-inquiry')));
  await assertFails(updateDoc(doc(a, 'landing_leads', 'public-inquiry'), { estado: 'cerrado' }));
  await assertSucceeds(setDoc(doc(a, 'payment_vouchers', 'voucher-a'), { tenantId: 'tenant-a', status: 'pending' }));
  await assertFails(updateDoc(doc(a, 'payment_vouchers', 'voucher-a'), { status: 'approved' }));
  await assertFails(updateDoc(doc(a, 'users', 'owner-a'), { role: 'superadmin' }));
  await assertFails(updateDoc(doc(a, 'fin_movimientos', 'movement-b'), { tenantId: 'tenant-a' }));
  await assertSucceeds(setDoc(doc(a, 'fin_movimientos', 'movement-a'), { tenantId: 'tenant-a', amount: 15 }));
  const expired = client('expired-owner');
  await assertFails(setDoc(doc(expired, 'artifacts', 'expired-tenant', 'public', 'data', 'meta', 'info'), { ready: true }));
  await assertFails(setDoc(doc(expired, 'fin_movimientos', 'expired-movement'), { tenantId: 'expired-tenant', amount: 10 }));
  const expiredPaid = client('expired-paid-owner');
  await assertFails(setDoc(doc(expiredPaid, 'artifacts', 'expired-paid', 'public', 'data', 'meta', 'info'), { ready: true }));
  await assertFails(setDoc(doc(expiredPaid, 'fin_movimientos', 'expired-paid-movement'), { tenantId: 'expired-paid', amount: 10 }));

  await assertSucceeds(setDoc(doc(a, 'users', 'staff-a'), {
    uid: 'staff-a', tenantId: 'tenant-a', email: 'staff@example.test', role: 'staff', status: 'active'
  }));
  await assertSucceeds(updateDoc(doc(a, 'users', 'staff-a'), { status: 'inactive' }));
  await assertFails(updateDoc(doc(a, 'users', 'owner-b'), { status: 'inactive' }));

  const fresh = client('new-owner');
  const batch = writeBatch(fresh);
  const tenantId = 'new-tenant';
  batch.set(doc(fresh, 'tenants', tenantId), {
    id: tenantId, ownerUid: 'new-owner', companyName: 'Nueva empresa',
    planId: 'starter', planStatus: 'trial', requireEmailVerification: true,
    createdAt: serverTimestamp(),
    trialExpiresAt: Timestamp.fromMillis(Date.now() + 14 * 86400000)
  });
  batch.set(doc(fresh, 'users', 'new-owner'), {
    uid: 'new-owner', tenantId, email: 'new-owner@example.test', role: 'admin', status: 'active'
  });
  batch.set(doc(fresh, 'artifacts', tenantId, 'public', 'data', 'meta', 'info'), { ready: true });
  await assertSucceeds(batch.commit());
  await assertFails(getDoc(doc(fresh, 'artifacts', tenantId, 'public', 'data', 'meta', 'info')));
  await assertSucceeds(getDoc(doc(client('new-owner', true), 'artifacts', tenantId, 'public', 'data', 'meta', 'info')));
  console.log('Firestore rules: tenant, payment, user, isolation and registration checks passed.');
} finally {
  await env.cleanup();
}
