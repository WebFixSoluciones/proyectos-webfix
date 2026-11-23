import { LayoutDashboard, ShoppingCart, Calculator, Package, Menu } from 'lucide-react';
import { canAccessModule } from '../modules/rbac/application/rbacService';

export default function MobileBottomNav({
  activePageId,
  setActivePageId,
  setVentasInitialSubTab,
  setInventarioInitialSubTab,
  setIsSidebarOpen,
  activeModules = {},
  userProfile,
  userRole
}) {
  const allowMod = (modId) => canAccessModule(userProfile || { role: userRole || 'staff' }, modId);
  const canPos = Boolean(activeModules.ventas && allowMod('pos'));
  const canVentas = Boolean(activeModules.ventas && allowMod('ventas'));
  const canInv = Boolean(activeModules.inventario && allowMod('inventario'));

  const itemCls = (active) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-colors cursor-pointer select-none ${
      active
        ? 'text-[#004227] bg-[#e8fedf] font-semibold'
        : 'text-[#5c5c5c] hover:text-[#1b1b1b]'
    }`;

  return (
    <nav
      aria-label="Navegación móvil"
      className="md:hidden shrink-0 bg-white border-t border-[#e3e3e3] px-2 pt-1.5 pb-safe z-30 flex items-center justify-around gap-1"
    >
      <button
        type="button"
        onClick={() => setActivePageId('dashboard')}
        className={itemCls(activePageId === 'dashboard')}
      >
        <LayoutDashboard size={19} strokeWidth={2.1} />
        <span className="text-[10px] leading-tight truncate">Inicio</span>
      </button>

      {canVentas && (
        <button
          type="button"
          onClick={() => {
            setVentasInitialSubTab('resumen_ventas');
            setActivePageId('ventas');
          }}
          className={itemCls(activePageId === 'ventas')}
        >
          <ShoppingCart size={19} strokeWidth={2.1} />
          <span className="text-[10px] leading-tight truncate">Ventas</span>
        </button>
      )}

      {canPos && (
        <button
          type="button"
          onClick={() => {
            setVentasInitialSubTab(`pos_${Date.now()}`);
            setActivePageId('ventas');
          }}
          className="flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-full bg-[#0b996f] hover:bg-[#02835c] active:scale-95 text-white font-bold transition-all cursor-pointer select-none shrink-0"
          title="Abrir Punto de Venta (POS)"
        >
          <Calculator size={19} strokeWidth={2.2} />
          <span className="text-[10px] leading-tight">POS</span>
        </button>
      )}

      {canInv && (
        <button
          type="button"
          onClick={() => {
            setInventarioInitialSubTab('productos');
            setActivePageId('inventario');
          }}
          className={itemCls(activePageId === 'inventario')}
        >
          <Package size={19} strokeWidth={2.1} />
          <span className="text-[10px] leading-tight truncate">Stock</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className={itemCls(false)}
      >
        <Menu size={19} strokeWidth={2.1} />
        <span className="text-[10px] leading-tight truncate">Menú</span>
      </button>
    </nav>
  );
}
