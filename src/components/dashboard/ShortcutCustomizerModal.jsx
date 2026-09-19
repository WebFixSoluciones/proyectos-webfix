import { useState, useMemo } from 'react';
import { 
  X, Check, Search, RotateCcw, PlusCircle, ShoppingCart, FileText, 
  FileCheck, Clock, Tag, PackagePlus, Briefcase, Package, Boxes, 
  Sliders, ShoppingBag, Receipt, Users, CreditCard, HandCoins, 
  Landmark, BarChart3, FileSpreadsheet, Settings, SlidersHorizontal, 
  Sparkles
} from 'lucide-react';
import { UiBox, UiHeading, UiText, UiCard } from '../ui/layout';
import { UiButton, UiInput } from '../ui/controls';
import { createThemedPortal } from '../ui/themePortal';

export const AVAILABLE_SHORTCUTS = [
  // --- Ventas y Facturación ---
  {
    id: 'generar_venta',
    title: 'Generar Venta',
    subtitle: 'Factura administrativa',
    category: 'Ventas',
    icon: PlusCircle,
    color: 'var(--blue-9)',
    action: ({ setActivePageId, setVentasInitialSubTab }) => {
      setVentasInitialSubTab?.(`ventas_nueva_${Date.now()}`);
      setActivePageId('ventas');
    }
  },
  {
    id: 'pos',
    title: 'Punto de Venta',
    subtitle: 'Cobro rápido (F12)',
    category: 'Ventas',
    icon: ShoppingCart,
    color: 'var(--blue-9)',
    action: ({ setActivePageId, setVentasInitialSubTab }) => {
      setVentasInitialSubTab?.('pos');
      setActivePageId('ventas');
    }
  },
  {
    id: 'facturas_sri',
    title: 'Facturas SRI',
    subtitle: 'Emisión y RIDE',
    category: 'Ventas',
    icon: FileText,
    color: 'var(--blue-9)',
    action: ({ setActivePageId, setVentasInitialSubTab }) => {
      setVentasInitialSubTab?.('resumen_ventas');
      setActivePageId('ventas');
    }
  },
  {
    id: 'cotizaciones',
    title: 'Cotización',
    subtitle: 'Proformas comerciales',
    category: 'Ventas',
    icon: FileCheck,
    color: 'var(--blue-9)',
    action: ({ setActivePageId, setVentasInitialSubTab }) => {
      setVentasInitialSubTab?.('quotes');
      setActivePageId('ventas');
    }
  },
  {
    id: 'preventas',
    title: 'Preventas',
    subtitle: 'Pedidos en ruta',
    category: 'Ventas',
    icon: Clock,
    color: 'var(--blue-9)',
    action: ({ setActivePageId, setVentasInitialSubTab }) => {
      setVentasInitialSubTab?.('preventas');
      setActivePageId('ventas');
    }
  },
  {
    id: 'nota_credito',
    title: 'Notas de Crédito',
    subtitle: 'Anulación y devolución',
    category: 'Ventas',
    icon: RotateCcw,
    color: 'var(--blue-9)',
    action: ({ setActivePageId, setVentasInitialSubTab }) => {
      setVentasInitialSubTab?.('nota_credito');
      setActivePageId('ventas');
    }
  },

  // --- Inventario y Catálogo ---
  {
    id: 'crear_producto',
    title: 'Crear Producto',
    subtitle: 'Nuevo ítem al catálogo',
    category: 'Inventario',
    icon: PackagePlus,
    color: 'var(--indigo-9)',
    action: ({ setActivePageId, setInventarioInitialSubTab }) => {
      setInventarioInitialSubTab?.(`create_product_${Date.now()}`);
      setActivePageId('inventario');
    }
  },
  {
    id: 'crear_servicio',
    title: 'Crear Servicio',
    subtitle: 'Intangibles y mano de obra',
    category: 'Inventario',
    icon: Briefcase,
    color: 'var(--indigo-9)',
    action: ({ setActivePageId, setInventarioInitialSubTab }) => {
      setInventarioInitialSubTab?.(`create_service_${Date.now()}`);
      setActivePageId('inventario');
    }
  },
  {
    id: 'servicios_catalogo',
    title: 'Catálogo de Servicios',
    subtitle: 'Gestión y tarifas de servicios',
    category: 'Inventario',
    icon: Briefcase,
    color: 'var(--indigo-9)',
    action: ({ setActivePageId, setInventarioInitialSubTab }) => {
      setInventarioInitialSubTab?.('servicios');
      setActivePageId('inventario');
    }
  },
  {
    id: 'inventario',
    title: 'Inventario',
    subtitle: 'Kardex y Stock',
    category: 'Inventario',
    icon: Package,
    color: 'var(--indigo-9)',
    action: ({ setActivePageId, setInventarioInitialSubTab }) => {
      setInventarioInitialSubTab?.('productos');
      setActivePageId('inventario');
    }
  },
  {
    id: 'kardex',
    title: 'Movimientos Kardex',
    subtitle: 'Trazabilidad y saldos',
    category: 'Inventario',
    icon: Boxes,
    color: 'var(--indigo-9)',
    action: ({ setActivePageId, setInventarioInitialSubTab }) => {
      setInventarioInitialSubTab?.('kardex');
      setActivePageId('inventario');
    }
  },
  {
    id: 'ajustes_inventario',
    title: 'Ajustes de Stock',
    subtitle: 'Cuadre físico y mermas',
    category: 'Inventario',
    icon: Sliders,
    color: 'var(--indigo-9)',
    action: ({ setActivePageId, setInventarioInitialSubTab }) => {
      setInventarioInitialSubTab?.('ajustes');
      setActivePageId('inventario');
    }
  },

  // --- Compras ---
  {
    id: 'registrar_compra',
    title: 'Registrar Compra',
    subtitle: 'Ingreso de factura/gasto',
    category: 'Compras',
    icon: ShoppingBag,
    color: 'var(--teal-9)',
    action: ({ setActivePageId, setComprasInitialSubTab }) => {
      setComprasInitialSubTab?.(`compras_preventa_${Date.now()}`);
      setActivePageId('compras');
    }
  },
  {
    id: 'historial_compras',
    title: 'Historial Compras',
    subtitle: 'Facturas de proveedores',
    category: 'Compras',
    icon: Receipt,
    color: 'var(--teal-9)',
    action: ({ setActivePageId, setComprasInitialSubTab }) => {
      setComprasInitialSubTab?.('compras_resumen');
      setActivePageId('compras');
    }
  },

  // --- Finanzas y Cartera ---
  {
    id: 'gastos_creditos',
    title: 'Gastos y CxP',
    subtitle: 'Control de egresos',
    category: 'Finanzas',
    icon: CreditCard,
    color: 'var(--amber-9)',
    action: ({ setActivePageId, setContabilidadInitialSubTab }) => {
      setContabilidadInitialSubTab?.('cxp');
      setActivePageId('finances');
    }
  },
  {
    id: 'cxc',
    title: 'Cuentas por Cobrar',
    subtitle: 'Cartera y abonos (CxC)',
    category: 'Finanzas',
    icon: HandCoins,
    color: 'var(--amber-9)',
    action: ({ setActivePageId, setContabilidadInitialSubTab }) => {
      setContabilidadInitialSubTab?.('cxc');
      setActivePageId('finances');
    }
  },
  {
    id: 'bancos',
    title: 'Bancos y Caja',
    subtitle: 'Cuentas y conciliación',
    category: 'Finanzas',
    icon: Landmark,
    color: 'var(--amber-9)',
    action: ({ setActivePageId, setContabilidadInitialSubTab }) => {
      setContabilidadInitialSubTab?.('bancos');
      setActivePageId('finances');
    }
  },
  {
    id: 'resumen_financiero',
    title: 'Resumen Financiero',
    subtitle: 'Métricas y balances',
    category: 'Finanzas',
    icon: BarChart3,
    color: 'var(--amber-9)',
    action: ({ setActivePageId, setContabilidadInitialSubTab }) => {
      setContabilidadInitialSubTab?.('resumen_financiero');
      setActivePageId('finances');
    }
  },
  {
    id: 'impuestos_sri',
    title: 'Impuestos y SRI',
    subtitle: 'Retenciones y ATS',
    category: 'Finanzas',
    icon: FileSpreadsheet,
    color: 'var(--amber-9)',
    action: ({ setActivePageId, setContabilidadInitialSubTab }) => {
      setContabilidadInitialSubTab?.('impuestos');
      setActivePageId('finances');
    }
  },

  // --- General y Ajustes ---
  {
    id: 'personas',
    title: 'Clientes y Prov',
    subtitle: 'Directorio RUC',
    category: 'General',
    icon: Users,
    color: 'var(--violet-9)',
    action: ({ setActivePageId, setPersonasSubTab }) => {
      setPersonasSubTab?.('cliente');
      setActivePageId('personas');
    }
  },
  {
    id: 'general_settings',
    title: 'Ajustes SRI',
    subtitle: 'Firma .p12 y emisor',
    category: 'General',
    icon: Settings,
    color: 'var(--gray-9)',
    action: ({ setActivePageId }) => {
      setActivePageId('general_settings');
    }
  }
];

