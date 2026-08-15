import { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, Package, Users, CalendarDays, Settings
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

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
          <Card 
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer select-none"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <ShoppingCart size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Punto de Venta
            </span>
          </Card>

          {/* Item 2: Facturas SRI */}
          <Card 
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer select-none"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <FileText size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Facturación
            </span>
          </Card>

          {/* Item 3: Inventario */}
          <Card 
            onClick={() => setActivePageId('inventario')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer select-none"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <Package size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Inventario
            </span>
          </Card>

          {/* Item 4: Personas */}
          <Card 
            onClick={() => setActivePageId('personas')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer select-none"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <Users size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Clientes / Prov
            </span>
          </Card>

          {/* Item 5: Calendario */}
          <Card 
            onClick={() => setActivePageId('calendar')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer select-none"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <CalendarDays size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Calendario
            </span>
          </Card>

          {/* Item 6: Ajustes */}
          <Card 
            onClick={() => setActivePageId('general_settings')}
            className="group flex flex-col items-center justify-center p-4 sm:p-5 hover:border-text-heading hover:bg-surface-sidebar transition-all duration-150 cursor-pointer select-none"
          >
            <div className="p-2.5 rounded-md mb-2 bg-black/5 text-text-heading group-hover:bg-text-heading group-hover:text-white transition-all duration-150">
              <Settings size={20} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text-primary tracking-tight text-center leading-tight">
              Ajustes
            </span>
          </Card>

        </div>

        {/* Indicador Conexión SRI */}
        <Badge variant="success" className="px-3 py-1 normal-case font-normal text-xs gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E4B8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E4B8]"></span>
          </span>
          <span className="font-medium">Conexión SRI Activa</span>
        </Badge>

      </div>
    </div>
  );
}
