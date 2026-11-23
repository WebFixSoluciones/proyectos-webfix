/**
 * Capa de Dominio — RBAC y Permisos Granulares Multi-Tenant.
 * Compatible 100% hacia atrás con perfiles existentes (role: 'superadmin' | 'admin' | 'staff').
 */

export const MODULE_PERMISSIONS = [
  { id: 'dashboard', label: 'Inicio / Dashboard', group: 'General' },
  { id: 'ventas', label: 'Control de Ventas y Facturación', group: 'Comercial' },
  { id: 'pos', label: 'Punto de Venta (POS)', group: 'Comercial' },
  { id: 'personas', label: 'Clientes y Proveedores', group: 'Comercial' },
  { id: 'compras', label: 'Control de Compras y XML SRI', group: 'Operaciones' },
  { id: 'inventario', label: 'Catálogo, Servicios y Kardex', group: 'Operaciones' },
  { id: 'bodegas', label: 'Control de Bodegas y Etiquetas', group: 'Operaciones' },
  { id: 'despachos', label: 'Despachos de Bodega', group: 'Operaciones' },
  { id: 'finanzas', label: 'Finanzas (Ingresos, Egresos, CxC/CxP, Bancos)', group: 'Financiero' },
  { id: 'contabilidad', label: 'Contabilidad y Asientos', group: 'Financiero' },
  { id: 'impuestos', label: 'Impuestos, SRI y ATS', group: 'Financiero' },
  { id: 'reportes', label: 'Reportes y Auditoría', group: 'Financiero' },
  { id: 'configuracion', label: 'Configuración Fiscal, Firma y SMTP', group: 'Administración' },
  { id: 'usuarios', label: 'Usuarios y Permisos', group: 'Administración' }
];

export const ACTION_PERMISSIONS = [
  { id: 'emitir_sri', label: 'Emitir comprobantes electrónicos al SRI', module: 'ventas' },
  { id: 'anular_comprobantes', label: 'Anular ventas y comprobantes internos', module: 'ventas' },
  { id: 'aplicar_descuentos', label: 'Aplicar descuentos manuales en ventas/POS', module: 'ventas' },
  { id: 'abrir_cerrar_caja', label: 'Abrir y cerrar turnos de caja POS', module: 'pos' },
  { id: 'autorizar_credito_pos', label: 'Autorizar crédito/descuentos con PIN supervisor', module: 'pos' },
  { id: 'registrar_compras', label: 'Registrar e importar compras y gastos', module: 'compras' },
  { id: 'gestionar_productos', label: 'Crear y editar productos y precios', module: 'inventario' },
  { id: 'ajustar_inventario', label: 'Ejecutar ajustes y transferencias de bodega', module: 'inventario' },
  { id: 'despachar_bodega', label: 'Preparar y confirmar despachos de bodega', module: 'despachos' },
  { id: 'imprimir_etiquetas', label: 'Diseñar e imprimir etiquetas de códigos de barra', module: 'bodegas' },
  { id: 'gestionar_bancos', label: 'Registrar movimientos y conciliar bancos/cajas', module: 'finanzas' },
  { id: 'gestionar_asientos', label: 'Crear y aprobar asientos contables', module: 'contabilidad' },
  { id: 'editar_config_fiscal', label: 'Editar RUC, puntos de emisión, .p12 y SMTP', module: 'configuracion' },
  { id: 'gestionar_usuarios', label: 'Crear, editar y asignar permisos a usuarios', module: 'usuarios' },
  { id: 'exportar_respaldos', label: 'Descargar respaldos y exportaciones masivas', module: 'configuracion' }
];

const ALL_MODULES = Object.fromEntries(MODULE_PERMISSIONS.map((m) => [m.id, true]));
const ALL_ACTIONS = Object.fromEntries(ACTION_PERMISSIONS.map((a) => [a.id, true]));

