import { getSubscriptionExpiry, isSubscriptionBlocked } from './subscriptionAccess.js';

export function registrationOptions(plan, period) {
  return {
    planId: ['starter', 'professional', 'enterprise'].includes(plan) ? plan : 'starter',
    billingPeriod: ['monthly', 'yearly'].includes(period) ? period : 'monthly'
  };
}

export function tenantDateInput(tenant) {
  return getSubscriptionExpiry(tenant)?.toISOString().slice(0, 10) || '';
}

export function subscriptionUpdate(tenant) {
  const companyName = String(tenant.companyName || '').trim();
  if (!companyName) throw new Error('Ingresa el nombre de la empresa.');
  if (!['trial', 'active', 'suspended', 'expired', 'pending_approval'].includes(tenant.planStatus)) throw new Error('Selecciona un estado válido.');
  if (!['monthly', 'yearly'].includes(tenant.billingPeriod)) throw new Error('Selecciona el ciclo de facturación.');
  const date = new Date(tenant.expiresAt);
  if (tenant.planStatus !== 'pending_approval' && Number.isNaN(date.getTime())) throw new Error('Selecciona una fecha de expiración válida.');
  return { companyName, planId: tenant.planId, planStatus: tenant.planStatus,
    billingPeriod: tenant.billingPeriod, ...(tenant.planStatus === 'pending_approval' ? {} : { expiresAt: date.toISOString() }) };
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
