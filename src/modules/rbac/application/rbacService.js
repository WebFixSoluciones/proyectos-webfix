/**
 * Capa de Aplicación — Evaluador de Permisos RBAC y Verificación de Supervisor POS.
 */
import {
  ROLE_PRESETS,
  LEGACY_STAFF_DEFAULT_PERMISSIONS
} from '../domain/permissions.js';

export function normalizeUserRole(userProfile) {
  return String(userProfile?.role || 'staff').toLowerCase().trim();
}

export function isPrivilegedAdmin(userProfile) {
  const role = normalizeUserRole(userProfile);
  return role === 'superadmin' || role === 'admin';
}

export function resolveEffectivePermissions(userProfile) {
  if (isPrivilegedAdmin(userProfile)) {
    return {
      preset: 'admin',
      modules: { ...ROLE_PRESETS.admin.modules },
      actions: { ...ROLE_PRESETS.admin.actions },
      scope: {
        maxDiscountPct: Number.isFinite(Number(userProfile?.permissions?.scope?.maxDiscountPct))
          ? Number(userProfile.permissions.scope.maxDiscountPct)
          : 100,
        assignedWarehouses: Array.isArray(userProfile?.permissions?.scope?.assignedWarehouses)
          ? userProfile.permissions.scope.assignedWarehouses
          : [],
        assignedEmissionPoint: userProfile?.permissions?.scope?.assignedEmissionPoint || null
      }
    };
  }

  const stored = userProfile?.permissions;
  if (!stored || typeof stored !== 'object') {
    return LEGACY_STAFF_DEFAULT_PERMISSIONS;
  }

  const base = stored.preset && ROLE_PRESETS[stored.preset]
    ? ROLE_PRESETS[stored.preset]
    : LEGACY_STAFF_DEFAULT_PERMISSIONS;

  return {
    preset: stored.preset || 'custom',
    modules: { ...base.modules, ...(stored.modules || {}) },
    actions: { ...base.actions, ...(stored.actions || {}) },
    scope: {
      maxDiscountPct: Number.isFinite(Number(stored.scope?.maxDiscountPct))
        ? Number(stored.scope.maxDiscountPct)
        : (base.scope?.maxDiscountPct ?? 10),
      assignedWarehouses: Array.isArray(stored.scope?.assignedWarehouses)
        ? stored.scope.assignedWarehouses
        : [],
      assignedEmissionPoint: stored.scope?.assignedEmissionPoint || null
    }
  };
}

export function canAccessModule(userProfile, moduleId) {
  if (!moduleId) return true;
  if (isPrivilegedAdmin(userProfile)) return true;
  const perms = resolveEffectivePermissions(userProfile);
  // Mapeo de IDs de páginas internas del router ERP a módulos RBAC
  const pageMap = {
    dashboard: 'dashboard',
    ventas: 'ventas',
    pos: 'pos',
    compras: 'compras',
    finances: 'finanzas',
    gastos_creditos: 'finanzas',
    inventario: 'inventario',
    bodegas: 'bodegas',
    despachos: 'despachos',
    personas: 'personas',
    general_settings: 'configuracion',
    usuarios: 'usuarios',
    billing: 'configuracion',
    soporte_tecnico: 'dashboard'
  };
  const key = pageMap[moduleId] || moduleId;
  return perms.modules[key] !== false;
}

export function canPerformAction(userProfile, actionId) {
  if (!actionId) return true;
  if (isPrivilegedAdmin(userProfile)) return true;
  const perms = resolveEffectivePermissions(userProfile);
  return perms.actions[actionId] === true;
}

export function canAccessWarehouse(userProfile, branchId) {
  if (!branchId || isPrivilegedAdmin(userProfile)) return true;
  const perms = resolveEffectivePermissions(userProfile);
  const assigned = perms.scope?.assignedWarehouses || [];
  if (assigned.length === 0) return true;
  return assigned.includes(branchId);
}

export function getUserAssignedEmissionPoint(userProfile) {
  const ep = userProfile?.permissions?.scope?.assignedEmissionPoint;
  if (!ep || !ep.estab || !ep.ptoEmi) return null;
  return {
    estab: String(ep.estab).replace(/\D/g, '').padStart(3, '0').slice(-3),
    ptoEmi: String(ep.ptoEmi).replace(/\D/g, '').padStart(3, '0').slice(-3),
    locked: ep.locked !== false
  };
}

