import { db, getAppId } from '../../../firebase';
import { registerInventoryOperations } from '../../../services/inventoryLedger';
import type { KardexTransaction } from '../domain/schemas/kardex-transfer.schema';
export class KardexService {
  async registerTransaction(productId: string, branchId: string, type: string, referenceId: string, quantity: number, unitCost: number): Promise<KardexTransaction> {
    const result = await registerInventoryOperations(db, getAppId(), [{ productId, branchId, type, referenceId, quantity, unitCost }]);
    return result[0] as KardexTransaction;
  }
}
export const kardexService = new KardexService();
