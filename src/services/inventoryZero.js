import { branchBalanceFor } from './inventoryBalance.js';
import { productKind, tracksStock } from './productModel.js';

export function collectZeroInventoryItems(products, branchId) {
  return products.flatMap(product => {
    if (!tracksStock(product) || productKind(product) === 'COMBO') return [];
    const quantity = branchBalanceFor(product, branchId).quantity;
    return Number.isFinite(quantity) && quantity > 0
      ? [{ productId: product.id, quantity, operation: 'OUT' }]
      : [];
  });
}
