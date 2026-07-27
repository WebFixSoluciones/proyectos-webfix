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
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full px-4 animate-in fade-in duration-500">
      <div className="max-w-3xl w-full flex flex-col items-center text-center">
        
        {/* Bienvenido + Nombre Empresa */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-10">
          Bienvenido, <span className="text-primary font-bold">{companyName}</span>
        </h1>

        {/* Grid de 6 accesos directos: 3 arriba, 3 abajo */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl mb-12">
          
          {/* Item 1: POS */}
          <button 
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
            className="group flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-white border border-gray-200/85  hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="p-3 sm:p-4 rounded-xl mb-3 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
              <ShoppingCart size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-lg font-normal text-gray-700 tracking-wide text-center leading-tight">
              Punto de Venta
            </span>
          </button>

          {/* Item 2: Facturas SRI */}
          <button 
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
            className="group flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-white border border-gray-200/85  hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="p-3 sm:p-4 rounded-xl mb-3 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
              <FileText size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-lg font-normal text-gray-700 tracking-wide text-center leading-tight">
              Facturación
            </span>
          </button>

          {/* Item 3: Inventario */}
          <button 
            onClick={() => setActivePageId('inventario')}
            className="group flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-white border border-gray-200/85  hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="p-3 sm:p-4 rounded-xl mb-3 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
              <Package size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-lg font-normal text-gray-700 tracking-wide text-center leading-tight">
              Inventario
            </span>
          </button>

          {/* Item 4: Personas */}
          <button 
            onClick={() => setActivePageId('personas')}
            className="group flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-white border border-gray-200/85  hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="p-3 sm:p-4 rounded-xl mb-3 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
              <Users size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-lg font-normal text-gray-700 tracking-wide text-center leading-tight">
              Clientes / Prov
            </span>
          </button>

          {/* Item 5: Calendario */}
          <button 
            onClick={() => setActivePageId('calendar')}
            className="group flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-white border border-gray-200/85  hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="p-3 sm:p-4 rounded-xl mb-3 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
              <CalendarDays size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-lg font-normal text-gray-700 tracking-wide text-center leading-tight">
              Calendario
            </span>
          </button>

          {/* Item 6: Ajustes */}
          <button 
            onClick={() => setActivePageId('general_settings')}
            className="group flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-white border border-gray-200/85  hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="p-3 sm:p-4 rounded-xl mb-3 bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
              <Settings size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="text-lg font-normal text-gray-700 tracking-wide text-center leading-tight">
              Ajustes
            </span>
          </button>

        </div>

        {/* Indicador Conexión SRI */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 transition-all duration-300 hover:bg-emerald-100/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold tracking-wider uppercase">
            Conexión SRI Activa
          </span>
        </div>

      </div>
    </div>
  );
}
