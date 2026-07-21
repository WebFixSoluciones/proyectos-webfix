import { kardexRepository, KardexRepository } from '../repositories/KardexRepository';
import { KardexTransaction, TransactionTypeEnum } from '../domain/schemas/kardex-transfer.schema';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getAppId } from '../../../firebase';

export class KardexService {
  constructor(private repo: KardexRepository = kardexRepository) {}

  /**
   * Registra una transacción en el Kardex y recalcula el costo promedio ponderado y el saldo.
   */
  async registerTransaction(
    productId: string, 
    branchId: string, 
    type: z.infer<typeof TransactionTypeEnum>, 
    referenceId: string, 
    quantity: number, // Positivo siempre, el tipo define si suma o resta
    unitCost: number // Costo de la operación actual
  ): Promise<KardexTransaction> {
    
    if (quantity <= 0) {
      throw new Error("La cantidad de la transacción debe ser mayor a cero.");
    }

    const lastBalance = await this.repo.getLastBalance(productId, branchId);
    
    const isEntry = ['PURCHASE_RECEIPT', 'CUSTOMER_RETURN', 'POSITIVE_ADJUSTMENT'].includes(type);
    
    let currentBalanceQty = lastBalance ? lastBalance.balanceQuantity : 0;
    let currentAverageCost = lastBalance ? lastBalance.balanceAverageCost : 0;
    
    let newBalanceQty = 0;
    let newAverageCost = currentAverageCost;
    let finalUnitCost = unitCost;

    if (isEntry) {
      // Es una ENTRADA: Recalculamos el Promedio Ponderado
      newBalanceQty = currentBalanceQty + quantity;
      
      const totalCurrentValue = currentBalanceQty * currentAverageCost;
      const totalIncomingValue = quantity * unitCost;
      
      // Fórmula: Promedio Ponderado = (Valor Actual + Valor Entrante) / Cantidad Total
      newAverageCost = (totalCurrentValue + totalIncomingValue) / newBalanceQty;
      finalUnitCost = unitCost; // Registramos el costo de compra/entrada

    } else {
      // Es una SALIDA
      if (currentBalanceQty < quantity) {
        throw new Error(`Stock insuficiente para el producto ${productId}. Saldo actual: ${currentBalanceQty}`);
      }
      
      newBalanceQty = currentBalanceQty - quantity;
      
      // En las salidas, el costo unitario SIEMPRE es el promedio ponderado actual.
      finalUnitCost = currentAverageCost;
      // newAverageCost no cambia, se mantiene el mismo.
    }

    const totalCost = quantity * finalUnitCost;

    const newTx: Partial<KardexTransaction> = {
      productId,
      branchId,
      date: new Date(),
      type,
      referenceId,
      quantity: isEntry ? quantity : -quantity, // Positivo para entrada, negativo para salida
      unitCost: finalUnitCost,
      totalCost,
      balanceQuantity: newBalanceQty,
      balanceAverageCost: newAverageCost
    };

    const savedTx = await this.repo.save(newTx);

    // INTEGRACIÓN Y CENTRALIZACIÓN: Actualizar stock y costo en el documento del producto
    try {
      const productRef = doc(db, 'artifacts', getAppId(), 'public', 'data', 'inventory_products', productId);
      await updateDoc(productRef, {
        stock: newBalanceQty,
        baseCost: newAverageCost,
        updatedAt: new Date()
      });

      // También mantener finances_products sincronizado como respaldo
      const financesProductRef = doc(db, 'artifacts', getAppId(), 'public', 'data', 'finances_products', productId);
      await updateDoc(financesProductRef, {
        stock: newBalanceQty,
        cost: newAverageCost,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al actualizar stock/costo del producto tras transaccion de Kardex:", err);
    }

    return savedTx;
  }
}

export const kardexService = new KardexService();
