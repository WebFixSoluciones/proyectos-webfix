import { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, Package, Users, CalendarDays, Settings
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

export default function ErpDashboard({ setActivePageId, setVentasInitialSubTab, db, appId }) {
  const [settings, setSettings] = useState(null);

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

  const companyName = settings?.nombreComercial || settings?.razonSocial || 'Mi Empresa';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full px-4 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        
        {/* Bienvenido + Nombre Empresa */}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-heading mb-8">
          Bienvenido, <span className="text-primary font-semibold">{companyName}</span>
        </h1>

        {/* Grid de 6 accesos directos: 3 arriba, 3 abajo */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full mb-8">
          
          {/* Item 1: POS */}
          <button 
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-md bg-white border border-border-default hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <ShoppingCart size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Punto de Venta
            </span>
          </button>

          {/* Item 2: Facturas SRI */}
          <button 
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-md bg-white border border-border-default hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <FileText size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Facturación
            </span>
          </button>

          {/* Item 3: Inventario */}
          <button 
            onClick={() => setActivePageId('inventario')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-md bg-white border border-border-default hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <Package size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Inventario
            </span>
          </button>

          {/* Item 4: Personas */}
          <button 
            onClick={() => setActivePageId('personas')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-md bg-white border border-border-default hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <Users size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Clientes / Prov
            </span>
          </button>

          {/* Item 5: Calendario */}
          <button 
            onClick={() => setActivePageId('calendar')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-md bg-white border border-border-default hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <CalendarDays size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Calendario
            </span>
          </button>

          {/* Item 6: Ajustes */}
          <button 
            onClick={() => setActivePageId('general_settings')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-md bg-white border border-border-default hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <Settings size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Ajustes
            </span>
          </button>

        </div>

        {/* Indicador Conexión SRI */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6FDF9] border border-[#A2F2E4] text-[#008F73] text-[11px] font-medium tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E4B8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E4B8]"></span>
          </span>
          <span>Conexión SRI Activa</span>
        </div>

      </div>
    </div>
  );
}