export function getMaxDiscountPct(userProfile) {
  if (isPrivilegedAdmin(userProfile)) return 100;
  const perms = resolveEffectivePermissions(userProfile);
  const val = Number(perms.scope?.maxDiscountPct);
  return Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : 10;
}

/**
 * Hash determinístico liviano para PIN de supervisor POS (evita texto plano en Firestore).
 * No sustituye a Firebase Auth para sesiones, pero impide bypasses triviales de PIN.
 */
export function hashSupervisorPin(pin, salt = 'webfix-pos-pin-v1') {
  const normalized = String(pin || '').trim();
  if (!normalized) return '';
  let h1 = 0xdeadbeef ^ salt.length;
  let h2 = 0x41c6ce57 ^ salt.length;
  const input = `${salt}:${normalized}`;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `pinv1_${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
}

/**
 * Valida un PIN de supervisor contra:
 * 1) Usuarios activos del tenant con rol admin o permiso `autorizar_credito_pos` y `posSupervisorPinHash` configurado.
 * 2) Configuración fiscal/POS del tenant (`config.posSupervisorPinHash` o `config.posSupervisorPin`).
 * Retorna `{ ok: boolean, authorizedBy?: string, error?: string }`.
 */
export function verifySupervisorPin({ pin, tenantUsers = [], fiscalConfig = null, currentUserProfile = null }) {
  const cleanPin = String(pin || '').trim();
  if (cleanPin.length < 4) {
    return { ok: false, error: 'El PIN de supervisor debe tener al menos 4 caracteres.' };
  }

  const candidateHash = hashSupervisorPin(cleanPin);

  // 1. Verificar contra supervisores/admins del tenant con PIN configurado
  const supervisors = (Array.isArray(tenantUsers) ? tenantUsers : []).filter((u) => {
    if (!u || u.status === 'inactive') return false;
    return isPrivilegedAdmin(u) || canPerformAction(u, 'autorizar_credito_pos');
  });

  for (const sup of supervisors) {
    if (sup.posSupervisorPinHash && sup.posSupervisorPinHash === candidateHash) {
      return {
        ok: true,
        authorizedBy: sup.name || sup.email || 'Supervisor Autorizado',
        authorizedUid: sup.uid || sup.id || ''
      };
    }
  }

  // 2. Verificar contra PIN configurado en configuración de empresa/POS
  if (fiscalConfig?.posSupervisorPinHash && fiscalConfig.posSupervisorPinHash === candidateHash) {
    return {
      ok: true,
      authorizedBy: fiscalConfig.posSupervisorName || 'Supervisor de Caja'
    };
  }
  if (fiscalConfig?.posSupervisorPin && String(fiscalConfig.posSupervisorPin).trim() === cleanPin) {
    return {
      ok: true,
      authorizedBy: fiscalConfig.posSupervisorName || 'Supervisor de Caja'
    };
  }

  // 3. Si el propio usuario actual es admin y todavía no se configuró ningún PIN en la empresa,
  // exigir configurar uno en Ajustes -> Usuarios y Permisos en lugar de aceptar cualquier PIN.
  const anyPinConfigured = supervisors.some((s) => Boolean(s.posSupervisorPinHash))
    || Boolean(fiscalConfig?.posSupervisorPinHash || fiscalConfig?.posSupervisorPin);

  if (!anyPinConfigured) {
    if (isPrivilegedAdmin(currentUserProfile) && cleanPin.length >= 4) {
      return {
        ok: false,
        needsSetup: true,
        error: 'No hay un PIN de supervisor configurado. Configúralo en Ajustes > Usuarios y Permisos o en Configuración POS.'
      };
    }
    return {
      ok: false,
      needsSetup: true,
      error: 'Ningún supervisor tiene PIN configurado. Solicita al administrador configurarlo en Ajustes > Usuarios.'
    };
  }

  return { ok: false, error: 'PIN de supervisor incorrecto o usuario sin permisos de autorización.' };
}
