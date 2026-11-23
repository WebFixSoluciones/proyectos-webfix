/**
 * Capa de Dominio — Modelo Unificado de Bodegas y Sucursales (Zero Data Loss).
 * Concilia sin destruir datos existentes:
 * 1) `inventory_branches` (colección canónica)
 * 2) `finances_settings/config.bodegas` y `sucursales[].bodegas` (configuración existente del cliente)
 * 3) Claves históricas de `stockByBranch` (`sucursal-central-uuid`, `sucursal-sur-uuid`, `sucursal-norte-uuid`)
 */

export const DEFAULT_CENTRAL_BRANCH_ID = 'sucursal-central-uuid';
export const LEGACY_BRANCH_MAP = {
  'sucursal-central-uuid': { id: 'sucursal-central-uuid', name: 'Bodega Central', code: 'BOD-01', establishmentCode: '001', isDefault: true },
  'sucursal-sur-uuid': { id: 'sucursal-sur-uuid', name: 'Sucursal Sur', code: 'BOD-02', establishmentCode: '002', isDefault: false },
  'sucursal-norte-uuid': { id: 'sucursal-norte-uuid', name: 'Sucursal Norte', code: 'BOD-03', establishmentCode: '003', isDefault: false }
};

export function slugifyWarehouseId(name) {
  const clean = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!clean || clean === 'bodega central' || clean === 'matriz' || clean === 'central' || clean === 'bodega principal') {
    return DEFAULT_CENTRAL_BRANCH_ID;
  }
  if (clean === 'sucursal sur' || clean === 'bodega sur') return 'sucursal-sur-uuid';
  if (clean === 'sucursal norte' || clean === 'bodega norte') return 'sucursal-norte-uuid';

  const slug = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug ? `bodega-${slug}` : DEFAULT_CENTRAL_BRANCH_ID;
}

/**
 * Reconcilia las bodegas existentes del tenant desde todas las fuentes sin perder stock histórico.
 */
export function reconcileWarehouses({
  branchDocs = [],
  settingsBodegas = [],
  settingsSucursales = [],
  products = []
} = {}) {
  const byId = new Map();

  // 1. Documentos canónicos en `inventory_branches`
  for (const docItem of Array.isArray(branchDocs) ? branchDocs : []) {
    if (!docItem?.id) continue;
    byId.set(docItem.id, {
      id: docItem.id,
      name: String(docItem.name || docItem.nombre || docItem.id).trim(),
      code: String(docItem.code || docItem.codigo || '').trim(),
      address: String(docItem.address || docItem.direccion || '').trim(),
      establishmentCode: String(docItem.establishmentCode || docItem.establecimiento || '001').padStart(3, '0').slice(-3),
      manager: String(docItem.manager || docItem.responsable || '').trim(),
      active: docItem.active !== false,
      isDefault: Boolean(docItem.isDefault || docItem.id === DEFAULT_CENTRAL_BRANCH_ID)
    });
  }

  // 2. Bodegas configuradas por el cliente en `finances_settings/config`
  const configNames = new Set();
  for (const name of Array.isArray(settingsBodegas) ? settingsBodegas : []) {
    if (String(name || '').trim()) configNames.add(String(name).trim());
  }
  for (const suc of Array.isArray(settingsSucursales) ? settingsSucursales : []) {
    for (const name of Array.isArray(suc?.bodegas) ? suc.bodegas : []) {
      if (String(name || '').trim()) configNames.add(String(name).trim());
    }
  }
  for (const name of configNames) {
    const id = slugifyWarehouseId(name);
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name,
        code: id === DEFAULT_CENTRAL_BRANCH_ID ? 'BOD-01' : id.toUpperCase().slice(0, 10),
        address: '',
        establishmentCode: '001',
        manager: '',
        active: true,
        isDefault: id === DEFAULT_CENTRAL_BRANCH_ID
      });
    }
  }

  // 3. Preservar cualquier branchId presente en `stockByBranch` de productos existentes
  for (const p of Array.isArray(products) ? products : []) {
    const sbb = p?.stockByBranch;
    if (!sbb || typeof sbb !== 'object') continue;
    for (const branchId of Object.keys(sbb)) {
      if (!branchId || byId.has(branchId)) continue;
      const legacy = LEGACY_BRANCH_MAP[branchId];
      byId.set(branchId, {
        id: branchId,
        name: legacy?.name || branchId,
        code: legacy?.code || branchId.toUpperCase().slice(0, 10),
        address: '',
        establishmentCode: legacy?.establishmentCode || '001',
        manager: '',
        active: true,
        isDefault: branchId === DEFAULT_CENTRAL_BRANCH_ID
      });
    }
  }

  // 4. Garantizar siempre al menos Bodega Central (`sucursal-central-uuid`)
  if (!byId.has(DEFAULT_CENTRAL_BRANCH_ID)) {
    byId.set(DEFAULT_CENTRAL_BRANCH_ID, {
      ...LEGACY_BRANCH_MAP[DEFAULT_CENTRAL_BRANCH_ID],
      address: '',
      manager: '',
      active: true
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Resuelve el branchId real para cualquier nombre o ID de bodega sin colapsar bodegas personalizadas a Central.
 */
export function resolveWarehouseId(warehouseNameOrId, warehouses = []) {
  const raw = String(warehouseNameOrId || '').trim();
  if (!raw) return DEFAULT_CENTRAL_BRANCH_ID;

  const exactId = warehouses.find((w) => w.id === raw);
  if (exactId) return exactId.id;

  const normalized = raw.toLowerCase();
  const byName = warehouses.find((w) => String(w.name || '').trim().toLowerCase() === normalized);
  if (byName) return byName.id;

  return slugifyWarehouseId(raw);
}

/**
 * Obtiene el stock disponible de un producto en una bodega específica (o el total si no se indica).
 */
export function getProductStockInWarehouse(product, branchId) {
  if (!product) return 0;
  if (product.type === 'SERVICE' || product.inventoryType === 'VIRTUAL') return Infinity;
  const sbb = product.stockByBranch;
  if (branchId && sbb && typeof sbb === 'object' && Object.prototype.hasOwnProperty.call(sbb, branchId)) {
    return Number(sbb[branchId]) || 0;
  }
  if (!branchId || branchId === DEFAULT_CENTRAL_BRANCH_ID) {
    return Number(product.stock ?? product.currentStock ?? 0) || 0;
  }
  return 0;
}
