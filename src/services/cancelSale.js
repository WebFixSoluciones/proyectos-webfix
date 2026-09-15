import { doc, runTransaction } from './financeStore.js';
import { registerTransactionInventory } from './inventoryLedger.js';

// Fiscal documents require the existing SRI process; this command handles internal receipts.
export async function cancelInternalSale(db, appId, sale) {
  if (sale.documentType !== 'nota_venta') throw new Error('La anulación de este documento debe gestionarse mediante el proceso correspondiente del SRI.');
  if (!sale.id) throw new Error('El documento todavía no está guardado.');
  await registerTransactionInventory(db, appId, sale, true);
  await runTransaction(db, async tx => {
    const saleRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', sale.id);
    const accountRef = doc(db, 'fin_cxc', sale.id);
    const account = await tx.get(accountRef);
    const movementRef = account.data()?.movimientoId ? doc(db, 'fin_movimientos', account.data().movimientoId) : null;
    const movement = movementRef ? await tx.get(movementRef) : null;
    const cancelled = { estado: 'anulado', saldoPendiente: 0, actualizadoEn: new Date() };
    tx.update(saleRef, { sriStatus: 'anulado', inventarioRegistrado: false, updatedAt: new Date().toISOString() });
    if (account.exists()) tx.update(accountRef, cancelled);
    if (movement?.exists()) tx.update(movementRef, cancelled);
  });
}
