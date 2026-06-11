import { kardexService, KardexService } from './KardexService';
import { InventoryAdjustment, AdjustmentTypeEnum } from '../domain/schemas/kardex-transfer.schema';
import { z } from 'zod';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db, appId } from '../../../firebase';
import { kardexRepository } from '../repositories/KardexRepository';

export class AdjustmentService {
  constructor(private kardex: KardexService = kardexService) {}

  private getCollectionRef() {
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_adjustments');
  }

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

    for (const item of items) {
      if (item.operation === 'IN') {
        if (item.unitCost === undefined) {
          throw new Error("Para ajustes de entrada (IN) se requiere especificar el costo unitario del producto.");
        }
        await this.kardex.registerTransaction(
          item.productId,
          branchId,
          'POSITIVE_ADJUSTMENT',
          adjustmentId,
          item.quantity,
          item.unitCost
        );
      } else {
        await this.kardex.registerTransaction(
          item.productId,
          branchId,
          'NEGATIVE_ADJUSTMENT',
          adjustmentId,
          item.quantity,
          0 // Costo lo resuelve Kardex usando promedio ponderado
        );
      }
    }

    // Registrar documento del ajuste
    await this.saveAdjustmentDoc(adjustmentId, branchId, type, reason, items, confirmedBy);

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
    const adjustmentId = crypto.randomUUID();
    
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
        // Ejecutar salida masiva para zerar
        await this.kardex.registerTransaction(
          productId,
          branchId,
          'MASSIVE_ZERO',
          adjustmentId,
          lastBalance.balanceQuantity,
          0
        );
        
        itemsToAdjust.push({
          productId,
          quantity: lastBalance.balanceQuantity,
          operation: 'OUT'
        });
      }
    }

    await this.saveAdjustmentDoc(adjustmentId, branchId, 'ZERO_INVENTORY', reason, itemsToAdjust, confirmedBy);
    return adjustmentId;
  }

  private async saveAdjustmentDoc(id: string, branchId: string, type: any, reason: string, items: any[], confirmedBy: string) {
    const docRef = doc(this.getCollectionRef(), id);
    const adjustment: Partial<InventoryAdjustment> = {
      id,
      branchId,
      type,
      reason,
      items,
      confirmedBy,
      status: 'APPLIED',
      createdAt: new Date()
    };
    await setDoc(docRef, adjustment);
  }
}

export const adjustmentService = new AdjustmentService();
