import * as firestore from 'firebase/firestore';
import { productKind, tracksStock } from './productModel.js';

const entryTypes = new Set(['PURCHASE_RECEIPT', 'CUSTOMER_RETURN', 'POSITIVE_ADJUSTMENT', 'TRANSFER_IN']);
const exitTypes = new Set(['SALE', 'TRANSFER_OUT', 'NEGATIVE_ADJUSTMENT', 'SHRINKAGE', 'MASSIVE_ZERO']);
export const CENTRAL_BRANCH = 'sucursal-central-uuid';
export const branchForWarehouse = warehouse => /sur/i.test(warehouse || '') ? 'sucursal-sur-uuid' : /norte/i.test(warehouse || '') ? 'sucursal-norte-uuid' : CENTRAL_BRANCH;
const key = (...parts) => parts.map(p => encodeURIComponent(String(p))).join('~');
const stamp = d => d?.toMillis?.() ?? new Date(d || 0).getTime();

/** All stock, mirrored catalog, ledger entries and optional operation log commit together. */
export async function registerInventoryOperations(db, appId, operations, { document = null, api = firestore } = {}) {
  if (!db || !appId) throw new Error('No se pudo identificar la empresa del inventario.');
  if (!operations.length) return [];
  const ref = (collection, id) => api.doc(db, 'artifacts', appId, 'public', 'data', collection, id);
  const catalog = new Map();
  const expanded = [];
  async function expand(op, parents = []) {
    if (!op.productId || !op.referenceId || !op.branchId) throw new Error('Producto, referencia y sucursal son obligatorios.');
    if (!entryTypes.has(op.type) && !exitTypes.has(op.type)) throw new Error('Tipo de movimiento de inventario inválido.');
    if (!Number.isFinite(op.quantity) || op.quantity <= 0 || !Number.isFinite(op.unitCost) || op.unitCost < 0) throw new Error('Cantidad o costo de inventario inválido.');
    if (parents.includes(op.productId)) throw new Error('El combo contiene una referencia circular.');
    if (!catalog.has(op.productId)) {
      const snap = await api.getDoc(ref('inventory_products', op.productId));
      if (!snap.exists()) throw new Error(`El producto ${op.productId} ya no existe.`);
      catalog.set(op.productId, snap.data());
    }
    const product = catalog.get(op.productId);
    if (op.type === 'SALE' && product.status === 'INACTIVE') throw new Error('El producto está desactivado. Actualiza el carrito.');
    if (!tracksStock(product)) return;
    if (productKind(product) === 'COMBO') {
      if (!product.comboItems?.length) throw new Error('El combo no tiene componentes.');
      for (const component of product.comboItems) await expand({ ...op, productId: component.productId, quantity: op.quantity * Number(component.quantity) }, [...parents, op.productId]);
    } else expanded.push(op);
  }
  for (const op of operations) await expand(op);
  // Coalesce repeated components and repeated sale lines before checking availability.
  const grouped = new Map();
  for (const op of expanded) {
    const id = key(op.referenceId, op.productId, op.branchId, op.type);
    const prior = grouped.get(id);
    if (prior) {
      const qty = prior.quantity + op.quantity;
      prior.unitCost = (prior.quantity * prior.unitCost + op.quantity * op.unitCost) / qty;
      prior.quantity = qty;
    } else grouped.set(id, { ...op, id });
  }
  if (grouped.size > 100) throw new Error('La operación supera 100 movimientos. Divídela antes de continuar.');
  // Bootstrap legacy per-branch balances once; subsequent commits use the product document lock.
  const seeds = new Map();
  for (const [id, product] of catalog) {
    if (product.stockByBranch || !tracksStock(product) || productKind(product) === 'COMBO') continue;
    const history = await api.getDocs(api.query(api.collection(db, 'artifacts', appId, 'public', 'data', 'inventory_kardex'), api.where('productId', '==', id)));
    const latest = new Map();
    for (const snap of history.docs) {
      const row = snap.data();
      if (!latest.has(row.branchId) || stamp(row.date) >= stamp(latest.get(row.branchId).date)) latest.set(row.branchId, row);
    }
    seeds.set(id, latest.size ? Object.fromEntries([...latest].map(([branch, row]) => [branch, { quantity: row.balanceQuantity, averageCost: row.balanceAverageCost }])) : { [CENTRAL_BRANCH]: { quantity: Number(product.stock || 0), averageCost: Number(product.baseCost || 0) } });
  }
  return api.runTransaction(db, async tx => {
    const current = new Map();
    for (const [id, original] of catalog) {
      const snap = await tx.get(ref('inventory_products', id));
      if (!snap.exists()) throw new Error('Un producto fue eliminado durante la operación.');
      const value = snap.data();
      if (JSON.stringify(value.comboItems) !== JSON.stringify(original.comboItems) || productKind(value) !== productKind(original) || value.inventoryType !== original.inventoryType) throw new Error('La composición del producto cambió. Actualiza el carrito y vuelve a intentar.');
      if (operations.some(op => op.type === 'SALE') && value.status === 'INACTIVE') throw new Error('Un producto fue desactivado. Actualiza el carrito.');
      current.set(id, { ...value, stockByBranch: structuredClone(value.stockByBranch || seeds.get(id) || {}) });
    }
    const existing = new Map();
    for (const [id] of grouped) existing.set(id, await tx.get(ref('inventory_kardex', id)));
    let storedDocument;
    if (document) storedDocument = await tx.get(ref(document.collection, document.id));
    if (document?.flag && storedDocument?.data()?.[document.flag] === document.value) return [];
    const results = [];
    const writes = [];
    for (const [id, op] of grouped) {
      if (existing.get(id).exists()) {
        const saved = existing.get(id).data();
        if (Math.abs(Math.abs(saved.quantity) - op.quantity) > 0.000001) throw new Error('La referencia ya tiene un movimiento con otra cantidad.');
        results.push(saved);
        continue;
      }
      const product = current.get(op.productId);
      const balance = product.stockByBranch[op.branchId] || { quantity: 0, averageCost: Number(product.baseCost || 0) };
      const isEntry = entryTypes.has(op.type);
      if (!isEntry && op.quantity > balance.quantity + 0.000001) throw new Error(`${product.name || op.productId}: stock insuficiente en la sucursal (disponible: ${balance.quantity}).`);
      let cost = isEntry ? op.unitCost : balance.averageCost;
      // Transfers carry the actual source cost, never a stale value from the form.
      if (op.sourceBranchId) {
        const exit = results.find(r => r.productId === op.productId && r.branchId === op.sourceBranchId && r.type === 'TRANSFER_OUT');
        if (exit) cost = exit.unitCost + (op.logisticsCost || 0);
      }
      const quantity = Math.max(0, balance.quantity + (isEntry ? op.quantity : -op.quantity));
      const averageCost = isEntry && quantity > 0 ? (balance.quantity * balance.averageCost + op.quantity * cost) / quantity : balance.averageCost;
      if (![quantity, averageCost, cost].every(Number.isFinite)) throw new Error('El saldo o costo del inventario no es válido.');
      product.stockByBranch[op.branchId] = { quantity, averageCost };
      const row = { id, productId: op.productId, branchId: op.branchId, type: op.type, referenceId: op.referenceId, date: new Date(), createdAt: new Date(), quantity: isEntry ? op.quantity : -op.quantity, unitCost: cost, totalCost: op.quantity * cost, balanceQuantity: quantity, balanceAverageCost: averageCost };
      writes.push({ ref: ref('inventory_kardex', id), data: row });
      results.push(row);
    }
    const changed = new Set(writes.map(w => w.data.productId));
    for (const id of changed) {
      const product = current.get(id);
      const balances = Object.values(product.stockByBranch);
      const stock = balances.reduce((sum, b) => sum + b.quantity, 0);
      const baseCost = stock > 0 ? balances.reduce((sum, b) => sum + b.quantity * b.averageCost, 0) / stock : Number(product.baseCost || 0);
      tx.update(ref('inventory_products', id), { stock, baseCost, stockByBranch: product.stockByBranch, updatedAt: new Date() });
      tx.set(ref('finances_products', id), { stock, cost: baseCost, updatedAt: new Date().toISOString() }, { merge: true });
    }
    writes.forEach(w => tx.set(w.ref, w.data));
    if (document) tx.set(ref(document.collection, document.id), { ...document.data, ...(document.flag ? { [document.flag]: document.value, inventoryEntries: results } : {}) }, { merge: true });
    return results;
  });
}

