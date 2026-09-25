import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Pencil, 
  SlidersHorizontal, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  UserCheck, 
  Receipt, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  ExternalLink,
  Users,
  ShieldCheck,
  CheckCircle2,
  Package,
  ShoppingCart,
  ShoppingBag
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import ShortcutCustomizerModal, { 
  AVAILABLE_SHORTCUTS, 
  DEFAULT_SHORTCUT_IDS 
} from './ShortcutCustomizerModal';

export default function ErpDashboard({ 
  setActivePageId, 
  setVentasInitialSubTab, 
  setComprasInitialSubTab,
  setInventarioInitialSubTab,
  setContabilidadInitialSubTab,
  setPersonasSubTab,
  showToast,
  transactions = [],
  thirdParties = [],
  products = [],
  companyProfile = null,
  usuario = null,
  db, 
  appId 
}) {
  const [settings, setSettings] = useState(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);

  // Close create menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setIsCreateMenuOpen(false);
      }
    };
    if (isCreateMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isCreateMenuOpen]);

  // Cargar accesos directos configurados o usar por defecto
  const [selectedShortcutIds, setSelectedShortcutIds] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_dashboard_shortcuts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading custom shortcuts from localStorage:', e);
    }
    return DEFAULT_SHORTCUT_IDS;
  });

  const handleSaveShortcuts = (newIds) => {
    setSelectedShortcutIds(newIds);
    try {
      localStorage.setItem('erp_dashboard_shortcuts', JSON.stringify(newIds));
    } catch (e) {
      console.error('Error saving custom shortcuts to localStorage:', e);
    }
  };

  useEffect(() => {
    if (!appId || !db) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');

    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      }
    }, (err) => {
      console.error("Error loading settings in ERP Dashboard:", err);
    });

    return () => {
      unsubSettings();
    };
  }, [appId, db]);

  const companyName = companyProfile?.nombreComercial || companyProfile?.razonSocial || settings?.nombreComercial || settings?.razonSocial || usuario?.displayName || 'WebFix';
  const shortGreetingName = companyName.split(' ')[0] || 'Web';

  // Resolver los accesos directos activos
  const activeShortcuts = useMemo(() => {
    const shortcutMap = new Map(AVAILABLE_SHORTCUTS.map(item => [item.id, item]));
    return selectedShortcutIds
      .map(id => shortcutMap.get(id))
      .filter(Boolean);
  }, [selectedShortcutIds]);

  const handleShortcutClick = (item) => {
    if (typeof item.action === 'function') {
      item.action({
        setActivePageId,
        setVentasInitialSubTab,
        setComprasInitialSubTab,
        setInventarioInitialSubTab,
        setContabilidadInitialSubTab,
        setPersonasSubTab
      });
    }
  };

  // --- WIDGET CALENDARIO BREVO ---
  const [calendarDate, setCalendarDate] = useState(new Date());

  const { monthName, yearNumber, calendarGrid } = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const startOffset = (firstDayIndex + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = [];
    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      grid.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false });
    }
    // Current month days
    const now = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = now.getDate() === i && now.getMonth() === month && now.getFullYear() === year;
      grid.push({ day: i, isCurrentMonth: true, isToday });
    }
    // Next month filler days to complete rows
    const remaining = (7 - (grid.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      grid.push({ day: i, isCurrentMonth: false, isToday: false });
    }

    return {
      monthName: monthNames[month],
      yearNumber: year,
      calendarGrid: grid
    };
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- CÁLCULO DE MÉTRICAS BREVO ---
  const totalClientes = useMemo(() => {
    return (thirdParties || []).filter(tp => !tp.type || tp.type === 'cliente' || tp.type === 'ambos').length;
  }, [thirdParties]);

  const facturasEmitidasMes = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return (transactions || []).filter(tx => {
      if (tx.type !== 'ingreso' && tx.type !== 'venta') return false;
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === curYear && txDate.getMonth() === curMonth;
    }).length;
  }, [transactions]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Row (Brevo Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hola, {shortGreetingName}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-full transition-colors cursor-pointer shadow-none"
            title="Personalizar accesos directos y widgets"
          >
            <SlidersHorizontal size={13} className="text-slate-500" />
            <span>Personalizar página</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVentasInitialSubTab(`ventas_nueva_${Date.now()}`);
              setActivePageId('ventas');
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1b1b1b] hover:bg-slate-800 rounded-full transition-colors cursor-pointer shadow-none"
            title="Registrar una nueva venta o factura SRI"
          >
            <Plus size={14} />
            <span>Nueva venta</span>
          </button>
        </div>
      </div>

      {/* Row 1: Calendar Widget + "Programado para hoy" (Brevo Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Mini Calendar Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-sm font-semibold text-slate-800 capitalize tracking-tight">
                {monthName} {yearNumber}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 text-center mb-2">
              {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => (
                <span key={d} className="text-[11px] font-medium text-slate-400">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-1.5 text-center">
              {calendarGrid.map((item, idx) => (
                <div key={idx} className="flex items-center justify-center py-0.5">
                  <span
                    className={`w-7 h-7 text-xs flex items-center justify-center rounded-full font-medium transition-colors ${
                      item.isToday
                        ? 'bg-[#1b1b1b] text-white font-bold'
                        : item.isCurrentMonth
                        ? 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                        : 'text-slate-300'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Programado para hoy / Flujo Rápido */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Programado para hoy
            </h2>

            {/* Create Dropdown */}
            <div className="relative" ref={createMenuRef}>
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1b1b1b] hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <span>Crear</span>
                <ChevronDown size={12} className={`transition-transform duration-150 ${isCreateMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCreateMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200/90 shadow-xl py-1.5 z-40 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setVentasInitialSubTab(`ventas_nueva_${Date.now()}`);
                      setActivePageId('ventas');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Receipt size={14} className="text-emerald-600" />
                    <span>Nueva Venta SRI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setComprasInitialSubTab(`compras_preventa_${Date.now()}`);
                      setActivePageId('compras');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag size={14} className="text-blue-600" />
                    <span>Registrar Compra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setPersonasSubTab('cliente');
                      setActivePageId('personas');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <UserCheck size={14} className="text-amber-600" />
                    <span>Nuevo Cliente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setInventarioInitialSubTab('productos');
                      setActivePageId('inventario');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Package size={14} className="text-purple-600" />
                    <span>Nuevo Producto</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="text-center py-2 text-xs font-medium text-slate-400">
            Nada programado para hoy
          </div>

          {/* Brevo Action Recommendation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            
            {/* Card 1 */}
            <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-full border border-emerald-400 text-emerald-600 flex items-center justify-center mb-3">
                  <Users size={16} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  ¿Tienes nuevos clientes que organizar?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Sincroniza RUC/Cédula con el SRI y administra cupos de crédito.
                </p>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setPersonasSubTab('cliente');
                    setActivePageId('personas');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Gestionar clientes</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-full border border-emerald-400 text-emerald-600 flex items-center justify-center mb-3">
                  <FileText size={16} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  Emite facturas electrónicas SRI en 1 clic
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Firma digital .p12 integrada y entrega automática por correo.
                </p>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setVentasInitialSubTab(`ventas_nueva_${Date.now()}`);
                    setActivePageId('ventas');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Registrar venta</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Row 2: "Tus contactos & ventas" + "Uso de tu plan" (Brevo Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left: Tus contactos & clientes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Tus contactos
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPersonasSubTab('cliente');
                  setActivePageId('personas');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
              >
                Añadir contactos
              </button>
            </div>

            <div className="space-y-3">
              {/* Stat 1 */}
              <div className="border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 leading-none">
                    {totalClientes}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Total de contactos registrados
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <UserCheck size={18} />
                </div>
              </div>

              {/* Stat 2 */}
              <div className="border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 leading-none">
                    {facturasEmitidasMes}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Nuevos comprobantes a lo largo del mes
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setPersonasSubTab('cliente');
                setActivePageId('personas');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Ir a Contactos
            </button>
          </div>
        </div>

        {/* Right: Uso de tu plan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Uso de tu plan
              </h2>
            </div>

            <div className="space-y-4">
              {/* Resource 1 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">Comprobantes SRI autorizados</span>
                  <span className="text-slate-500 font-medium">Ilimitados</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Sin costo por comprobante emitido
                </span>
              </div>

              {/* Resource 2 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">Firma Electrónica .p12</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Activa
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Ambiente SRI de producción autorizado y resguardado
                </span>
              </div>

              {/* Resource 3 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">Módulos ERP</span>
                  <span className="text-slate-500 font-medium">Sincronizados</span>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Ventas, Compras, Finanzas, Inventario y SRI en tiempo real
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setActivePageId('billing');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Gestionar tu plan
            </button>
          </div>
        </div>

      </div>

      {/* Row 3: Accesos Directos Personalizables (Brevo Card Style) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Accesos directos
          </h2>
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Editar accesos directos"
          >
            <Pencil size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {activeShortcuts.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleShortcutClick(item)}
                className="group flex flex-col text-left p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    style={{ backgroundColor: item.color || '#0b996e' }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"
                  >
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {item.title}
                  </span>
                </div>
                <span className="text-xs text-slate-500 line-clamp-1">
                  {item.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal para personalizar accesos directos */}
      <ShortcutCustomizerModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        currentShortcuts={selectedShortcutIds}
        onSaveShortcuts={handleSaveShortcuts}
        showToast={showToast}
      />
    </div>
  );
}
