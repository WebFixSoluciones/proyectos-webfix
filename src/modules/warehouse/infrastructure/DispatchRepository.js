/**
 * Capa de Infraestructura — Repositorio de Despachos Posteriores de Bodega (`inventory_dispatches`).
 * Guarda bajo `artifacts/{appId}/public/data/inventory_dispatches` (ya cubierto por firestore.rules).
 */
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase.js';
import { buildDispatchFromSale, applyDispatchQuantities, DISPATCH_STATUS } from '../domain/dispatchModel.js';

function dispatchesCol(firestore = db, tenantId = appId) {
  return collection(firestore, 'artifacts', tenantId, 'public', 'data', 'inventory_dispatches');
}

export function subscribeDispatches(onChange, { firestore = db, tenantId = appId, onError } = {}) {
  return onSnapshot(
    dispatchesCol(firestore, tenantId),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      onChange(list);
    },
    (err) => {
      if (onError) onError(err);
      else console.error('Error subscribing to inventory_dispatches:', err);
    }
  );
}

export async function fetchDispatches({ firestore = db, tenantId = appId } = {}) {
  const snap = await getDocs(dispatchesCol(firestore, tenantId));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/**
 * Crea (o recupera si ya existe) una orden de despacho a partir de una venta.
 * También actualiza `dispatchStatus` en la transacción de venta sin alterar datos fiscales.
 */
export async function ensureDispatchForSale(sale, options = {}) {
  const firestore = options.firestore || db;
  const tenantId = options.tenantId || appId;
  const order = buildDispatchFromSale(sale, options);
  if (order.items.length === 0) {
    throw new Error('Esta venta solo contiene servicios o ítems virtuales y no requiere despacho físico de bodega.');
  }
  const ref = doc(dispatchesCol(firestore, tenantId), order.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return { id: existing.id, ...existing.data(), alreadyExisted: true };
  }

  await setDoc(ref, order);

  if (sale?.id) {
    try {
      await updateDoc(doc(firestore, 'artifacts', tenantId, 'public', 'data', 'finances_transactions', sale.id), {
        dispatchId: order.id,
        dispatchStatus: order.status
      });
    } catch {
      // No fallar si el documento de venta no está disponible
    }
  }

  return order;
}

/**
 * Registra un despacho parcial o total y sincroniza el estado con la transacción de venta.
 */
export async function recordWarehouseDispatch(dispatchOrder, deltaByLine, meta = {}) {
  const firestore = meta.firestore || db;
  const tenantId = meta.tenantId || appId;
  const updated = applyDispatchQuantities(dispatchOrder, deltaByLine, meta);

  await setDoc(doc(dispatchesCol(firestore, tenantId), updated.id), updated, { merge: true });

  if (updated.saleId) {
    try {
      await updateDoc(doc(firestore, 'artifacts', tenantId, 'public', 'data', 'finances_transactions', updated.saleId), {
        dispatchId: updated.id,
        dispatchStatus: updated.status,
        deliveryStatus: updated.status === DISPATCH_STATUS.ENTREGADO || updated.status === DISPATCH_STATUS.DESPACHADO
          ? 'entregado'
          : 'pendiente',
        dispatchedAt: updated.dispatchedAt || null,
        guiaRemisionNumber: updated.guiaRemisionNumber || ''
      });
    } catch {
      // Preservar despacho incluso si la venta fue archivada
    }
  }

  return updated;
}

export async function markDispatchDelivered(dispatchOrder, { by = 'Bodeguero', recipientName = '', recipientId = '', notes = '', firestore = db, tenantId = appId } = {}) {
  const now = new Date().toISOString();
  const updated = {
    ...dispatchOrder,
    status: DISPATCH_STATUS.ENTREGADO,
    recipientName: recipientName || dispatchOrder.recipientName || '',
    recipientId: recipientId || dispatchOrder.recipientId || '',
    notes: notes || dispatchOrder.notes || '',
    deliveredAt: now,
    updatedAt: now,
    history: [
      ...(Array.isArray(dispatchOrder.history) ? dispatchOrder.history : []),
      {
        at: now,
        action: DISPATCH_STATUS.ENTREGADO,
        by,
        detail: `Entrega confirmada${recipientName ? ` a ${recipientName}` : ''}`
      }
    ]
  };
  await setDoc(doc(dispatchesCol(firestore, tenantId), updated.id), updated, { merge: true });
  if (updated.saleId) {
    try {
      await updateDoc(doc(firestore, 'artifacts', tenantId, 'public', 'data', 'finances_transactions', updated.saleId), {
        dispatchStatus: DISPATCH_STATUS.ENTREGADO,
        deliveryStatus: 'entregado',
        deliveredAt: now
      });
    } catch {
      // ignore
    }
  }
  return updated;
}
