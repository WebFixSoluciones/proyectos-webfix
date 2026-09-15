import { calculateTransactionTotals } from './discountCalcService.js';
export function invoiceDescription(item) {
  return String(item.invoiceDescription || '').trim() || String(item.name || 'Detalle').trim();
}

// Stored line values keep issued documents stable after a promotion expires.
export function invoiceLineAmounts(item) {
  const line = item.subtotal_neto_linea_final !== undefined ? item : calculateTransactionTotals([item]).items[0];
  return { unitPrice: Number(line.precio_base_unitario), discount: Number(line.monto_descuento_linea || 0) + Number(line.descuento_prorrateado || 0), base: Number(line.subtotal_neto_linea_final), total: Number(line.total_linea), rate: Number(line.tarifa_iva) * 100 };
}
