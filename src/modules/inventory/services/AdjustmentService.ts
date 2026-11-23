import { registerInventoryOperations } from '../../../services/inventoryLedger';
import { collectZeroInventoryItems } from '../../../services/inventoryZero';
import { AdjustmentTypeEnum } from '../domain/schemas/kardex-transfer.schema';
import { z } from 'zod';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../../../firebase';

export class AdjustmentService {
  /**
   * Ajuste Manual (Un solo producto) o Masivo (Varios productos de un CSV por ejemplo).
   */
  async executeAdjustment(
    branchId: string,
    type: z.infer<typeof AdjustmentTypeEnum>,
    reason: string,
    items: { productId: string; quantity: number; operation: 'IN' | 'OUT'; unitCost?: number }[],
    confirmedBy: string
  ): Promise<string> {
    
    if (items.length === 0) {
      throw new Error(type === 'ZERO_INVENTORY' ? 'No hay existencias en esta sucursal.' : 'Debe incluir al menos un producto para ajustar.');
    }

    const adjustmentId = crypto.randomUUID();

    if (reason.trim().length < 5) throw new Error('Describe la razón del ajuste.');
    const operations = items.map(item => ({ productId: item.productId, branchId, type: item.operation === 'IN' ? 'POSITIVE_ADJUSTMENT' : 'NEGATIVE_ADJUSTMENT', referenceId: adjustmentId, quantity: item.quantity, unitCost: item.operation === 'IN' ? Number(item.unitCost) : 0 }));
    await registerInventoryOperations(db, appId, operations, { document: { collection: 'inventory_adjustments', id: adjustmentId, data: { id: adjustmentId, branchId, type, reason, items, confirmedBy, status: 'APPLIED', createdAt: new Date() } } });

    return adjustmentId;
  }

  /**
   * CERO INVENTARIO: Zera completamente el inventario de todos los productos en una sucursal.
   * CUIDADO: Operación destructiva. Requiere doble confirmación desde la UI.
   */
  async executeZeroInventory(
    branchId: string,
    reason: string,
    confirmedBy: string
  ): Promise<string> {
    // The product balance is authoritative; older products can have stock without Kardex rows.
    const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'inventory_products'));
    const itemsToAdjust: { productId: string; quantity: number; operation: 'IN' | 'OUT' }[] =
      collectZeroInventoryItems(snap.docs.map(row => ({ id: row.id, ...row.data() })), branchId);
    if (itemsToAdjust.length > 100) throw new Error('Hay más de 100 productos con stock. Ajusta el inventario por grupos.');
    return this.executeAdjustment(branchId, 'ZERO_INVENTORY', reason, itemsToAdjust, confirmedBy);
  }

}

export const adjustmentService = new AdjustmentService();
