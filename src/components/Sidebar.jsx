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
  inventarioInitialSubTab, setInventarioInitialSubTab,
 contabilidadInitialSubTab, setContabilidadInitialSubTab,
 billingInitialSubTab, setBillingInitialSubTab,
 personasSubTab, setPersonasSubTab,
 isProyectosActive, trash, handleLogout
}) {
 const closeMobile = () => { if(window.innerWidth < 768) setIsSidebarOpen(false); };

 const navBase ="group flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all text-base font-medium";
 const navActive ="bg-primary-light text-primary";
 const navInactive ="text-text-primary hover:bg-surface-bg hover:text-black";
 const navBtnClass = (isActive) =>`${navBase} ${isActive ? navActive : navInactive}`;

 const iconClass = (isActive) =>`shrink-0 transition-colors ${isActive ?'text-primary' :'text-text-secondary group-hover:text-black'}`;

 const subBase ="block w-full text-left py-1.5 px-3 rounded-md text-sm font-medium transition-all";
 const subActive ="text-primary bg-primary-light";
 const subInactive ="text-text-secondary hover:text-black hover:bg-surface-bg";
 const subItemClass = (isActive) =>`${subBase} ${isActive ? subActive : subInactive}`;

 const menuBorderClass ="pl-9 pr-2 space-y-0.5 border-l border-border-default ml-5 mt-1 select-none";

 return (
 <>
 {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-200" onClick={() => setIsSidebarOpen(false)} />}
 
 <div className={`flex flex-col border-r border-border-default bg-white transition-all duration-300 z-50 absolute md:relative h-full ${isSidebarOpen ?'translate-x-0 w-[80vw] max-w-60' :'-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'}`}>
 
 <div className={`h-14 flex items-center ${isSidebarOpen ?'justify-between px-4' :'justify-center'} border-b border-border-default shrink-0 overflow-hidden`}>
 {isSidebarOpen ? (
 <div className="flex items-center gap-2.5">
 {companyProfile?.logoUrl ? (
 <img src={companyProfile.logoUrl} alt="Logo" className="max-h-8 object-contain rounded" />
 ) : (
 <span className="text-md font-semibold text-text-primary tracking-tight">
 {companyProfile?.nombreComercial || companyProfile?.razonSocial ||'WebFix'}
 </span>
 )}
 </div>
 ) : (
 companyProfile?.logoUrl ? (
 <img src={companyProfile.logoUrl} alt="Logo" className="w-7 h-7 rounded object-contain" />
 ) : (
 <div className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center font-semibold text-xs">
 {String(companyProfile?.nombreComercial || companyProfile?.razonSocial ||'W').charAt(0).toUpperCase()}
 </div>
 )
 )}
 </div>

 <div className="flex-1 overflow-y-auto px-2.5 space-y-1 py-2 custom-scrollbar">
 
 <button onClick={() => { setActivePageId('dashboard'); closeMobile(); }} className={navBtnClass(activePageId ==='dashboard')}>
 <LayoutDashboard size={16} className={iconClass(activePageId ==='dashboard')} />
 {isSidebarOpen && <span>Mi espacio</span>}
 </button>

 {activeModules.ventas && (
 <div className="space-y-0.5">
 <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu ==='ventas' ? null :'ventas'); setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }} className={navBtnClass(activePageId ==='ventas')}>
 <div className="flex items-center gap-3 flex-1">
 <ShoppingCart size={16} className={iconClass(activePageId ==='ventas')} />
 {isSidebarOpen && <span>Ventas</span>}
 </div>
 {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu ==='ventas' ?'rotate-180' :''} text-text-secondary`} />}
 </button>
 {isSidebarOpen && expandedSidebarMenu ==='ventas' && (
 <div className={menuBorderClass}>
 {[{ id:'resumen_ventas', label:'Historial de Ventas' },{ id:'ventas_preventa', label:'Registrar Venta' },{ id:'pos', label:'Punto de Venta (POS)' },{ id:'preventas', label:'Preventas' },{ id:'quotes', label:'Cotizaciones' },{ id:'nota_credito', label:'Notas de Credito' },{ id:'retencion', label:'Retenciones de Venta' },{ id:'discounts', label:'Descuentos y Promos' }].map(sub => {
 const isActive = activePageId ==='ventas' && (
    sub.id ==='pos' ? (ventasInitialSubTab && String(ventasInitialSubTab).startsWith('pos')) : 
    sub.id ==='ventas_preventa' ? (ventasInitialSubTab && String(ventasInitialSubTab).startsWith('ventas_preventa')) : 
    ventasInitialSubTab === sub.id
  );
  return (
    <button 
      key={sub.id} 
      onClick={() => { 
        const targetId = sub.id === 'ventas_preventa' ? `ventas_preventa_${Date.now()}` : sub.id;
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
          <ShoppingBag size={16} className={iconClass(activePageId === 'compras')} />
          {isSidebarOpen && <span>Compras</span>}
        </div>
        {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu === 'compras' ? 'rotate-180' : ''} text-text-secondary`} />}
      </button>
      {isSidebarOpen && expandedSidebarMenu === 'compras' && (
        <div className={menuBorderClass}>
          {[
            { id: 'compras_resumen', label: 'Historial de Compras' },
            { id: 'compras_preventa', label: 'Registrar Compra' },
            { id: 'compras_nc', label: 'Notas de Credito Recibidas' },
            { id: 'compras_nd', label: 'Notas de Debito Recibidas' },
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

 {activeModules.inventario && (
 <div className="space-y-0.5">
 <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu ==='inventario' ? null :'inventario'); setInventarioInitialSubTab('productos'); setActivePageId('inventario'); }} className={navBtnClass(activePageId ==='inventario')}>
 <div className="flex items-center gap-3 flex-1">
 <Package size={16} className={iconClass(activePageId ==='inventario')} />
 {isSidebarOpen && <span>Inventarios</span>}
 </div>
 {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu ==='inventario' ?'rotate-180' :''} text-text-secondary`} />}
 </button>
 {isSidebarOpen && expandedSidebarMenu ==='inventario' && (
 <div className={menuBorderClass}>
 {[{ id:'productos', label:'Catalogo de Productos' },{ id:'categorias', label:'Categorias y Marcas' },{ id:'kardex', label:'Movimientos Kardex' },{ id:'transferencias', label:'Transferencias' },{ id:'ajustes', label:'Ajustes de Inventario' }].map(sub => {
 const isActive = activePageId ==='inventario' && inventarioInitialSubTab === sub.id;
 return <button key={sub.id} onClick={() => { setInventarioInitialSubTab(sub.id); setActivePageId('inventario'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
 })}
 </div>
 )}
 </div>
 )}

 {(activeModules.finances || activeModules.compras || activeModules.gastos_creditos) && (
 <div className="space-y-0.5">
 <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu ==='finances' ? null :'finances'); setContabilidadInitialSubTab('dashboard'); setActivePageId('finances'); }} className={navBtnClass(activePageId ==='finances')}>
 <div className="flex items-center gap-3 flex-1">
 <DollarSign size={16} className={iconClass(activePageId ==='finances')} />
 {isSidebarOpen && <span>Control Financiero</span>}
 </div>
 {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu ==='finances' ?'rotate-180' :''} text-text-secondary`} />}
 </button>
 {isSidebarOpen && expandedSidebarMenu ==='finances' && (
 <div className={menuBorderClass}>
 {[{ id:'dashboard', label:'Resumen financiero' },{ id:'movimientos', label:'Movimientos' },{ id:'cxc', label:'Cuentas por cobrar' },{ id:'cxp', label:'Cuentas por pagar' },{ id:'bancos_caja', label:'Bancos y Caja' },{ id:'tarjetas_creditos', label:'Tarjetas y créditos' },{ id:'captura_inteligente', label:'Captura inteligente' },{ id:'contabilidad', label:'Contabilidad' },{ id:'impuestos_sri', label:'Impuestos y SRI' },{ id:'reports', label:'Reportes' }].map(sub => {
 const isActive = activePageId ==='finances' && contabilidadInitialSubTab === sub.id;
 return <button key={sub.id} onClick={() => { setContabilidadInitialSubTab(sub.id); setActivePageId('finances'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
 })}
 </div>
 )}
 </div>
 )}

 {activeModules.personas && (
 <div className="space-y-0.5">
 <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu ==='personas_menu' ? null :'personas_menu'); setPersonasSubTab('cliente'); setActivePageId('personas'); }} className={navBtnClass(activePageId ==='personas' || activePageId ==='team')}>
 <div className="flex items-center gap-3 flex-1">
 <Users size={16} className={iconClass(activePageId ==='personas' || activePageId ==='team')} />
 {isSidebarOpen && <span>Personas</span>}
 </div>
 {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu ==='personas_menu' ?'rotate-180' :''} text-text-secondary`} />}
 </button>
 {isSidebarOpen && expandedSidebarMenu ==='personas_menu' && (
 <div className={menuBorderClass}>
 {[{ id:'cliente', label:'Clientes' },{ id:'proveedor', label:'Proveedores' },{ id:'team', label:'Equipo' }].map(sub => {
 const isActive = sub.id ==='team' ? activePageId ==='team' : (activePageId ==='personas' && personasSubTab === sub.id);
 return <button key={sub.id} onClick={() => { if (sub.id ==='team') { setActivePageId('team'); } else { setActivePageId('personas'); setPersonasSubTab(sub.id); } closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
 })}
 </div>
 )}
 </div>
 )}

 <div className="space-y-0.5">
 <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu ==='proyectos_menu' ? null :'proyectos_menu'); setActivePageId('proyectos_general'); }} className={navBtnClass(isProyectosActive)}>
 <div className="flex items-center gap-3 flex-1">
 <Briefcase size={16} className={iconClass(isProyectosActive)} />
 {isSidebarOpen && <span>Proyectos</span>}
 </div>
 {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu ==='proyectos_menu' ?'rotate-180' :''} text-text-secondary`} />}
 </button>
 {isSidebarOpen && expandedSidebarMenu ==='proyectos_menu' && (
 <div className={menuBorderClass}>
 {[{ id:'proyectos_general', label:'Mis Proyectos' },{ id:'paginas_general', label:'Paginas' },{ id:'calendar', label:'Calendario' }].map(sub => {
 const isActive = activePageId === sub.id;
 return <button key={sub.id} onClick={() => { setActivePageId(sub.id); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
 })}
 </div>
 )}
 </div>

 <button onClick={() => { setActivePageId('general_settings'); closeMobile(); }} className={navBtnClass(activePageId ==='general_settings')}>
 <Settings size={16} className={iconClass(activePageId ==='general_settings')} />
 {isSidebarOpen && <span>Ajustes</span>}
 </button>

 <div className="space-y-0.5">
 <button onClick={() => { setExpandedSidebarMenu(expandedSidebarMenu ==='billing' ? null :'billing'); setBillingInitialSubTab('planes'); setActivePageId('billing'); }} className={navBtnClass(activePageId ==='billing')}>
 <div className="flex items-center gap-3 flex-1">
 <CreditCard size={16} className={iconClass(activePageId ==='billing')} />
 {isSidebarOpen && <span>Suscripcion</span>}
 </div>
 {isSidebarOpen && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expandedSidebarMenu ==='billing' ?'rotate-180' :''} text-text-secondary`} />}
 </button>
 {isSidebarOpen && expandedSidebarMenu ==='billing' && (
 <div className={menuBorderClass}>
 {[{ id:'facturacion', label:'Facturacion Electronica' },{ id:'paginas', label:'Paginas Web' },{ id:'correos', label:'Correos Corporativos' },{ id:'whatsapp', label:'WhatsApp CRM' },{ id:'pagos', label:'Historial de Pagos' }].map(sub => {
 const isActive = activePageId ==='billing' && (sub.id ==='pagos' ? (billingInitialSubTab ==='pagos' || billingInitialSubTab ==='historial') : billingInitialSubTab === sub.id);
 return <button key={sub.id} onClick={() => { setBillingInitialSubTab(sub.id); setActivePageId('billing'); closeMobile(); }} className={subItemClass(isActive)}>{sub.label}</button>;
 })}
 </div>
 )}
 </div>
 </div>

 <div className="p-2.5 border-t border-border-default space-y-1">
 <button onClick={() => { setActivePageId('soporte_tecnico'); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-sm rounded-md transition-all font-medium ${activePageId ==='soporte_tecnico' ?'bg-primary-light text-primary' :'text-text-secondary hover:bg-surface-bg hover:text-black'}`}>
 <LifeBuoy size={14} className={activePageId ==='soporte_tecnico' ?'text-primary' :'text-text-secondary'} />
 {isSidebarOpen && <span>Soporte Tecnico</span>}
 </button>
 <button onClick={() => { setActivePageId('trash'); closeMobile(); }} className={`flex items-center justify-between w-full px-2.5 py-2 text-sm rounded-md transition-all font-medium ${activePageId ==='trash' ?'bg-error-light text-error' :'text-text-secondary hover:bg-surface-bg hover:text-black'}`}>
 <div className="flex items-center gap-2.5">
 <Trash2 size={14} className={activePageId ==='trash' ?'text-error' :'text-text-secondary'} />
 {isSidebarOpen && <span>Papelera</span>}
 </div>
 {isSidebarOpen && trash.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-sidebar text-text-secondary font-medium">{trash.length}</span>}
 </button>
 <button onClick={() => { handleLogout(); closeMobile(); }} className="mt-1 flex items-center gap-2.5 w-full px-2.5 py-2 text-sm rounded-md transition-all font-medium text-text-secondary hover:bg-surface-bg hover:text-black">
 <LogOut size={14} />{isSidebarOpen && <span>Cerrar Sesion</span>}
 </button>
 </div>
 </div>
 </>
 );
}
