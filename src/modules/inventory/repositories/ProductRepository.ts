import { collection, doc, getDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { db, getAppId } from '../../../firebase';
import { ProductSchema } from '../domain/schemas/product.schema';
import type { Product } from '../domain/schemas/product.schema';
import { normalizeProduct } from '../../../services/productModel';

export class ProductRepository {
  private getCollectionRef() { return collection(db, 'artifacts', getAppId(), 'public', 'data', 'inventory_products'); }
  private ref(collectionName: string, id: string) { return doc(db, 'artifacts', getAppId(), 'public', 'data', collectionName, id); }
  async create(data: Partial<Product>): Promise<Product> { return this.save(data.id || crypto.randomUUID(), data, true); }
  async update(id: string, data: Partial<Product>): Promise<void> { await this.save(id, data, false); }
  private async save(id: string, updates: Partial<Product>, creating: boolean): Promise<Product> {
    const existing = creating ? null : await this.findById(id);
    if (!creating && !existing) throw new Error('El producto ya no existe.');
    const merged = { ...existing, ...updates, id };
    const duplicate = await this.findBySku(merged.sku || '');
    if (duplicate && duplicate.id !== id) throw new Error('El SKU ya pertenece a otro producto.');
    if (merged.type === 'SUBPRODUCT' && (!merged.parentId || merged.parentId === id)) throw new Error('Selecciona un producto padre válido.');
    if (merged.type === 'COMBO' && !merged.comboItems?.length) throw new Error('Agrega al menos un componente al combo.');
    const relatedIds = merged.type === 'COMBO' ? (merged.comboItems || []).map(item => item.productId) : merged.type === 'SUBPRODUCT' ? [merged.parentId!] : [];
    if (relatedIds.includes(id)) throw new Error('Un producto no puede contenerse a sí mismo.');
    for (const related of relatedIds) { if (!await this.findById(related)) throw new Error('Uno de los productos relacionados ya no existe.'); }
    const data = ProductSchema.parse({ ...merged, sku: (merged.sku || '').trim().toUpperCase(), name: (merged.name || '').trim(), imageUrl: merged.imageUrl?.trim() || '/product.svg', tarifa_iva: Number(merged.taxRate ?? 15) / 100, createdAt: new Date(), updatedAt: new Date() });
    const mirror = normalizeProduct(data);
    const skuRef = this.ref('inventory_skus', encodeURIComponent(data.sku));
    await runTransaction(db, async tx => {
      const productRef = this.ref('inventory_products', id);
      const current = await tx.get(productRef);
      const sku = await tx.get(skuRef);
      if (!creating && !current.exists()) throw new Error('El producto ya no existe.');
      if (sku.exists() && sku.data().productId !== id) throw new Error('El SKU ya está registrado.');
      const live = current.data();
      const oldSkuRef = live?.sku && live.sku !== data.sku ? this.ref('inventory_skus', encodeURIComponent(live.sku)) : null;
      const oldSku = oldSkuRef ? await tx.get(oldSkuRef) : null;
      if (live && Number(live.stock) > 0 && (live.type !== data.type || live.inventoryType !== data.inventoryType)) throw new Error('Ajusta primero las existencias antes de cambiar el tipo de inventario.');
      const stock = live?.stock ?? 0;
      const baseCost = live?.stockByBranch ? live.baseCost : data.baseCost;
      tx.set(productRef, { ...data, stock, baseCost, createdAt: live?.createdAt || new Date() }, { merge: true });
      tx.set(this.ref('finances_products', id), { ...mirror, stock, cost: baseCost, updatedAt: new Date().toISOString() }, { merge: true });
      tx.set(skuRef, { productId: id });
      if (oldSkuRef && oldSku?.data()?.productId === id) tx.delete(oldSkuRef);
    });
    return { ...data, stock: existing?.stock ?? 0 };
  }
  async findById(id: string): Promise<Product | null> { const snap = await getDoc(this.ref('inventory_products', id)); return snap.exists() ? { ...snap.data(), id: snap.id } as Product : null; }
  async findBySku(sku: string): Promise<Product | null> { if (!sku.trim()) return null; const snap = await getDocs(query(this.getCollectionRef(), where('sku', '==', sku.trim().toUpperCase()))); return snap.empty ? null : { ...snap.docs[0].data(), id: snap.docs[0].id } as Product; }
  async findAll(): Promise<Product[]> { const snap = await getDocs(this.getCollectionRef()); return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Product); }
  async delete(id: string): Promise<void> {
    // Preserve references from invoices, combos and ledger history.
    await this.update(id, { status: 'INACTIVE', showInSales: false });
  }
}
export const productRepository = new ProductRepository();
