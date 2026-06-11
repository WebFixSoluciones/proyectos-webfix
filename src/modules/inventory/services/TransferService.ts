import { kardexService, KardexService } from './KardexService';
import { Transfer, TransferTypeEnum } from '../domain/schemas/kardex-transfer.schema';
import { z } from 'zod';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../../firebase';

export class TransferService {
  constructor(private kardex: KardexService = kardexService) {}

  private getCollectionRef() {
    return collection(db, 'artifacts', appId, 'public', 'data', 'inventory_transfers');
  }

  async executeTransfer(
    transferType: z.infer<typeof TransferTypeEnum>,
    sourceBranchId: string,
    targetBranchId: string,
    items: { productId: string; quantity: number; unitCost: number }[],
    createdBy: string,
    transferCost: number = 0 // Costos logísticos adicionales (para EXTERNAL)
  ): Promise<string> {
    
    if (sourceBranchId === targetBranchId) {
      throw new Error("La sucursal de origen y destino no pueden ser la misma.");
    }

    const transferId = crypto.randomUUID();

    // 1. Ejecutar Salidas en el Kardex (Source Branch)
    // El KardexService validará si hay stock suficiente en la sucursal origen.
    for (const item of items) {
      await this.kardex.registerTransaction(
        item.productId,
        sourceBranchId,
        'TRANSFER_OUT',
        transferId,
        item.quantity,
        0 // En salidas, el unitCost que se manda no importa, el servicio usa el Promedio Ponderado actual.
      );
    }

    // 2. Ejecutar Entradas en el Kardex (Target Branch)
    // Para entradas, el costo unitario será el costo original + costo de transferencia proporcional.
    const addedLogisticsCostPerUnit = transferType === 'EXTERNAL' && items.length > 0
      ? transferCost / items.reduce((acc, curr) => acc + curr.quantity, 0)
      : 0;

    for (const item of items) {
      const finalEntryCost = item.unitCost + addedLogisticsCostPerUnit;
      
      await this.kardex.registerTransaction(
        item.productId,
        targetBranchId,
        'PURCHASE_RECEIPT', // Lo tratamos como un ingreso. Si se quiere trazar como traslado, se usa POSITIVE_ADJUSTMENT o un enum específico de ingreso por traslado si existiese.
        transferId,
        item.quantity,
        finalEntryCost
      );
    }

    // 3. Guardar el registro de la transferencia en su propia colección
    const transferDoc: Partial<Transfer> = {
      id: transferId,
      type: transferType,
      sourceBranchId,
      targetBranchId,
      status: 'COMPLETED',
      items,
      transferCost,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = doc(this.getCollectionRef(), transferId);
    await setDoc(docRef, transferDoc);

    return transferId;
  }
}

export const transferService = new TransferService();
