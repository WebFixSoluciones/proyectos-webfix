import { db, getAppId } from '../../../firebase';
import { registerInventoryOperations } from '../../../services/inventoryLedger';
export class TransferService {
  async executeTransfer(type: string, sourceBranchId: string, targetBranchId: string, items: { productId: string; quantity: number; unitCost: number }[], createdBy: string, transferCost = 0): Promise<string> {
    if (!items.length) throw new Error('Agrega productos a la transferencia.');
    if (sourceBranchId === targetBranchId) throw new Error('Origen y destino deben ser distintos.');
    if (!Number.isFinite(transferCost) || transferCost < 0) throw new Error('El costo de traslado no es válido.');
    const id = crypto.randomUUID();
    const logisticsCost = type === 'EXTERNAL' ? transferCost / items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const operations = [
      ...items.map(item => ({ ...item, branchId: sourceBranchId, type: 'TRANSFER_OUT', referenceId: id, unitCost: 0 })),
      ...items.map(item => ({ ...item, branchId: targetBranchId, type: 'TRANSFER_IN', referenceId: id, sourceBranchId, logisticsCost }))
    ];
    await registerInventoryOperations(db, getAppId(), operations, { document: { collection: 'inventory_transfers', id, data: { id, type, sourceBranchId, targetBranchId, items, createdBy, transferCost, status: 'COMPLETED', createdAt: new Date(), updatedAt: new Date() } } });
    return id;
  }
}
export const transferService = new TransferService();
