import { UiBox, UiHeading, UiText } from '../ui/layout';
import { UiButton } from '../ui/controls';
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, ShoppingBag, Package, Users, Settings, 
  CreditCard
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

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
    },
    {
      id: 'general_settings',
      title: 'Ajustes SRI y Negocio',
      subtitle: 'Firma electrónica .p12, datos fiscales y perfil',
      icon: Settings,
      onClick: () => {
        setActivePageId('general_settings');
      }
    }
  ];

  return (
    <UiBox className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Bienvenida y Nombre de la Empresa configurada en Ajustes */}
      <UiBox className="space-y-1">
        <UiHeading as="h1" size="7" weight="bold" color="gray" highContrast className="tracking-tight">
          Bienvenido, {companyName}
        </UiHeading>
        <UiText as="p" size="2" color="gray">
          Selecciona un submódulo para comenzar tu jornada de trabajo
        </UiText>
      </UiBox>

      {/* Presentación de Accesos Directos */}
      <Card>
        <CardHeader className="py-4 border-b border-[var(--gray-a4)]">
          <CardTitle style={{ color: "var(--gray-12)" }} className="text-base font-semibold">
            Accesos Directos
          </CardTitle>
          <UiText as="p" size="1" color="gray">
            Navega a los submódulos principales
          </UiText>
        </CardHeader>
        <CardContent className="p-6">
          <UiBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {shortcutItems.map(item => {
              const Icon = item.icon;
              return (
                <UiButton
                  key={item.id}
                  onClick={item.onClick}
                  variant="surface"
                  className="flex flex-col items-start duration-120 text-left cursor-pointer group p-4 hover:border-[var(--blue-a7)] hover:bg-[var(--gray-a2)] transition-all"
                >
                  <UiBox
                    style={{
                      borderRadius: "var(--radius-3)",
                      backgroundColor: "var(--gray-a3)",
                      color: "var(--gray-12)"
                    }}
                    className="p-2.5 mb-3 group-hover:bg-[var(--blue-a3)] group-hover:text-[var(--blue-11)] transition-colors"
                  >
                    <Icon size={18} />
                  </UiBox>
                  <UiText size="2" weight="bold" color="gray" highContrast className="group-hover:text-[var(--blue-11)] transition-colors">
                    {item.title}
                  </UiText>
                  <UiText size="1" color="gray" className="mt-1 line-clamp-2">
                    {item.subtitle}
                  </UiText>
                </UiButton>
              );
            })}
          </UiBox>
        </CardContent>
      </Card>

    </UiBox>
  );
}
