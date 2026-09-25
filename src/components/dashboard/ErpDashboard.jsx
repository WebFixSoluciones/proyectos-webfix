import { useState, useEffect, useMemo } from 'react';
import { Pencil, ArrowUpRight } from 'lucide-react';
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

  // Cargar accesos directos configurados o usar por defecto
  const [selectedShortcutIds, setSelectedShortcutIds] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_dashboard_shortcuts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrar facturas_sri a generar_venta para ir directo a la venta administrativa
          const migrated = parsed.map(id => id === 'facturas_sri' ? 'generar_venta' : id);
          return [...new Set(migrated)];
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

  return (
    <div className="w-full max-w-4xl mx-auto py-10 sm:py-16 px-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Saludo Inicial Centrado */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Hola, {shortGreetingName}
        </h1>
      </div>

      {/* Grid de Accesos Directos Centrados (Sin descripción, con altura balanceada y flecha de acción directa) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 w-full">
        {activeShortcuts.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleShortcutClick(item)}
              className="group flex items-center justify-between p-4 sm:p-4.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80 hover:-translate-y-0.5 transition-all cursor-pointer select-none shadow-none text-left"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  style={{ backgroundColor: item.color || '#1b1b1b' }}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-none"
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-slate-950 transition-colors truncate">
                  {item.title}
                </span>
              </div>
              <div className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0 ml-2">
                <ArrowUpRight size={18} strokeWidth={2.2} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Botón Circular Centrado ("La Esfera") para personalizar accesos directos */}
      <div className="mt-8 flex flex-col items-center justify-center relative">
        <div className="relative group">
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md hover:scale-110 active:scale-95 cursor-pointer bg-white border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-950"
            aria-label="Personalizar accesos directos"
            title="Personalizar accesos directos"
          >
            <Pencil size={19} strokeWidth={2.2} className="transition-transform duration-200 group-hover:rotate-12 text-slate-800 group-hover:text-black" />
          </button>

          {/* Tooltip flotante al pasar el mouse */}
          <div 
            role="tooltip"
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap z-30"
          >
            Personalizar accesos directos
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900" />
          </div>
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