export const ROLE_PRESETS = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    description: 'Acceso completo a todos los módulos, configuración fiscal, puntos de emisión y usuarios.',
    baseRole: 'admin',
    modules: { ...ALL_MODULES },
    actions: { ...ALL_ACTIONS },
    scope: { maxDiscountPct: 100, assignedWarehouses: [], assignedEmissionPoint: null }
  },
  vendedor: {
    id: 'vendedor',
    label: 'Vendedor / Facturador',
    description: 'Emite ventas, cotizaciones, preventas y gestiona clientes; sin acceso a bancos ni configuración fiscal.',
    baseRole: 'staff',
    modules: {
      dashboard: true, ventas: true, pos: true, personas: true,
      compras: false, inventario: true, bodegas: false, despachos: true,
      finanzas: false, contabilidad: false, impuestos: false, reportes: false,
      configuracion: false, usuarios: false
    },
    actions: {
      emitir_sri: true, anular_comprobantes: false, aplicar_descuentos: true,
      abrir_cerrar_caja: true, autorizar_credito_pos: false, registrar_compras: false,
      gestionar_productos: false, ajustar_inventario: false, despachar_bodega: false,
      imprimir_etiquetas: true, gestionar_bancos: false, gestionar_asientos: false,
      editar_config_fiscal: false, gestionar_usuarios: false, exportar_respaldos: false
    },
    scope: { maxDiscountPct: 10, assignedWarehouses: [], assignedEmissionPoint: null }
  },
  cajero_pos: {
    id: 'cajero_pos',
    label: 'Cajero Punto de Venta',
    description: 'Opera caja POS, cobros y facturación rápida con tope de descuento controlado.',
    baseRole: 'staff',
    modules: {
      dashboard: true, ventas: true, pos: true, personas: true,
      compras: false, inventario: false, bodegas: false, despachos: false,
      finanzas: false, contabilidad: false, impuestos: false, reportes: false,
      configuracion: false, usuarios: false
    },
    actions: {
      emitir_sri: true, anular_comprobantes: false, aplicar_descuentos: true,
      abrir_cerrar_caja: true, autorizar_credito_pos: false, registrar_compras: false,
      gestionar_productos: false, ajustar_inventario: false, despachar_bodega: false,
      imprimir_etiquetas: false, gestionar_bancos: false, gestionar_asientos: false,
      editar_config_fiscal: false, gestionar_usuarios: false, exportar_respaldos: false
    },
    scope: { maxDiscountPct: 5, assignedWarehouses: [], assignedEmissionPoint: null }
  },
  bodeguero: {
    id: 'bodeguero',
    label: 'Bodeguero / Logística',
    description: 'Gestiona inventarios, bodegas, escaneo de códigos de barra, etiquetas y despachos posteriores.',
    baseRole: 'staff',
    modules: {
      dashboard: true, ventas: false, pos: false, personas: false,
      compras: true, inventario: true, bodegas: true, despachos: true,
      finanzas: false, contabilidad: false, impuestos: false, reportes: false,
      configuracion: false, usuarios: false
    },
    actions: {
      emitir_sri: false, anular_comprobantes: false, aplicar_descuentos: false,
      abrir_cerrar_caja: false, autorizar_credito_pos: false, registrar_compras: true,
      gestionar_productos: true, ajustar_inventario: true, despachar_bodega: true,
      imprimir_etiquetas: true, gestionar_bancos: false, gestionar_asientos: false,
      editar_config_fiscal: false, gestionar_usuarios: false, exportar_respaldos: false
    },
    scope: { maxDiscountPct: 0, assignedWarehouses: [], assignedEmissionPoint: null }
  },
  contador: {
    id: 'contador',
    label: 'Contador / Financiero',
    description: 'Control financiero completo, bancos, CxC/CxP, contabilidad, ATS e impuestos SRI.',
    baseRole: 'staff',
    modules: {
      dashboard: true, ventas: true, pos: false, personas: true,
      compras: true, inventario: true, bodegas: false, despachos: false,
      finanzas: true, contabilidad: true, impuestos: true, reportes: true,
      configuracion: false, usuarios: false
    },
    actions: {
      emitir_sri: true, anular_comprobantes: true, aplicar_descuentos: false,
      abrir_cerrar_caja: false, autorizar_credito_pos: false, registrar_compras: true,
      gestionar_productos: false, ajustar_inventario: false, despachar_bodega: false,
      imprimir_etiquetas: false, gestionar_bancos: true, gestionar_asientos: true,
      editar_config_fiscal: false, gestionar_usuarios: false, exportar_respaldos: true
    },
    scope: { maxDiscountPct: 0, assignedWarehouses: [], assignedEmissionPoint: null }
  },
  lectura: {
    id: 'lectura',
    label: 'Solo Lectura / Auditor',
    description: 'Consulta paneles y reportes sin permisos de escritura ni emisión fiscal.',
    baseRole: 'staff',
    modules: {
      dashboard: true, ventas: true, pos: false, personas: true,
      compras: true, inventario: true, bodegas: true, despachos: true,
      finanzas: true, contabilidad: true, impuestos: true, reportes: true,
      configuracion: false, usuarios: false
    },
    actions: Object.fromEntries(ACTION_PERMISSIONS.map((a) => [a.id, false])),
    scope: { maxDiscountPct: 0, assignedWarehouses: [], assignedEmissionPoint: null }
  }
};

/**
 * Permisos seguros por defecto para usuarios legacy `staff` que aún no tienen
 * el objeto `permissions` configurado: operan el ERP sin romper flujos,
 * pero quedan protegidos contra cambios fiscales, usuarios y respaldos.
 */
export const LEGACY_STAFF_DEFAULT_PERMISSIONS = {
  preset: 'staff_legacy',
  modules: {
    ...ALL_MODULES,
    configuracion: false,
    usuarios: false
  },
  actions: {
    ...ALL_ACTIONS,
    editar_config_fiscal: false,
    gestionar_usuarios: false,
    exportar_respaldos: false,
    autorizar_credito_pos: false
  },
  scope: {
    maxDiscountPct: 15,
    assignedWarehouses: [],
    assignedEmissionPoint: null
  }
};

export function createPermissionsFromPreset(presetId = 'vendedor') {
  const preset = ROLE_PRESETS[presetId] || ROLE_PRESETS.vendedor;
  return {
    preset: preset.id,
    modules: { ...preset.modules },
    actions: { ...preset.actions },
    scope: {
      maxDiscountPct: preset.scope?.maxDiscountPct ?? 10,
      assignedWarehouses: [...(preset.scope?.assignedWarehouses || [])],
      assignedEmissionPoint: preset.scope?.assignedEmissionPoint || null
    }
  };
}
