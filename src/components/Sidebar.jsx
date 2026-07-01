import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, CreditCard, 
  Package, DollarSign, Users, Briefcase, Settings,
  ChevronDown, LifeBuoy, Trash2, LogOut
} from 'lucide-react';

export default function Sidebar({
  isDarkMode,
  isSidebarOpen,
  setIsSidebarOpen,
  activePageId,
  setActivePageId,
  companyProfile,
  activeModules,
  expandedSidebarMenu,
  setExpandedSidebarMenu,
  ventasInitialSubTab,
  setVentasInitialSubTab,
  comprasInitialSubTab,
  setComprasInitialSubTab,
  gastosInitialSubTab,
  setGastosInitialSubTab,
  inventarioInitialSubTab,
  setInventarioInitialSubTab,
  contabilidadInitialSubTab,
  setContabilidadInitialSubTab,
  billingInitialSubTab,
  setBillingInitialSubTab,
  personasSubTab,
  setPersonasSubTab,
  isProyectosActive,
  trash,
  handleLogout
}) {
  const closeMobile = () => { if(window.innerWidth < 768) setIsSidebarOpen(false); };

  const navBtnClass = (isActive) => `group flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
    isActive
      ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
      : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
  }`;

  const iconClass = (isActive) => `transition-colors ${isActive ? 'text-primary' : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')}`;

  const subItemClass = (isActive) => `block w-full text-left py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
    isActive 
      ? (isDarkMode ? 'text-primary bg-primary/15' : 'text-primary bg-primary-light')
      : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-black hover:bg-black/5')
  }`;

  return (
    <>
      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <div className={`flex flex-col border-r transition-all duration-300 z-50 backdrop-blur-3xl absolute md:relative h-full ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'} ${isDarkMode ? 'bg-[#0f0f11]/95 border-white/5' : 'bg-[#ffffff] border-gray-200'}`}>
        
        {/* Logo Header */}
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'justify-between px-5' : 'justify-center'} border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'} mb-2 shrink-0 overflow-hidden`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              {companyProfile?.logoUrl ? (
                <img src={companyProfile.logoUrl} alt="Logo" className="max-h-9 object-contain" />
              ) : (
                <span className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                  {companyProfile?.nombreComercial || companyProfile?.razonSocial || 'WebFix ERP'}
                </span>
              )}
            </div>
          ) : (
            companyProfile?.logoUrl ? (
              <img src={companyProfile.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isDarkMode ? 'bg-white/10 text-white' : 'bg-primary text-white shadow-sm'}`}>
                {String(companyProfile?.nombreComercial || companyProfile?.razonSocial || 'W').charAt(0).toUpperCase()}
              </div>
            )
          )}
        </div>

        {/* Main Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-2 custom-scrollbar text-xs md:text-sm">
          {/* 1. Dashboard */}
          <button onClick={() => { setActivePageId('dashboard'); closeMobile(); }} title="Dashboard" className={navBtnClass(activePageId === 'dashboard')}>
            <LayoutDashboard size={18} className={iconClass(activePageId === 'dashboard')} />
            {isSidebarOpen && <span>Mi espacio</span>}
          </button>

          {/* 2. Ventas */}
          {activeModules.ventas && (
            <div className="space-y-1">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'ventas' ? null : 'ventas'); setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }} title="Ventas" className={navBtnClass(activePageId === 'ventas')}>
                <div className="flex items-center gap-3">
                  <ShoppingCart size={18} className={iconClass(activePageId === 'ventas')} />
                  {isSidebarOpen && <span>Ventas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'ventas' ? 'rotate-180' : ''}`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'ventas' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[{ id: 'resumen_ventas', label: 'Historial de Ventas' },{ id: 'ventas_preventa', label: 'Registrar Venta' },{ id: 'pos', label: 'Punto de Venta (POS)' },{ id: 'preventas', label: 'Preventas' },{ id: 'quotes', label: 'Cotizaciones' },{ id: 'nota_credito', label: 'Notas de Crédito' },{ id: 'retencion', label: 'Retenciones de Venta' }].map(sub => {
                    const isActive = activePageId === 'ventas' && (sub.id === 'pos' ? (ventasInitialSubTab && ventasInitialSubTab.startsWith('pos')) : ventasInitialSubTab === sub.id);
                    return <button key={sub.id} onClick={() => { setVentasInitialSubTab(sub.id); setActivePageId('ventas'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Compras */}
          {activeModules.compras && (
            <div className="space-y-1">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'compras' ? null : 'compras'); setComprasInitialSubTab('compras_resumen'); setActivePageId('compras'); }} title="Compras" className={navBtnClass(activePageId === 'compras')}>
                <div className="flex items-center gap-3">
                  <ShoppingBag size={18} className={iconClass(activePageId === 'compras')} />
                  {isSidebarOpen && <span>Compras</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'compras' ? 'rotate-180' : ''}`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'compras' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[{ id: 'compras_resumen', label: 'Historial de Compras' },{ id: 'compras_sri', label: 'Facturas Recibidas SRI' },{ id: 'compras_gastos', label: 'Gastos con IA' },{ id: 'compras_nc', label: 'Notas de Crédito' },{ id: 'compras_retencion', label: 'Retenciones Emitidas' }].map(sub => {
                    const isActive = activePageId === 'compras' && comprasInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setComprasInitialSubTab(sub.id); setActivePageId('compras'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Finanzas */}
          {activeModules.gastos_creditos && (
            <div className="space-y-1">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'gastos_creditos' ? null : 'gastos_creditos'); setGastosInitialSubTab('resumen'); setActivePageId('gastos_creditos'); }} title="Finanzas" className={navBtnClass(activePageId === 'gastos_creditos')}>
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className={iconClass(activePageId === 'gastos_creditos')} />
                  {isSidebarOpen && <span>Finanzas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'gastos_creditos' ? 'rotate-180' : ''}`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'gastos_creditos' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[{ id: 'resumen', label: 'Resumen Financiero' },{ id: 'pasivos', label: 'Pasivos y Financiamiento' },{ id: 'historial_gastos', label: 'Historial de Egresos' }].map(sub => {
                    const isActive = activePageId === 'gastos_creditos' && gastosInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setGastosInitialSubTab(sub.id); setActivePageId('gastos_creditos'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. Inventarios */}
          {activeModules.inventario && (
            <div className="space-y-1">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'inventario' ? null : 'inventario'); setInventarioInitialSubTab('productos'); setActivePageId('inventario'); }} title="Inventarios" className={navBtnClass(activePageId === 'inventario')}>
                <div className="flex items-center gap-3">
                  <Package size={18} className={iconClass(activePageId === 'inventario')} />
                  {isSidebarOpen && <span>Inventarios</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'inventario' ? 'rotate-180' : ''}`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'inventario' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[{ id: 'productos', label: 'Catálogo de Productos' },{ id: 'categorias', label: 'Categorías y Marcas' },{ id: 'kardex', label: 'Movimientos Kardex' },{ id: 'transferencias', label: 'Transferencias' },{ id: 'ajustes', label: 'Ajustes de Inventario' }].map(sub => {
                    const isActive = activePageId === 'inventario' && inventarioInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setInventarioInitialSubTab(sub.id); setActivePageId('inventario'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 6. Contabilidad */}
          {activeModules.finances && (
            <div className="space-y-1">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'finances' ? null : 'finances'); setContabilidadInitialSubTab('dashboard'); setActivePageId('finances'); }} title="Contabilidad" className={navBtnClass(activePageId === 'finances')}>
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className={iconClass(activePageId === 'finances')} />
                  {isSidebarOpen && <span>Contabilidad</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'finances' ? 'rotate-180' : ''}`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'finances' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[{ id: 'dashboard', label: 'Resumen' },{ id: 'sri_docs', label: 'Documentos SRI' },{ id: 'cxc', label: 'Cuentas por Cobrar' },{ id: 'cxp', label: 'Cuentas por Pagar' },{ id: 'gastos_creditos_sub', label: 'Gastos y Créditos' },{ id: 'reports', label: 'Reportes Financieros' }].map(sub => {
                    const isActive = activePageId === 'finances' && contabilidadInitialSubTab === sub.id;
                    return <button key={sub.id} onClick={() => { setContabilidadInitialSubTab(sub.id); setActivePageId('finances'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 7. Personas */}
          {activeModules.personas && (
            <div className="space-y-1">
              <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'personas_menu' ? null : 'personas_menu'); setPersonasSubTab('cliente'); setActivePageId('personas'); }} title="Personas" className={navBtnClass(activePageId === 'personas' || activePageId === 'team')}>
                <div className="flex items-center gap-3">
                  <Users size={18} className={iconClass(activePageId === 'personas' || activePageId === 'team')} />
                  {isSidebarOpen && <span>Personas</span>}
                </div>
                {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'personas_menu' ? 'rotate-180' : ''}`} />}
              </button>
              {isSidebarOpen && expandedSidebarMenu === 'personas_menu' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[{ id: 'cliente', label: 'Clientes' },{ id: 'proveedor', label: 'Proveedores' },{ id: 'team', label: 'Equipo' }].map(sub => {
                    const isActive = sub.id === 'team' ? activePageId === 'team' : (activePageId === 'personas' && personasSubTab === sub.id);
                    return <button key={sub.id} onClick={() => { if (sub.id === 'team') { setActivePageId('team'); } else { setActivePageId('personas'); setPersonasSubTab(sub.id); } closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* 8. Proyectos */}
          <div className="space-y-1">
            <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'proyectos_menu' ? null : 'proyectos_menu'); setActivePageId('proyectos_general'); }} title="Proyectos" className={navBtnClass(isProyectosActive)}>
              <div className="flex items-center gap-3">
                <Briefcase size={18} className={iconClass(isProyectosActive)} />
                {isSidebarOpen && <span>Proyectos</span>}
              </div>
              {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'proyectos_menu' ? 'rotate-180' : ''}`} />}
            </button>
            {isSidebarOpen && expandedSidebarMenu === 'proyectos_menu' && (
              <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                {[{ id: 'proyectos_general', label: 'Mis Proyectos' },{ id: 'paginas_general', label: 'Paginas' },{ id: 'calendar', label: 'Calendario' }].map(sub => {
                  const isActive = activePageId === sub.id;
                  return <button key={sub.id} onClick={() => { setActivePageId(sub.id); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                })}
              </div>
            )}
          </div>

          {/* 9. Ajustes */}
          <button onClick={() => { setActivePageId('general_settings'); closeMobile(); }} title="Ajustes" className={navBtnClass(activePageId === 'general_settings')}>
            <Settings size={18} className={iconClass(activePageId === 'general_settings')} />
            {isSidebarOpen && <span>Ajustes</span>}
          </button>

          {/* 10. Suscripción */}
          <div className="space-y-1">
            <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu === 'billing' ? null : 'billing'); setBillingInitialSubTab('planes'); setActivePageId('billing'); }} title="Suscripción" className={navBtnClass(activePageId === 'billing')}>
              <div className="flex items-center gap-3">
                <CreditCard size={18} className={iconClass(activePageId === 'billing')} />
                {isSidebarOpen && <span>Suscripción</span>}
              </div>
              {isSidebarOpen && <ChevronDown size={14} className={`transition-transform duration-250 ${expandedSidebarMenu === 'billing' ? 'rotate-180' : ''}`} />}
            </button>
            {isSidebarOpen && expandedSidebarMenu === 'billing' && (
              <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                {[{ id: 'facturacion', label: 'Facturación Electrónica' },{ id: 'paginas', label: 'Páginas Web' },{ id: 'correos', label: 'Correos Corporativos' },{ id: 'whatsapp', label: 'WhatsApp CRM' },{ id: 'pagos', label: 'Historial de Pagos' }].map(sub => {
                  const isActive = activePageId === 'billing' && (sub.id === 'pagos' ? (billingInitialSubTab === 'pagos' || billingInitialSubTab === 'historial') : billingInitialSubTab === sub.id);
                  return <button key={sub.id} onClick={() => { setBillingInitialSubTab(sub.id); setActivePageId('billing'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Area */}
        <div className={`p-3 border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'} space-y-1`}>
          <button onClick={() => { setActivePageId('soporte_tecnico'); closeMobile(); }} title="Soporte Técnico" className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-all ${activePageId === 'soporte_tecnico' ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm font-semibold' : 'bg-primary-light text-gray-900 border border-primary/15 font-semibold') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 font-light' : 'text-black hover:bg-[#f3f8ff] font-light')}`}>
            <LifeBuoy size={14} className={activePageId === 'soporte_tecnico' ? 'text-primary' : (isDarkMode ? 'text-gray-500' : 'text-black')} />
            {isSidebarOpen && <span>Soporte Técnico</span>}
          </button>

          <button onClick={() => { setActivePageId('trash'); closeMobile(); }} title="Papelera" className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl transition-all ${activePageId === 'trash' ? (isDarkMode ? 'bg-red-500/10 text-red-400 font-medium' : 'bg-red-50 text-red-700 border border-red-200 font-semibold') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 font-light' : 'text-black hover:bg-[#f3f8ff] font-light')}`}>
            <div className="flex items-center gap-3">
              <Trash2 size={14} className={activePageId === 'trash' ? (isDarkMode ? 'text-red-400' : 'text-red-600') : 'text-gray-500'} />
              {isSidebarOpen && <span>Papelera</span>}
            </div>
            {isSidebarOpen && trash.length > 0 && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-black/10 text-gray-600'}`}>{trash.length}</span>}
          </button>
          
          <button onClick={() => { handleLogout(); closeMobile(); }} className={`mt-2 flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-colors font-light ${isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-black hover:bg-[#f3f8ff] hover:text-black'}`}>
            <LogOut size={14} />{isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </>
  );
}
