import * as firebase from 'firebase/firestore';
import { getAppId, db as defaultDb } from '../firebase.js';

export * from 'firebase/firestore';
export const LEGACY_ISSUER_RUC = '1754376901001';
export const FINANCE_COLLECTIONS = ['fin_movimientos', 'fin_movimientos_bancarios', 'fin_bancos', 'fin_tarjetas', 'fin_consumos_tarjeta', 'fin_prestamos', 'fin_capturas', 'fin_cuentas', 'fin_centros_costo', 'fin_asientos', 'fin_auditoria', 'fin_cxc', 'fin_cxp'];
const pending = new Map();

export function financePath(tenantId, ...segments) {
  return FINANCE_COLLECTIONS.includes(segments[0]) ? ['artifacts', tenantId, 'public', 'data', ...segments] : segments;
}

export const collection = (db, ...segments) => firebase.collection(db, ...financePath(getAppId(), ...segments));
export const doc = (db, ...segments) => firebase.doc(db, ...financePath(getAppId(), ...segments));

/** Copy legacy records once for the issuer explicitly identified by the owner. Never delete originals. */
export async function migrateLegacyFinance(db, tenantId, api = firebase) {
  const scoped = (name, id) => api.doc(db, ...financePath(tenantId, name, id));
  const marker = api.doc(db, 'artifacts', tenantId, 'public', 'data', 'migrations', 'finance-v1');
  if ((await api.getDoc(marker)).data()?.complete) return;
  const config = (await api.getDoc(api.doc(db, 'artifacts', tenantId, 'public', 'data', 'finances_settings', 'config'))).data();
  if (String(config?.ruc || '').trim() !== LEGACY_ISSUER_RUC) return;
  const claim = api.doc(db, 'finance_migrations', LEGACY_ISSUER_RUC);
  await api.runTransaction(db, async tx => {
    const owner = (await tx.get(claim)).data();
    if (owner && owner.tenantId !== tenantId) throw new Error('El histórico financiero ya está asignado a otra empresa.');
    if (!owner) tx.set(claim, { tenantId, ruc: LEGACY_ISSUER_RUC, startedAt: api.serverTimestamp() });
  });
  const counts = {};
  for (const name of FINANCE_COLLECTIONS) {
    const rows = await api.getDocs(api.collection(db, name));
    counts[name] = rows.docs.length;
    for (let index = 0; index < rows.docs.length; index += 80) {
      const group = rows.docs.slice(index, index + 80);
      await api.runTransaction(db, async tx => {
        const snapshots = [];
        for (const row of group) snapshots.push(await tx.get(scoped(name, row.id)));
        group.forEach((row, i) => {
          const legacy = row.data();
          if (legacy.tenantId && legacy.tenantId !== tenantId) throw new Error('Un registro histórico identifica otra empresa; revisa la migración.');
          if (!snapshots[i].exists()) tx.set(scoped(name, row.id), { ...legacy, tenantId, legacyCollection: name });
        });
      });
    }
  }
  await api.setDoc(marker, { complete: true, ruc: LEGACY_ISSUER_RUC, counts, completedAt: api.serverTimestamp() });
}

function ready(db = defaultDb) {
  const tenant = getAppId();
  if (!tenant) return Promise.reject(new Error('No hay una empresa seleccionada.'));
  if (!pending.has(tenant)) pending.set(tenant, migrateLegacyFinance(db, tenant).catch(error => { pending.delete(tenant); throw error; }));
  return pending.get(tenant);
}
export async function getDoc(...args) { await ready(); return firebase.getDoc(...args); }
export async function getDocs(...args) { await ready(); return firebase.getDocs(...args); }
export async function addDoc(...args) { await ready(); return firebase.addDoc(...args); }
export async function setDoc(...args) { await ready(); return firebase.setDoc(...args); }
export async function updateDoc(...args) { await ready(); return firebase.updateDoc(...args); }
export async function deleteDoc(...args) { await ready(); return firebase.deleteDoc(...args); }
export async function runTransaction(db, ...args) { await ready(db); return firebase.runTransaction(db, ...args); }
