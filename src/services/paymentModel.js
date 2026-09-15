export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Cash received is distinct from cash applied: change never enters the cash balance.
export function settlePayments(total, payments, active = null) {
  total = roundMoney(total);
  if (!Number.isFinite(total) || total <= 0) throw new Error('El total debe ser mayor a cero.');
  const breakdown = {};
  for (const key of ['efectivo', 'transferencia', 'tarjeta', 'cruce_cuentas']) {
    const value = active && !active[key] ? 0 : Number(payments[key] ?? 0);
    if (!Number.isFinite(value) || value < 0) throw new Error('Los pagos deben ser importes válidos y no negativos.');
    breakdown[key] = roundMoney(value);
  }
  const nonCash = roundMoney(breakdown.transferencia + breakdown.tarjeta + breakdown.cruce_cuentas);
  if (nonCash > total) throw new Error('Los pagos sin efectivo no pueden superar el total.');
  const received = breakdown.efectivo;
  const appliedCash = roundMoney(Math.min(received, total - nonCash));
  breakdown.efectivo = appliedCash;
  const covered = roundMoney(appliedCash + nonCash);
  if (covered < total) throw new Error(`Falta cubrir $${roundMoney(total - covered).toFixed(2)}.`);
  const paidAmount = roundMoney(appliedCash + breakdown.transferencia + breakdown.tarjeta);
  const methods = Object.keys(breakdown).filter(key => breakdown[key] > 0);
  return { paymentsBreakdown: { ...breakdown, credito: breakdown.cruce_cuentas }, paidAmount, paymentStatus: paidAmount >= total ? 'pagado' : 'pendiente', paymentMethod: methods.length > 1 ? 'combinado' : methods[0] === 'cruce_cuentas' ? 'credito' : methods[0], cashReceived: received, changeDue: roundMoney(received - appliedCash) };
}

export function cashSessionTotals(transactions) {
  const totals = { efectivo: 0, tarjeta: 0, transferencia: 0, cruce_cuentas: 0 };
  for (const tx of transactions) {
    if (tx.sriStatus !== 'autorizado' || tx.type === 'egreso') continue;
    for (const method of Object.keys(totals)) {
      const value = tx.paymentsBreakdown ? Number(tx.paymentsBreakdown[method] || 0) : tx.paymentMethod === method ? Number(tx.paidAmount ?? tx.total ?? 0) : 0;
      totals[method] = roundMoney(totals[method] + value);
    }
  }
  return totals;
}
