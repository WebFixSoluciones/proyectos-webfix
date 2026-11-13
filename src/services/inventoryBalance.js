import { CENTRAL_BRANCH } from './inventoryLedger.js';
import { productKind, tracksStock } from './productModel.js';

export function branchBalanceFor(product, branchId) {
  const fallback = { quantity: 0, averageCost: Number(product?.baseCost || 0) };
  if (!product || !tracksStock(product) || productKind(product) === 'COMBO') return fallback;
  if (product.stockByBranch) {
    const balance = product.stockByBranch[branchId];
    return balance ? {
      quantity: Number(balance.quantity || 0),
      averageCost: Number(balance.averageCost ?? product.baseCost ?? 0)
    } : fallback;
  }
  return branchId === CENTRAL_BRANCH
    ? { quantity: Number(product.stock || 0), averageCost: Number(product.baseCost || 0) }
    : fallback;
}