export async function registerTransactionInventory(db, appId, transaction, reverse = false) {
  if (!transaction.id) throw new Error('Guarda primero el documento antes de afectar inventario.');
  if (['retencion', 'guia_remision', 'nota_debito'].includes(transaction.documentType) || transaction.purchaseMethod === 'sin_inventario') return [];
  const snapshot = await firestore.getDoc(firestore.doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', transaction.id));
  const saved = snapshot.exists() ? snapshot.data() : transaction;
  if ((!reverse && saved.inventarioRegistrado) || (reverse && !saved.inventarioRegistrado)) return [];
  const sale = transaction.type === 'ingreso';
  const creditNote = transaction.documentType === 'nota_credito';
  const entry = reverse ? sale !== creditNote : sale === creditNote;
  const operations = reverse && saved.inventoryEntries?.length
    ? saved.inventoryEntries.map(row => ({ productId: row.productId, quantity: Math.abs(row.quantity), unitCost: row.unitCost, branchId: row.branchId, type: row.quantity < 0 ? 'CUSTOMER_RETURN' : 'NEGATIVE_ADJUSTMENT', referenceId: `${transaction.id}:reversal` }))
    : (transaction.items || []).filter(item => item.productId).map(item => ({ productId: item.productId, quantity: Number(item.quantity), unitCost: entry ? Number(reverse ? item.kardexCost ?? 0 : item.price ?? 0) : 0, branchId: transaction.branchId || branchForWarehouse(transaction.bodega), type: entry ? (sale ? 'CUSTOMER_RETURN' : 'PURCHASE_RECEIPT') : (sale ? 'SALE' : 'NEGATIVE_ADJUSTMENT'), referenceId: `${transaction.id}${reverse ? ':reversal' : ''}` }));
  if (!operations.length) return [];
  return registerInventoryOperations(db, appId, operations, { document: { collection: 'finances_transactions', id: transaction.id, flag: 'inventarioRegistrado', value: !reverse, data: { inventoryStatus: reverse ? 'reversed' : 'complete' } } });
}
