import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, CreditCard, 
  Package, DollarSign, Users, Briefcase, Settings,
  ChevronDown, LifeBuoy, Trash2, LogOut
} from 'lucide-react';

export default function Sidebar({
  isSidebarOpen, setIsSidebarOpen, activePageId, setActivePageId,
  companyProfile, activeModules, expandedSidebarMenu, setExpandedSidebarMenu,
  ventasInitialSubTab, setVentasInitialSubTab,
  comprasInitialSubTab, setComprasInitialSubTab,
  gastosInitialSubTab, setGastosInitialSubTab,
  inventarioInitialSubTab, setInventarioInitialSubTab,
  contabilidadInitialSubTab, setContabilidadInitialSubTab,
  billingInitialSubTab, setBillingInitialSubTab,
  personasSubTab, setPersonasSubTab,
  isProyectosActive, trash, handleLogout
}) {
  const closeMobile = () => { if(window.innerWidth < 768) setIsSidebarOpen(false); };

  const navBase = "group flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all text-[13px] font-medium";
  const navActive = "bg-[color-mix(in_srgb,var(--primary-color)_8%,transparent)] text-[var(--primary-color)]";
  const navInactive = "text-[#1a1a1a] hover:bg-[#F6F9FC] hover:text-black";
  const navBtnClass = (isActive) => `${navBase} ${isActive ? navActive : navInactive}`;

  const iconClass = (isActive) => `shrink-0 transition-colors ${isActive ? 'text-[var(--primary-color)]' : 'text-[#333333] group-hover:text-black'}`;

  const subBase = "block w-full text-left py-1.5 px-3 rounded-md text-[12px] font-medium transition-all";
  const subActive = "text-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]";
  const subInactive = "text-[#333333] hover:text-black hover:bg-[#F6F9FC]";
  const subItemClass = (isActive) => `${subBase} ${isActive ? subActive : subInactive}`;

  const menuBorderClass = "pl-9 pr-2 space-y-0.5 border-l border-[#E6EBF1] ml-5 mt-1 select-none";

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-200" onClick={() => setIsSidebarOpen(false)} />}
      
      <div className={`flex flex-col border-r border-[#E6EBF1] bg-white transition-all duration-300 z-50 absolute md:relative h-full ${isSidebarOpen ? 'translate-x-0 w-[80vw] max-w-60' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'}`}>
        
        <div className={`h-14 flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} border-b border-[#E6EBF1] shrink-0 overflow-hidden`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-2.5">
              {companyProfile?.logoUrl ? (
                <img src={companyProfile.logoUrl} alt="Logo" className="max-h-8 object-contain rounded" />
              ) : (
                <span className="text-[14px] font-semibold text-[#0A2540] tracking-tight">
                  {companyProfile?.nombreComercial || companyProfile?.razonSocial || 'WebFix'}
                </span>
              )}
            </div>
          ) : (
            companyProfile?.logoUrl ? (
              <img src={companyProfile.logoUrl} alt="Logo" className="w-7 h-7 rounded object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-md bg-[var(--primary-color)] text-white flex items-center justify-center font-semibold text-[11px]">
                {String(companyProfile?.nombreComercial || companyProfile?.razonSocial || 'W').charAt(0).toUpperCase()}
              </div>
            )
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 space-y-1 py-2 custom-scrollbar">
          
          <button onClick={() => { setActivePageId('dashboard'); closeMobile(); }} className={navBtnClass(activePageId === 'dashboard')}>
            <LayoutDashboard size={16} className={iconClass(activePageId === 'dashboard')} />
            {isSidebarOpen && <span>Mi espacio</span>}
          </button>

          {activeModules.ventas && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'ventas' ? null : 'ventas'); setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }} className={navBtnClass(activePageId === 'ventas')}>
                <div className="flex items-center gap-3 flex-1">
                  <ShoppingCart size={16} className={iconClass(activePageId === 'ventas')} />
                  {isSidebarOpen && <span>Ventas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'ventas' ? 'rotate-180' : ''} text-[#333333]`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'ventas' && (
                <div className={menuBorderClass}>
                  {[{ id: 'resumen_ventas', label: 'Historial de Ventas' },{ id: 'ventas_preventa', label: 'Registrar Venta' },{ id: 'pos', label: 'Punto de Venta (POS)' },{ id: 'preventas', label: 'Preventas' },{ id: 'quotes', label: 'Cotizaciones' },{ id: 'nota_credito', label: 'Notas de Credito' },{ id: 'retencion', label: 'Retenciones de Venta' }].map(sub => {
                    const isActive = activePageId === 'ventas' && (sub.id === 'pos' ? (ventasInitialSubTab && ventasInitialSubTab.startsWith('pos')) : ventasInitialSubTab === sub.id);
                    return <button key={sub.id} onClick={() => { setVentasInitialSubTab(sub.id); setActivePageId('ventas'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {activeModules.compras && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'compras' ? null : 'compras'); setComprasInitialSubTab('compras_resumen'); setActivePageId('compras'); }} className={navBtnClass(activePageId === 'compras')}>
                <div className="flex items-center gap-3 flex-1">
                  <ShoppingBag size={16} className={iconClass(activePageId === 'compras')} />
                  {isSidebarOpen && <span>Compras</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'compras' ? 'rotate-180' : ''} text-[#333333]`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'compras' && (
                <div className={menuBorderClass}>
                  {[{ id: 'compras_resumen', label: 'Historial de Compras' },{ id: 'compras_sri', label: 'Comprobantes SRI' },{ id: 'compras_gastos', label: 'Gastos con IA' },{ id: 'compras_nc', label: 'Notas de Credito' },{ id: 'compras_retencion', label: 'Retenciones Emitidas' }].map(sub => {
                    const isActive = activePageId === 'compras' && comprasInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setComprasInitialSubTab(sub.id); setActivePageId('compras'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {activeModules.gastos_creditos && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'gastos_creditos' ? null : 'gastos_creditos'); setGastosInitialSubTab('resumen'); setActivePageId('gastos_creditos'); }} className={navBtnClass(activePageId === 'gastos_creditos')}>
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard size={16} className={iconClass(activePageId === 'gastos_creditos')} />
                  {isSidebarOpen && <span>Finanzas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'gastos_creditos' ? 'rotate-180' : ''} text-[#333333]`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'gastos_creditos' && (
                <div className={menuBorderClass}>
                  {[{ id: 'resumen', label: 'Resumen Financiero' },{ id: 'pasivos', label: 'Pasivos y Financiamiento' },{ id: 'historial_gastos', label: 'Historial de Egresos' }].map(sub => {
                    const isActive = activePageId === 'gastos_creditos' && gastosInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setGastosInitialSubTab(sub.id); setActivePageId('gastos_creditos'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {activeModules.inventario && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'inventario' ? null : 'inventario'); setInventarioInitialSubTab('productos'); setActivePageId('inventario'); }} className={navBtnClass(activePageId === 'inventario')}>
                <div className="flex items-center gap-3 flex-1">
                  <Package size={16} className={iconClass(activePageId === 'inventario')} />
                  {isSidebarOpen && <span>Inventarios</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'inventario' ? 'rotate-180' : ''} text-[#333333]`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'inventario' && (
                <div className={menuBorderClass}>
                  {[{ id: 'productos', label: 'Catalogo de Productos' },{ id: 'categorias', label: 'Categorias y Marcas' },{ id: 'kardex', label: 'Movimientos Kardex' },{ id: 'transferencias', label: 'Transferencias' },{ id: 'ajustes', label: 'Ajustes de Inventario' }].map(sub => {
                    const isActive = activePageId === 'inventario' && inventarioInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setInventarioInitialSubTab(sub.id); setActivePageId('inventario'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {activeModules.finances && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'finances' ? null : 'finances'); setContabilidadInitialSubTab('dashboard'); setActivePageId('finances'); }} className={navBtnClass(activePageId === 'finances')}>
                <div className="flex items-center gap-3 flex-1">
                  <DollarSign size={16} className={iconClass(activePageId === 'finances')} />
                  {isSidebarOpen && <span>Contabilidad</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'finances' ? 'rotate-180' : ''} text-[#333333]`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'finances' && (
                <div className={menuBorderClass}>
                  {[{ id: 'dashboard', label: 'Resumen' },{ id: 'sri_docs', label: 'Documentos SRI' },{ id: 'cxc', label: 'Cuentas por Cobrar' },{ id: 'cxp', label: 'Cuentas por Pagar' },{ id: 'gastos_creditos_sub', label: 'Gastos y Creditos' },{ id: 'reports', label: 'Reportes Financieros' }].map(sub => {
                    const isActive = activePageId === 'finances' && contabilidadInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setContabilidadInitialSubTab(sub.id); setActivePageId('finances'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {activeModules.personas && (
            <div className="space-y-0.5">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'personas_menu' ? null : 'personas_menu'); setPersonasSubTab('cliente'); setActivePageId('personas'); }} className={navBtnClass(activePageId === 'personas' || activePageId === 'team')}>
                <div className="flex items-center gap-3 flex-1">
                  <Users size={16} className={iconClass(activePageId === 'personas' || activePageId === 'team')} />
                  {isSidebarOpen && <span>Personas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'personas_menu' ? 'rotate-180' : ''} text-[#333333]`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'personas_menu' && (
                <div className={menuBorderClass}>
                  {[{ id: 'cliente', label: 'Clientes' },{ id: 'proveedor', label: 'Proveedores' },{ id: 'team', label: 'Equipo' }].map(sub => {
                    const isActive = sub.id === 'team' ? activePageId === 'team' : (activePageId === 'personas' && personasSubTab === sub.id);
                    return <button key={sub.id} onClick={() => { if (sub.id === 'team') { setActivePageId('team'); } else { setActivePageId('personas'); setPersonasSubTab(sub.id); } closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-0.5">
            <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'proyectos_menu' ? null : 'proyectos_menu'); setActivePageId('proyectos_general'); }} className={navBtnClass(isProyectosActive)}>
              <div className="flex items-center gap-3 flex-1">
                <Briefcase size={16} className={iconClass(isProyectosActive)} />
                {isSidebarOpen && <span>Proyectos</span>}
              </div>
              {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'proyectos_menu' ? 'rotate-180' : ''} text-[#333333]`} />}
            </button>
            {isSidebarOpen && expandedSidebarMenu === 'proyectos_menu' && (
              <div className={menuBorderClass}>
                {[{ id: 'proyectos_general', label: 'Mis Proyectos' },{ id: 'paginas_general', label: 'Paginas' },{ id: 'calendar', label: 'Calendario' }].map(sub => {
                  const isActive = activePageId === sub.id;
                  return <button key={sub.id} onClick={() => { setActivePageId(sub.id); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                })}
              </div>
            )}
          </div>

          <button onClick={() => { setActivePageId('general_settings'); closeMobile(); }} className={navBtnClass(activePageId === 'general_settings')}>
            <Settings size={16} className={iconClass(activePageId === 'general_settings')} />
            {isSidebarOpen && <span>Ajustes</span>}
          </button>

          <div className="space-y-0.5">
            <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'billing' ? null : 'billing'); setBillingInitialSubTab('planes'); setActivePageId('billing'); }} className={navBtnClass(activePageId === 'billing')}>
              <div className="flex items-center gap-3 flex-1">
                <CreditCard size={16} className={iconClass(activePageId === 'billing')} />
                {isSidebarOpen && <span>Suscripcion</span>}
              </div>
              {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'billing' ? 'rotate-180' : ''} text-[#333333]`} />}
            </button>
            {isSidebarOpen && expandedSidebarMenu === 'billing' && (
              <div className={menuBorderClass}>
                {[{ id: 'facturacion', label: 'Facturacion Electronica' },{ id: 'paginas', label: 'Paginas Web' },{ id: 'correos', label: 'Correos Corporativos' },{ id: 'whatsapp', label: 'WhatsApp CRM' },{ id: 'pagos', label: 'Historial de Pagos' }].map(sub => {
                  const isActive = activePageId === 'billing' && (sub.id === 'pagos' ? (billingInitialSubTab === 'pagos' || billingInitialSubTab === 'historial') : billingInitialSubTab === sub.id);
                  return <button key={sub.id} onClick={() => { setBillingInitialSubTab(sub.id); setActivePageId('billing'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-2.5 border-t border-[#E6EBF1] space-y-1">
          <button onClick={() => { setActivePageId('soporte_tecnico'); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-[12px] rounded-md transition-all font-medium ${activePageId === 'soporte_tecnico' ? 'bg-[color-mix(in_srgb,var(--primary-color)_8%,transparent)] text-[var(--primary-color)]' : 'text-[#333333] hover:bg-[#F6F9FC] hover:text-black'}`}>
            <LifeBuoy size={14} className={activePageId === 'soporte_tecnico' ? 'text-[var(--primary-color)]' : 'text-[#333333]'} />
            {isSidebarOpen && <span>Soporte Tecnico</span>}
          </button>
          <button onClick={() => { setActivePageId('trash'); closeMobile(); }} className={`flex items-center justify-between w-full px-2.5 py-2 text-[12px] rounded-md transition-all font-medium ${activePageId === 'trash' ? 'bg-[#FFF0F0] text-[#CD2B31]' : 'text-[#333333] hover:bg-[#F6F9FC] hover:text-black'}`}>
            <div className="flex items-center gap-2.5">
              <Trash2 size={14} className={activePageId === 'trash' ? 'text-[#CD2B31]' : 'text-[#333333]'} />
              {isSidebarOpen && <span>Papelera</span>}
            </div>
            {isSidebarOpen && trash.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F2F4F7] text-[#425466] font-medium">{trash.length}</span>}
          </button>
          <button onClick={() => { handleLogout(); closeMobile(); }} className="mt-1 flex items-center gap-2.5 w-full px-2.5 py-2 text-[12px] rounded-md transition-all font-medium text-[#333333] hover:bg-[#F6F9FC] hover:text-black">
            <LogOut size={14} />{isSidebarOpen && <span>Cerrar Sesion</span>}
          </button>
        </div>
      </div>
    </>
  );
}
