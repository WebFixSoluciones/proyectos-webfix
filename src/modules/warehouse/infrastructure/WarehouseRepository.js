/**
 * Capa de Infraestructura — Repositorio Unificado de Bodegas (`inventory_branches`).
 * Lee y reconcilia bodegas existentes en `finances_settings/config` y `stockByBranch` sin borrar datos.
 */
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase.js';
import { reconcileWarehouses, slugifyWarehouseId } from '../domain/warehouseModel.js';

function branchesCol(firestore = db, tenantId = appId) {
  return collection(firestore, 'artifacts', tenantId, 'public', 'data', 'inventory_branches');
}

export async function fetchUnifiedWarehouses({ firestore = db, tenantId = appId, products = [] } = {}) {
  const [branchSnap, configSnap] = await Promise.all([
    getDocs(branchesCol(firestore, tenantId)).catch(() => ({ docs: [] })),
    getDoc(doc(firestore, 'artifacts', tenantId, 'public', 'data', 'finances_settings', 'config')).catch(() => null)
  ]);

  const branchDocs = branchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const configData = configSnap?.exists?.() ? configSnap.data() : {};

  return reconcileWarehouses({
    branchDocs,
    settingsBodegas: configData.bodegas || [],
    settingsSucursales: configData.sucursales || [],
    products
  });
}

export async function saveWarehouse({ firestore = db, tenantId = appId, warehouse }) {
  const name = String(warehouse?.name || '').trim();
  if (!name) throw new Error('El nombre de la bodega es obligatorio.');
  const id = warehouse.id || slugifyWarehouseId(name);
  const payload = {
    id,
    name,
    code: String(warehouse.code || id.toUpperCase().slice(0, 10)).trim(),
    address: String(warehouse.address || '').trim(),
    establishmentCode: String(warehouse.establishmentCode || '001').replace(/\D/g, '').padStart(3, '0').slice(-3),
    manager: String(warehouse.manager || '').trim(),
    active: warehouse.active !== false,
    isDefault: Boolean(warehouse.isDefault || id === 'sucursal-central-uuid'),
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(branchesCol(firestore, tenantId), id), payload, { merge: true });

  // Mantener sincronizada la lista legacy `bodegas` en finances_settings/config (sin perder ninguna)
  try {
    const configRef = doc(firestore, 'artifacts', tenantId, 'public', 'data', 'finances_settings', 'config');
    const cfgSnap = await getDoc(configRef);
    const current = cfgSnap.exists() && Array.isArray(cfgSnap.data().bodegas) ? cfgSnap.data().bodegas : [];
    if (!current.includes(name)) {
      await setDoc(configRef, { bodegas: [...current, name] }, { merge: true });
    }
  } catch {
    // No bloquear si el usuario tiene permiso de bodega pero no de configuración fiscal
  }

  return payload;
}

export async function toggleWarehouseActive({ firestore = db, tenantId = appId, branchId, active }) {
  if (branchId === 'sucursal-central-uuid' && !active) {
    throw new Error('No se puede desactivar la Bodega Central principal.');
  }
  await updateDoc(doc(branchesCol(firestore, tenantId), branchId), {
    active: Boolean(active),
    updatedAt: new Date().toISOString()
  });
}
