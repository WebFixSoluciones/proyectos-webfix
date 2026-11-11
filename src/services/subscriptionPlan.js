export const BILLING_CATEGORIES = ['erp', 'facturacion', 'paginas', 'correos', 'whatsapp'];

export const isBasePlanCategory = category => category === 'erp' || category === 'facturacion';

export const getPlanTotal = (plan, period) => {
  if (!plan || !['monthly', 'yearly'].includes(period)) return 0;
  const monthlyRate = Number(plan[period === 'yearly' ? 'priceYearly' : 'priceMonthly']);
  if (!Number.isFinite(monthlyRate)) return 0;
  return Number((monthlyRate * (period === 'yearly' ? 12 : 1)).toFixed(2));
};

export const validatePlanPayment = (plan, payment) => {
  if (!plan || plan.active === false) throw new Error('El plan no está disponible.');
  const category = plan.category || 'erp';
  if (!BILLING_CATEGORIES.includes(category)) throw new Error('La categoría del plan no es válida.');
  if (payment.category && payment.category !== category) {
    throw new Error('La categoría del pago no coincide con el plan configurado.');
  }
  const expectedTotal = getPlanTotal(plan, payment.billingPeriod);
  if (expectedTotal <= 0 || !Number.isFinite(Number(payment.amount)) ||
      Math.round(Number(payment.amount) * 100) !== Math.round(expectedTotal * 100)) {
    throw new Error(`El monto reportado no coincide con el precio configurado ($${expectedTotal.toFixed(2)}).`);
  }
  return category;
};

export const getSubscriptionExpiry = (currentValue, period, now = new Date()) => {
  if (!['monthly', 'yearly'].includes(period)) throw new Error('La frecuencia de pago no es válida.');
  const currentExpiry = currentValue?.toDate?.() || new Date(currentValue || 0);
  const expiresAt = currentExpiry > now ? new Date(currentExpiry) : new Date(now);
  const day = expiresAt.getUTCDate();
  expiresAt.setUTCDate(1);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + (period === 'yearly' ? 12 : 1));
  const lastDay = new Date(Date.UTC(expiresAt.getUTCFullYear(), expiresAt.getUTCMonth() + 1, 0)).getUTCDate();
  expiresAt.setUTCDate(Math.min(day, lastDay));
  return expiresAt;
};