export const DEFAULT_SHORTCUT_IDS = [
  'pos', 
  'facturas_sri', 
  'inventario', 
  'personas', 
  'gastos_creditos', 
  'general_settings'
];

const CATEGORIES = ['Todos', 'Ventas', 'Inventario', 'Compras', 'Finanzas', 'General'];

export default function ShortcutCustomizerModal({
  isOpen,
  onClose,
  currentShortcuts = [],
  onSaveShortcuts,
  showToast
}) {
  const [selectedIds, setSelectedIds] = useState(() => {
    return currentShortcuts.length > 0 ? [...currentShortcuts] : [...DEFAULT_SHORTCUT_IDS];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  if (!isOpen) return null;

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) {
        showToast?.('Debes mantener al menos 1 acceso directo visible.', 'warning');
        return;
      }
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      if (selectedIds.length >= 9) {
        showToast?.('Límite máximo: 9 accesos directos recomendados.', 'warning');
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleResetDefaults = () => {
    setSelectedIds([...DEFAULT_SHORTCUT_IDS]);
    showToast?.('Accesos directos restablecidos a los valores predeterminados.', 'info');
  };

  const handleSave = () => {
    if (selectedIds.length === 0) {
      showToast?.('Debes seleccionar al menos 1 acceso directo.', 'error');
      return;
    }
    onSaveShortcuts(selectedIds);
    showToast?.('Accesos directos guardados correctamente.', 'success');
    onClose();
  };

  // Filtrado de accesos por categoría y búsqueda
  const filteredShortcuts = AVAILABLE_SHORTCUTS.filter(item => {
    const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
    const matchesQuery = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return createThemedPortal(
    <UiBox
      style={{ backgroundColor: 'var(--black-a7)' }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <UiCard
        style={{
          backgroundColor: 'var(--color-panel-solid)',
          borderRadius: 'var(--radius-4)',
          border: '1px solid var(--gray-a6)'
        }}
        className="w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <UiBox
          style={{ borderBottom: '1px solid var(--gray-a5)', backgroundColor: 'var(--gray-2)' }}
          className="px-5 py-4 flex items-center justify-between gap-3 shrink-0"
        >
          <UiBox className="flex items-center gap-3">
            <UiBox
              style={{
                borderRadius: 'var(--radius-3)',
                backgroundColor: 'var(--blue-9)',
                color: 'white'
              }}
              className="w-9 h-9 flex items-center justify-center shadow-sm shrink-0"
            >
              <SlidersHorizontal size={20} />
            </UiBox>
            <UiBox>
              <UiHeading as="h3" size="4" weight="bold" color="gray" highContrast>
                Personalizar Accesos Directos
              </UiHeading>
              <UiText size="1" color="gray">
                Selecciona las funcionalidades que deseas ver en tu espacio de inicio.
              </UiText>
            </UiBox>
          </UiBox>

          <UiBox className="flex items-center gap-3">
            <span
              style={{
                backgroundColor: selectedIds.length === 6 ? 'var(--blue-3)' : 'var(--gray-3)',
                color: selectedIds.length === 6 ? 'var(--blue-11)' : 'var(--gray-11)',
                border: `1px solid ${selectedIds.length === 6 ? 'var(--blue-6)' : 'var(--gray-6)'}`
              }}
              className="px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide"
            >
              {selectedIds.length} / 9 activos
            </span>
            <UiButton
              iconOnly
              onClick={onClose}
              variant="surface"
              color="gray"
              size="2"
              className="cursor-pointer"
              title="Cerrar"
            >
              <X size={16} />
            </UiButton>
          </UiBox>
        </UiBox>

        {/* Barra de Filtros y Búsqueda */}
        <UiBox
          style={{ borderBottom: '1px solid var(--gray-a4)', backgroundColor: 'var(--color-panel-solid)' }}
          className="p-4 space-y-3 shrink-0"
        >
          <UiBox className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Buscador */}
            <UiBox className="flex-1 max-w-sm">
              <UiInput
                placeholder="Buscar acceso rápido..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                iconPrefix={<Search size={15} className="text-[var(--gray-10)]" />}
                size="2"
              />
            </UiBox>

            {/* Categorías / Tabs rápidas */}
            <UiBox className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      backgroundColor: isActive ? 'var(--blue-9)' : 'var(--gray-3)',
                      color: isActive ? '#ffffff' : 'var(--gray-11)',
                      borderColor: isActive ? 'var(--blue-9)' : 'var(--gray-5)'
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer whitespace-nowrap hover:border-[var(--blue-8)]"
                  >
                    {cat}
                  </button>
                );
              })}
            </UiBox>
          </UiBox>

          <UiBox className="flex items-center justify-between text-xs text-[var(--gray-10)] px-1">
            <span>
              Mostrando {filteredShortcuts.length} de {AVAILABLE_SHORTCUTS.length} funcionalidades disponibles.
            </span>
            <span className="hidden sm:inline-block">
              Diseño óptimo recomendado: <strong>6 accesos</strong> (2 filas x 3 columnas).
            </span>
          </UiBox>
        </UiBox>

        {/* Cuadrícula de Selección de Accesos */}
        <UiBox className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredShortcuts.map(item => {
              const isSelected = selectedIds.includes(item.id);
              const selectedIndex = selectedIds.indexOf(item.id);
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  style={{
                    backgroundColor: isSelected ? 'var(--blue-2)' : 'var(--color-panel-solid)',
                    borderColor: isSelected ? 'var(--blue-9)' : 'var(--gray-a5)',
                    boxShadow: isSelected ? '0 0 0 1px var(--blue-9)' : 'none'
                  }}
                  className={`group relative p-3.5 rounded-lg border transition-all duration-150 cursor-pointer select-none flex items-start gap-3 hover:border-[var(--blue-8)] hover:shadow-sm ${
                    isSelected ? 'ring-1 ring-[var(--blue-9)]' : ''
                  }`}
                >
                  {/* Icono con badge coloreado */}
                  <div
                    style={{
                      backgroundColor: item.color || 'var(--blue-9)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-3)'
                    }}
                    className="w-10 h-10 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                  >
                    <Icon size={20} />
                  </div>

                  {/* Textos */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[var(--gray-12)] truncate group-hover:text-[var(--blue-11)] transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--gray-10)] mt-0.5 line-clamp-1">
                      {item.subtitle}
                    </p>
                    <span 
                      style={{
                        backgroundColor: 'var(--gray-3)',
                        color: 'var(--gray-11)'
                      }}
                      className="inline-block mt-2 px-1.5 py-0.5 text-[10px] font-medium rounded uppercase tracking-wider"
                    >
                      {item.category}
                    </span>
                  </div>

                  {/* Checkbox / Indicador de estado */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1">
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[var(--blue-11)] bg-[var(--blue-4)] px-1.5 py-0.5 rounded-full">
                        #{selectedIndex + 1}
                      </span>
                    )}
                    <div
                      style={{
                        backgroundColor: isSelected ? 'var(--blue-9)' : 'transparent',
                        borderColor: isSelected ? 'var(--blue-9)' : 'var(--gray-8)',
                        color: '#ffffff'
                      }}
                      className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredShortcuts.length === 0 && (
            <UiBox className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles size={32} className="text-[var(--gray-9)] mb-2" />
              <UiText size="2" weight="medium" color="gray" highContrast>
                No se encontraron accesos con ese filtro
              </UiText>
              <UiText size="1" color="gray" className="mt-1">
                Prueba buscando con otro término o selecciona "Todos".
              </UiText>
            </UiBox>
          )}
        </UiBox>

        {/* Pie del Modal con Acciones */}
        <UiBox
          style={{ borderTop: '1px solid var(--gray-a5)', backgroundColor: 'var(--gray-2)' }}
          className="px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
        >
          <UiButton
            type="button"
            variant="ghost"
            color="gray"
            size="2"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <RotateCcw size={14} /> Restaurar predeterminados
          </UiButton>

          <UiBox className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <UiButton
              type="button"
              variant="outline"
              color="gray"
              size="2"
              onClick={onClose}
              className="cursor-pointer flex-1 sm:flex-none"
            >
              Cancelar
            </UiButton>
            <UiButton
              type="button"
              variant="solid"
              color="blue"
              size="2"
              onClick={handleSave}
              className="cursor-pointer font-medium flex-1 sm:flex-none shadow-sm"
            >
              Guardar Cambios ({selectedIds.length})
            </UiButton>
          </UiBox>
        </UiBox>
      </UiCard>
    </UiBox>
  );
}
