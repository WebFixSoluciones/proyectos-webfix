import { getSubscriptionExpiry, isSubscriptionBlocked } from './subscriptionAccess.js';

const VALID_PLAN_STATUSES = ['trial', 'active', 'suspended', 'expired', 'pending_approval'];
const VALID_BILLING_PERIODS = ['monthly', 'yearly'];

export function registrationOptions(plan, period) {
  return {
    planId: ['starter', 'professional', 'enterprise'].includes(plan) ? plan : 'starter',
    billingPeriod: VALID_BILLING_PERIODS.includes(period) ? period : 'monthly'
  };
}

export function tenantDateInput(tenant) {
  return getSubscriptionExpiry(tenant)?.toISOString().slice(0, 10) || '';
}

export function computeDefaultExpiryDate(planStatus = 'active', billingPeriod = 'monthly', now = new Date()) {
  const base = new Date(now.getTime());
  if (planStatus === 'trial') {
    base.setUTCDate(base.getUTCDate() + 14);
  } else {
    const months = billingPeriod === 'yearly' ? 12 : 1;
    const day = base.getUTCDate();
    base.setUTCDate(1);
    base.setUTCMonth(base.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
    base.setUTCDate(Math.min(day, lastDay));
  }
  return base.toISOString().slice(0, 10);
}

export function parseExpiryDate(value, { endOfDay = false } = {}) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const iso = endOfDay ? `${value.trim()}T23:59:59.000Z` : `${value.trim()}T00:00:00.000Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function subscriptionUpdate(tenant) {
  const companyName = String(tenant.companyName || '').trim();
  if (!companyName) throw new Error('Ingresa el nombre de la empresa.');
  const planId = String(tenant.planId || '').trim();
  if (!planId) throw new Error('Selecciona un plan válido.');
  if (!VALID_PLAN_STATUSES.includes(tenant.planStatus)) throw new Error('Selecciona un estado válido.');
  if (!VALID_BILLING_PERIODS.includes(tenant.billingPeriod)) throw new Error('Selecciona el ciclo de facturación.');
  const date = parseExpiryDate(tenant.expiresAt);
  if (tenant.planStatus !== 'pending_approval' && !date) {
    throw new Error('Selecciona una fecha de expiración válida.');
  }
  return {
    companyName,
    planId,
    planStatus: tenant.planStatus,
    billingPeriod: tenant.billingPeriod,
    ...(tenant.planStatus === 'pending_approval' ? {} : { expiresAt: date.toISOString() })
  };
}

export function buildTenantFirestorePatch(tenantDraft, { previousStatus, actorUid, timestampFactory, serverTimestampValue } = {}) {
  const changes = subscriptionUpdate(tenantDraft);
  const expiryDate = changes.expiresAt
    ? parseExpiryDate(tenantDraft.expiresAt, { endOfDay: true })
    : null;
  const expiryIso = expiryDate ? expiryDate.toISOString() : null;
  const expiryTimestamp = expiryDate && typeof timestampFactory === 'function'
    ? timestampFactory(expiryDate)
    : expiryDate;

  const patch = {
    ...changes,
    ...(expiryIso ? { expiresAt: expiryIso } : {}),
    updatedBy: actorUid || '',
    ...(serverTimestampValue !== undefined ? { updatedAt: serverTimestampValue } : {})
  };

  if (changes.planStatus === 'trial' && expiryTimestamp) {
    patch.trialExpiresAt = expiryTimestamp;
  }
  if (changes.planStatus === 'active' && expiryTimestamp) {
    patch.subscriptionExpiresAt = expiryTimestamp;
  }
  if (previousStatus === 'pending_approval' && ['trial', 'active'].includes(changes.planStatus)) {
    patch.approvedAt = new Date().toISOString();
    if (actorUid) patch.approvedBy = actorUid;
  }

  return { changes: { ...changes, ...(expiryIso ? { expiresAt: expiryIso } : {}) }, patch };
}

export function sanitizePlanForSave(planDraft) {
  if (!planDraft || !String(planDraft.id || '').trim()) {
    throw new Error('El identificador del plan es obligatorio.');
  }
  const id = String(planDraft.id).trim();
  const name = String(planDraft.name || '').trim();
  if (!name) throw new Error('Ingresa el nombre del plan.');

  const priceMonthly = Number(planDraft.priceMonthly);
  const priceYearly = Number(planDraft.priceYearly);
  if (!Number.isFinite(priceMonthly) || priceMonthly <= 0 || !Number.isFinite(priceYearly) || priceYearly <= 0) {
    throw new Error('Ingresa precios mensuales y anuales mayores a 0.');
  }

  const rawMaxUsers = planDraft.maxUsers === '' || planDraft.maxUsers === undefined || planDraft.maxUsers === null
    ? 0
    : Number(planDraft.maxUsers);
  const rawMaxProducts = planDraft.maxProducts === '' || planDraft.maxProducts === undefined || planDraft.maxProducts === null
    ? 0
    : Number(planDraft.maxProducts);
  if (!Number.isInteger(rawMaxUsers) || rawMaxUsers < 0 || !Number.isInteger(rawMaxProducts) || rawMaxProducts < 0) {
    throw new Error('Los límites de usuarios y productos deben ser enteros mayores o iguales a 0.');
  }

  const features = typeof planDraft.featuresText === 'string'
    ? planDraft.featuresText.split('\n').map(item => item.trim()).filter(Boolean)
    : Array.isArray(planDraft.features)
      ? planDraft.features.map(item => String(item).trim()).filter(Boolean)
      : [];

  const modules = Array.isArray(planDraft.modules)
    ? [...new Set(planDraft.modules.map(m => String(m).trim()).filter(Boolean))]
    : [];

  const clean = {
    id,
    name,
    category: String(planDraft.category || 'erp').trim() || 'erp',
    priceMonthly: Number(priceMonthly.toFixed(2)),
    priceYearly: Number(priceYearly.toFixed(2)),
    maxUsers: rawMaxUsers,
    maxProducts: rawMaxProducts,
    modules,
    features,
    active: planDraft.active !== false,
    isPopular: Boolean(planDraft.isPopular)
  };

  if (typeof planDraft.description === 'string' && planDraft.description.trim()) {
    clean.description = planDraft.description.trim();
  }

  return clean;
}

export function tenantStatus(tenant, now = new Date()) {
  if (tenant.planStatus === 'pending_approval') return 'Por aprobar';
  if (tenant.planStatus === 'suspended') return 'Suspendido';
  if (isSubscriptionBlocked(tenant, now)) return 'Vencido';
  return { trial: 'Prueba', active: 'Activo', pending_approval: 'Por aprobar' }[tenant.planStatus] || 'Sin configurar';
}

export function tenantSetupChecks(tenant, users, config = {}) {
  const owner = users.find(user => user.id === tenant.ownerUid);
  return [
    { label: 'Propietario vinculado y activo', ready: Boolean(owner?.status === 'active' && owner.role === 'admin') },
    { label: 'Fecha de acceso configurada', ready: Boolean(getSubscriptionExpiry(tenant)) },
    { label: 'Datos del emisor completos', ready: Boolean(config.ruc && config.razonSocial && (config.direccionMatriz || config.dirMatriz)) },
    { label: 'Firma electrónica configurada', ready: Boolean((config.firmaUrl && config.firmaPass) || (config.certificadoBase64 && config.certificadoClave) || config.certificadoCargado) },
    { label: 'Correo de comprobantes configurado', ready: Boolean(config.smtpHost && config.smtpUser && config.smtpPass) }
  ];
}
