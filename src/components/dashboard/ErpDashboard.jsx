import { UiBox, UiHeading } from '../ui/layout';
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, ShoppingBag, Package, Users, CreditCard
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

export default function ErpDashboard({ 
  setActivePageId, 
  setVentasInitialSubTab, 
  companyProfile = null,
  db, 
  appId 
}) {
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

  const companyName = companyProfile?.nombreComercial || companyProfile?.razonSocial || settings?.nombreComercial || settings?.razonSocial || 'Mi Empresa';

  const shortcutItems = [
    {
      id: 'pos',
      title: 'Punto de Venta',
      subtitle: 'Cobro rápido y ventas en mostrador (F12)',
      icon: ShoppingCart,
      onClick: () => {
        setVentasInitialSubTab && setVentasInitialSubTab('pos');
        setActivePageId('ventas');
      }
    },
    {
      id: 'facturas_sri',
      title: 'Facturas SRI',
      subtitle: 'Emisión, autorización y consulta de RIDE',
      icon: FileText,
      onClick: () => {
        setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas');
        setActivePageId('ventas');
      }
    },
    {
      id: 'compras',
      title: 'Historial de Compras',
      subtitle: 'Registro de facturas recibidas y proveedores',
      icon: ShoppingBag,
      onClick: () => {
        setActivePageId('compras');
      }
    },
    {
      id: 'inventario',
      title: 'Inventario y Kardex',
      subtitle: 'Control de existencias, productos y precios',
      icon: Package,
      onClick: () => {
        setActivePageId('inventario');
      }
    },
    {
      id: 'personas',
      title: 'Clientes y Proveedores',
      subtitle: 'Directorio fiscal de personas y RUC',
      icon: Users,
      onClick: () => {
        setActivePageId('personas');
      }
    },
    {
      id: 'gastos_creditos',
      title: 'Control Financiero',
      subtitle: 'Flujo de caja, bancos, CxC y CxP',
      icon: CreditCard,
      onClick: () => {
        setActivePageId('gastos_creditos');
      }
    }
  ];

  return (
    <UiBox className="flex flex-col items-center justify-center min-h-[72vh] w-full px-4 sm:px-6 py-10 animate-in fade-in duration-300">
      <UiBox className="max-w-4xl w-full flex flex-col items-center text-center">
        
        {/* Titulo centrado */}
        <UiHeading as="h1" size="8" weight="bold" color="gray" highContrast className="tracking-tight text-center mb-8 sm:mb-10">
          Bienvenido, <span style={{ color: 'var(--blue-11)' }}>{companyName}</span>
        </UiHeading>

        {/* Grid de 6 accesos directos flotantes sin contenedor exterior */}
        <UiBox className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full">
          {shortcutItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                style={{
                  backgroundColor: 'var(--color-panel-solid)',
                  border: '1px solid var(--gray-a5)',
                  borderRadius: 'var(--radius-4)'
                }}
                className="group flex flex-col items-center justify-center p-6 sm:p-8 transition-all duration-200 hover:border-[var(--blue-9)] hover:shadow-md hover:-translate-y-1 cursor-pointer select-none text-center"
              >
                <div
                  style={{
                    backgroundColor: 'var(--blue-9)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-3)'
                  }}
                  className="p-3.5 sm:p-4 mb-3.5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm"
                >
                  <Icon size={26} className="text-white" />
                </div>
                <span className="text-base sm:text-lg font-semibold text-[var(--gray-12)] group-hover:text-[var(--blue-11)] transition-colors">
                  {item.title}
                </span>
                <span className="text-xs text-[var(--gray-10)] mt-1 line-clamp-1">
                  {item.subtitle}
                </span>
              </button>
            );
          })}
        </UiBox>

      </UiBox>
    </UiBox>
  );
}
