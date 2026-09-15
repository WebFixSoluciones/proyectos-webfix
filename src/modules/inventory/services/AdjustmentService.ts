import { registerInventoryOperations } from '../../../services/inventoryLedger';
import { AdjustmentTypeEnum } from '../domain/schemas/kardex-transfer.schema';
import { z } from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, appId } from '../../../firebase';
import { kardexRepository } from '../repositories/KardexRepository';

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
    
    if (items.length === 0 && type !== 'ZERO_INVENTORY') {
      throw new Error("Debe incluir al menos un producto para ajustar.");
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
    // Obtener todo el inventario actual de la sucursal
    // Necesitamos todos los productos que tienen stock > 0
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'inventory_kardex'),
      where('branchId', '==', branchId)
    );
    
    const snap = await getDocs(q);
    
    // Filtramos para quedarnos con los balances finales por producto
    const productBalances = new Map<string, number>();
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      const existing = productBalances.get(data.productId);
      
      // Como Firestore no agrupa fácilmente por el último, lo hacemos en memoria.
      // Sería más eficiente usar una tabla de "Stock_Actual" separada, 
      // pero usaremos KardexRepository.getLastBalance para cada producto único detectado.
      if (!existing && data.productId) {
         productBalances.set(data.productId, 1); // solo para tener la lista de IDs
      }
    });

    const itemsToAdjust: { productId: string; quantity: number; operation: 'IN' | 'OUT' }[] = [];

    for (const productId of productBalances.keys()) {
      const lastBalance = await kardexRepository.getLastBalance(productId, branchId);
      
      if (lastBalance && lastBalance.balanceQuantity > 0) {
        itemsToAdjust.push({
          productId,
          quantity: lastBalance.balanceQuantity,
          operation: 'OUT'
        });
      }
    }

    return this.executeAdjustment(branchId, 'ZERO_INVENTORY', reason, itemsToAdjust, confirmedBy);
  }

}

export const adjustmentService = new AdjustmentService();
