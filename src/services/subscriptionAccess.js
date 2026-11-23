export function getSubscriptionExpiry(tenantInfo) {
  if (!tenantInfo) return null;
  const value = tenantInfo.planStatus === 'trial'
    ? tenantInfo.trialExpiresAt || tenantInfo.expiresAt
    : tenantInfo.subscriptionExpiresAt || tenantInfo.expiresAt;
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSubscriptionBlocked(tenantInfo, now = new Date()) {
  if (!tenantInfo) return false;
  if (['pending_approval', 'suspended', 'expired'].includes(tenantInfo.planStatus)) return true;
  const expiry = getSubscriptionExpiry(tenantInfo);
  return expiry ? expiry.getTime() <= now.getTime() : false;
}
