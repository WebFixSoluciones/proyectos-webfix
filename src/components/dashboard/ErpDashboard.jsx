import { UiBox, UiHeading } from '../ui/layout';
import { useState, useEffect, useMemo } from 'react';
import { Pencil } from 'lucide-react';
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
  companyProfile = null,
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

  const companyName = companyProfile?.nombreComercial || companyProfile?.razonSocial || settings?.nombreComercial || settings?.razonSocial || 'Mi Empresa';

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
    <UiBox className="flex flex-col items-center justify-center min-h-[72vh] w-full px-4 sm:px-6 py-10 animate-in fade-in duration-300">
      <UiBox className="max-w-4xl w-full flex flex-col items-center text-center">
        
        {/* Titulo centrado */}
        <UiHeading as="h1" size="8" weight="bold" color="gray" highContrast className="tracking-tight text-center mb-8 sm:mb-10">
          Bienvenido, <span style={{ color: 'var(--blue-11)' }}>{companyName}</span>
        </UiHeading>

        {/* Grid de accesos directos configurables */}
        <UiBox className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full">
          {activeShortcuts.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleShortcutClick(item)}
                style={{
                  backgroundColor: 'var(--color-panel-solid)',
                  border: '1px solid var(--gray-a5)',
                  borderRadius: 'var(--radius-4)'
                }}
                className="group flex flex-col items-center justify-center p-6 sm:p-8 transition-all duration-200 hover:border-[var(--blue-9)] hover:shadow-md hover:-translate-y-1 cursor-pointer select-none text-center"
              >
                <div
                  style={{
                    backgroundColor: item.color || 'var(--blue-9)',
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

        {/* Botón Circular Centrado con animación en hover y tooltip */}
        <div className="mt-8 flex flex-col items-center justify-center relative">
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:scale-110 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--color-panel-solid)',
                border: '1.5px solid var(--gray-a6)',
                color: 'var(--gray-11)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--blue-9)';
                e.currentTarget.style.color = 'var(--blue-9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-a6)';
                e.currentTarget.style.color = 'var(--gray-11)';
              }}
              aria-label="Editar accesos directos"
              title="Editar accesos directos"
            >
              <Pencil size={20} className="transition-transform duration-300 group-hover:rotate-12" />
            </button>

            {/* Tooltip flotante al pasar el mouse */}
            <div 
              role="tooltip"
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium text-white bg-[var(--gray-12)] rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap z-30"
            >
              Editar accesos directos
              <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-[var(--gray-12)]" />
            </div>
          </div>
        </div>

      </UiBox>

      {/* Modal para personalizar accesos directos */}
      <ShortcutCustomizerModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        currentShortcuts={selectedShortcutIds}
        onSaveShortcuts={handleSaveShortcuts}
        showToast={showToast}
      />
    </UiBox>
  );
}
