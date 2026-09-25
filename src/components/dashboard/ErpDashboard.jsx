import { useState, useEffect, useMemo } from 'react';
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

  return (
    <div className="w-full max-w-4xl mx-auto py-10 sm:py-16 px-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Saludo Inicial Centrado */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Hola, {shortGreetingName}
        </h1>
      </div>

      {/* Grid de Accesos Directos Centrados (Sin card de fondo, sin título) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
        {activeShortcuts.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleShortcutClick(item)}
              className="group flex flex-col text-left p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:-translate-y-0.5 transition-all cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5 mb-2.5">
                <div
                  style={{ backgroundColor: item.color || '#0b996e' }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"
                >
                  <Icon size={20} />
                </div>
                <span className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
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
