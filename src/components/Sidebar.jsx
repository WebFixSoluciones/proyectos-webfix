import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, CreditCard,
  Package, Users, Settings,
  ChevronDown, DollarSign
} from 'lucide-react';

export default function Sidebar({
  isSidebarOpen, setIsSidebarOpen, activePageId, setActivePageId,
  companyProfile, activeModules, expandedSidebarMenu, setExpandedSidebarMenu,
  ventasInitialSubTab, setVentasInitialSubTab,
  comprasInitialSubTab, setComprasInitialSubTab,
  inventarioInitialSubTab, setInventarioInitialSubTab,
  contabilidadInitialSubTab, setContabilidadInitialSubTab,
  billingInitialSubTab, setBillingInitialSubTab,
  personasSubTab, setPersonasSubTab,
  trash, handleLogout
}) {
  const closeMobile = () => { if(window.innerWidth < 768) setIsSidebarOpen(false); };

  const navBase = "group relative flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl transition-all text-sm tracking-tight cursor-pointer";
  const navActive = "bg-[#c0ffa5] text-[#004227] font-semibold";
  const navInactive = "text-slate-800 hover:text-slate-950 hover:bg-slate-100 font-medium";
  const navBtnClass = (isActive) => `${navBase} ${isActive ? navActive : navInactive}`;

  const iconClass = (isActive) => `shrink-0 transition-colors ${isActive ? 'text-[#004227]' : 'text-slate-800 group-hover:text-slate-950'}`;

  const subBase = "block w-full text-left py-2 px-3 rounded-lg text-xs tracking-tight transition-all cursor-pointer font-medium";
  const subActive = "text-[#004227] font-semibold bg-[#c0ffa5]";
  const subInactive = "text-slate-700 hover:text-slate-950 hover:bg-slate-100";
  const subItemClass = (isActive) => `${subBase} ${isActive ? subActive : subInactive}`;

  const menuBorderClass = "pl-4 pr-1 space-y-0.5 border-l border-slate-200 ml-4 mt-1 select-none";

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden transition-opacity duration-200" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`flex flex-col border-r border-slate-200/90 bg-white transition-all duration-300 z-50 absolute md:relative h-full select-none ${isSidebarOpen ? 'translate-x-0 w-[80vw] max-w-64' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'}`}>
      
        {/* Sidebar Brand Header */}
        <button 
          type="button"
          onClick={() => { setActivePageId('dashboard'); closeMobile(); }}
          className={`h-14 w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} shrink-0 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors text-left`}
          title="Ir al Inicio"
        >
          {isSidebarOpen ? (
            <div className="flex items-center gap-2.5">
              {companyProfile?.logoUrl ? (
                <img src={companyProfile.logoUrl} alt="Logo" className="max-h-7 object-contain rounded" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-[#0b996e] tracking-tight">WebFix</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-[#004227]">ERP</span>
                </div>
              )}
            </div>
          ) : (
            companyProfile?.logoUrl ? (
              <img src={companyProfile.logoUrl} alt="Logo" className="w-7 h-7 rounded object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#0b996e] text-white flex items-center justify-center font-bold text-xs">
                W
              </div>
            )
          )}
        </button>
      
        {/* Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-2.5 space-y-1 py-3 custom-scrollbar">
      
          {/* Inicio (Dashboard) */}
          <button onClick={() => { setActivePageId('dashboard'); closeMobile(); }} className={navBtnClass(activePageId === 'dashboard')}>
            <div className="flex items-center gap-3">
              <LayoutDashboard size={18} strokeWidth={2.2} className={iconClass(activePageId === 'dashboard')} />
              {isSidebarOpen && <span>Inicio</span>}
            </div>
            {activePageId === 'dashboard' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
          </button>
      
          {/* Ventas */}
          {activeModules.ventas && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'ventas' ? null : 'ventas'); setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }} className={navBtnClass(activePageId === 'ventas')}>
                <div className="flex items-center gap-3 flex-1">
                  <ShoppingCart size={18} strokeWidth={2.2} className={iconClass(activePageId === 'ventas')} />
                  {isSidebarOpen && <span>Ventas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} strokeWidth={2.2} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'ventas' ? 'rotate-180' : ''} text-slate-500`} />}
                {activePageId === 'ventas' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'ventas' && (
                <div className={menuBorderClass}>
                  {[
                    { id: 'resumen_ventas', label: 'Historial de Ventas' },
                    { id: 'ventas_nueva', label: 'Registrar Venta' },
                    { id: 'preventas', label: 'Preventas' },
                    { id: 'quotes', label: 'Cotizaciones' },
                    { id: 'nota_credito', label: 'Notas de Crédito' },
                    { id: 'retencion', label: 'Retenciones de Venta' },
                    { id: 'discounts', label: 'Descuentos y Promos' }
                  ].map(sub => {
                    const isActive = activePageId === 'ventas' && (
                      sub.id === 'ventas_nueva'
                        ? (ventasInitialSubTab && (String(ventasInitialSubTab).startsWith('ventas_nueva') || String(ventasInitialSubTab).startsWith('ventas_preventa')))
                        : ventasInitialSubTab === sub.id
                    );
                    return (
                      <button 
                        key={sub.id} 
                        onClick={() => { 
                          const targetId = sub.id === 'ventas_nueva' ? `ventas_nueva_${Date.now()}` : sub.id;
                          setVentasInitialSubTab(targetId); 
                          setActivePageId('ventas'); 
                          closeMobile(); 
                        }} 
                        className={subItemClass(isActive)}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Compras */}
          {activeModules.compras && (
            <div className="space-y-0.5">
              <button 
                onClick={() => { 
                  setExpandedSidebarMenu(expandedSidebarMenu === 'compras' ? null : 'compras'); 
                  setComprasInitialSubTab('compras_resumen'); 
                  setActivePageId('compras'); 
                }} 
                className={navBtnClass(activePageId === 'compras')}
              >
                <div className="flex items-center gap-3 flex-1">
                  <ShoppingBag size={18} strokeWidth={2.2} className={iconClass(activePageId === 'compras')} />
                  {isSidebarOpen && <span>Compras</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} strokeWidth={2.2} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'compras' ? 'rotate-180' : ''} text-slate-500`} />}
                {activePageId === 'compras' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'compras' && (
                <div className={menuBorderClass}>
                  {[
                    { id: 'compras_resumen', label: 'Historial de Compras' },
                    { id: 'compras_preventa', label: 'Registrar Compra' },
                    { id: 'compras_nc', label: 'Notas de Crédito Recibidas' },
                    { id: 'compras_nd', label: 'Notas de Débito Recibidas' },
                    { id: 'compras_retencion', label: 'Retenciones de Compras' }
                  ].map(sub => {
                    const isActive = activePageId === 'compras' && (
                      sub.id === 'compras_preventa' 
                        ? (comprasInitialSubTab && String(comprasInitialSubTab).startsWith('compras_preventa'))
                        : comprasInitialSubTab === sub.id
                    );
                    return (
                      <button 
                        key={sub.id} 
                        onClick={() => { 
                          const targetId = sub.id === 'compras_preventa' ? `compras_preventa_${Date.now()}` : sub.id;
                          setComprasInitialSubTab(targetId); 
                          setActivePageId('compras'); 
                          closeMobile(); 
                        }} 
                        className={subItemClass(isActive)}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Control Financiero */}
          {activeModules.finances && (
            <div className="space-y-0.5">
              <button 
                onClick={() => { 
                  setExpandedSidebarMenu(expandedSidebarMenu === 'finanzas' ? null : 'finanzas'); 
                  setContabilidadInitialSubTab('resumen_financiero'); 
                  setActivePageId('finances'); 
                }} 
                className={navBtnClass(activePageId === 'finances')}
              >
                <div className="flex items-center gap-3 flex-1">
                  <DollarSign size={18} strokeWidth={2.2} className={iconClass(activePageId === 'finances')} />
                  {isSidebarOpen && <span>Finanzas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} strokeWidth={2.2} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'finanzas' ? 'rotate-180' : ''} text-slate-500`} />}
                {activePageId === 'finances' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'finanzas' && (
                <div className={menuBorderClass}>
                  {[
                    { id: 'resumen_financiero', label: 'Resumen' },
                    { id: 'movimientos', label: 'Movimientos' },
                    { id: 'cxc', label: 'Cuentas por Cobrar' },
                    { id: 'cxp', label: 'Cuentas por Pagar' },
                    { id: 'bancos', label: 'Bancos y Caja' },
                    { id: 'tarjetas', label: 'Tarjetas y Créditos' },
                    { id: 'prestamos', label: 'Préstamos' },
                    { id: 'captura', label: 'Captura Inteligente' },
                    { id: 'contabilidad_tab', label: 'Contabilidad' },
                    { id: 'impuestos', label: 'Impuestos y SRI' },
                    { id: 'reportes', label: 'Reportes' }
                  ].map(sub => {
                    const isActive = activePageId === 'finances' && contabilidadInitialSubTab === sub.id;
                    return (
                      <button 
                        key={sub.id} 
                        onClick={() => { 
                          setContabilidadInitialSubTab(sub.id); 
                          setActivePageId('finances'); 
                          closeMobile(); 
                        }} 
                        className={subItemClass(isActive)}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inventarios */}
          {activeModules.inventario && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'inventario' ? null : 'inventario'); setInventarioInitialSubTab('productos'); setActivePageId('inventario'); }} className={navBtnClass(activePageId === 'inventario')}>
                <div className="flex items-center gap-3 flex-1">
                  <Package size={18} strokeWidth={2.2} className={iconClass(activePageId === 'inventario')} />
                  {isSidebarOpen && <span>Inventarios</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} strokeWidth={2.2} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'inventario' ? 'rotate-180' : ''} text-slate-500`} />}
                {activePageId === 'inventario' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'inventario' && (
                <div className={menuBorderClass}>
                  {[
                    { id: 'productos', label: 'Catálogo de Productos' },
                    { id: 'servicios', label: 'Servicios' },
                    { id: 'categorias', label: 'Categorías y Marcas' },
                    { id: 'kardex', label: 'Movimientos Kardex' },
                    { id: 'transferencias', label: 'Transferencias' },
                    { id: 'ajustes', label: 'Ajustes de Inventario' }
                  ].map(sub => {
                    const isActive = activePageId === 'inventario' && (
                      sub.id === 'servicios'
                        ? (inventarioInitialSubTab === 'servicios' || String(inventarioInitialSubTab).startsWith('create_service'))
                        : sub.id === 'productos'
                        ? (inventarioInitialSubTab === 'productos' || String(inventarioInitialSubTab).startsWith('create_product'))
                        : inventarioInitialSubTab === sub.id
                    );
                    return <button key={sub.id} onClick={() => { setInventarioInitialSubTab(sub.id); setActivePageId('inventario'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Personas (Clientes y Proveedores) */}
          {activeModules.personas && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'personas_menu' ? null : 'personas_menu'); setPersonasSubTab('cliente'); setActivePageId('personas'); }} className={navBtnClass(activePageId === 'personas')}>
                <div className="flex items-center gap-3 flex-1">
                  <Users size={18} strokeWidth={2.2} className={iconClass(activePageId === 'personas')} />
                  {isSidebarOpen && <span>Personas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} strokeWidth={2.2} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'personas_menu' ? 'rotate-180' : ''} text-slate-500`} />}
                {activePageId === 'personas' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'personas_menu' && (
                <div className={menuBorderClass}>
                  {[
                    { id: 'cliente', label: 'Clientes' },
                    { id: 'proveedor', label: 'Proveedores' }
                  ].map(sub => {
                    const isActive = activePageId === 'personas' && personasSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setActivePageId('personas'); setPersonasSubTab(sub.id); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ajustes */}
          <button onClick={() => { setActivePageId('general_settings'); closeMobile(); }} className={navBtnClass(activePageId === 'general_settings')}>
            <div className="flex items-center gap-3">
              <Settings size={18} strokeWidth={2.2} className={iconClass(activePageId === 'general_settings')} />
              {isSidebarOpen && <span>Ajustes</span>}
            </div>
            {activePageId === 'general_settings' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
          </button>

          {/* Suscripción SaaS */}
          <div className="space-y-0.5">
            <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'billing' ? null : 'billing'); setBillingInitialSubTab('planes'); setActivePageId('billing'); }} className={navBtnClass(activePageId === 'billing')}>
              <div className="flex items-center gap-3 flex-1">
                <CreditCard size={18} strokeWidth={2.2} className={iconClass(activePageId === 'billing')} />
                {isSidebarOpen && <span>Suscripción</span>}
              </div>
              {isSidebarOpen && <ChevronDown size={14} strokeWidth={2.2} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'billing' ? 'rotate-180' : ''} text-slate-500`} />}
              {activePageId === 'billing' && <span className="absolute -right-2.5 top-1.5 bottom-1.5 w-1 bg-[#0b996e] rounded-l" />}
            </button>
            {isSidebarOpen && expandedSidebarMenu === 'billing' && (
              <div className={menuBorderClass}>
                {[
                  { id: 'facturacion', label: 'Facturación Electrónica' },
                  { id: 'paginas', label: 'Páginas Web' },
                  { id: 'correos', label: 'Correos Corporativos' },
                  { id: 'whatsapp', label: 'WhatsApp CRM' },
                  { id: 'pagos', label: 'Historial de Pagos' }
                ].map(sub => {
                  const isActive = activePageId === 'billing' && (sub.id === 'pagos' ? (billingInitialSubTab === 'pagos' || billingInitialSubTab === 'historial') : billingInitialSubTab === sub.id);
                  return <button key={sub.id} onClick={() => { setBillingInitialSubTab(sub.id); setActivePageId('billing'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
