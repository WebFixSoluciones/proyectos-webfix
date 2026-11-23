import { doc, runTransaction } from './financeStore.js';
import { registerTransactionInventory } from './inventoryLedger.js';

// Fiscal documents require the existing SRI process; this command handles internal receipts.
export async function cancelInternalSale(db, appId, sale) {
  if (sale.documentType !== 'nota_venta') throw new Error('La anulación de este documento debe gestionarse mediante el proceso correspondiente del SRI.');
  if (!sale.id) throw new Error('El documento todavía no está guardado.');
  if (sale.sriStatus === 'anulado' || sale.status === 'anulado') return;
  await registerTransactionInventory(db, appId, sale, true);
  await runTransaction(db, async tx => {
    const saleRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', sale.id);
    const saleSnap = await tx.get(saleRef);
    if (saleSnap.exists() && saleSnap.data()?.sriStatus === 'anulado') return;
    const accountRef = doc(db, 'fin_cxc', sale.id);
    const account = await tx.get(accountRef);
    const movementRef = account.data()?.movimientoId ? doc(db, 'fin_movimientos', account.data().movimientoId) : null;
    const movement = movementRef ? await tx.get(movementRef) : null;
    const bankMovIds = [`mov_doc_${sale.id}`, `mov_doc_${sale.id}_efectivo`, `mov_doc_${sale.id}_tarjeta`];
    const bankMovRefs = bankMovIds.map(id => doc(db, 'fin_movimientos_bancarios', id));
    const bankMovSnaps = await Promise.all(bankMovRefs.map(r => tx.get(r)));
    const cancelled = { estado: 'anulado', saldoPendiente: 0, actualizadoEn: new Date() };
    tx.update(saleRef, { sriStatus: 'anulado', status: 'anulado', inventarioRegistrado: false, updatedAt: new Date().toISOString() });
    if (account.exists()) tx.update(accountRef, cancelled);
    if (movement?.exists()) tx.update(movementRef, cancelled);
    bankMovSnaps.forEach((snap, idx) => {
      if (snap.exists()) {
        tx.update(bankMovRefs[idx], { estado: 'anulado', monto: 0, updatedAt: new Date() });
      }
    });
  });
}
