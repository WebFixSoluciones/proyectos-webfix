# Plan de Implementación: Remoción de Tab-Bars Horizontales y Rediseño de Accesos Rápidos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar las barras horizontales redundantes en los subcomponentes de Finanzas e Inventario, y refactorizar las tarjetas de Accesos Rápidos del Dashboard para que sean blancas, sin bordes, con iconos unificados al color primario y fondo translúcido.

**Architecture:** Modificaciones a `src/App.jsx` para pasar las props del tab inicial a los módulos, ajustes en `GastosCreditosModule.jsx` y `InventoryModule.tsx` para sincronizar y remover el markup de navegación superior, y actualizaciones en `ErpDashboard.jsx` para reestilizar las 6 tarjetas del grid.

---

### Task 1: Pasar props de navegación en App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Pasar la prop initialSubTab a GastosCreditosModule e InventoryModule**

Modificar el renderizado de `InventoryModule` (alrededor de la línea 2730) y `GastosCreditosModule` (alrededor de la línea 2736) en `src/App.jsx` para inyectar la prop `initialSubTab` con el estado correspondiente del sidebar.

**Code diff to apply:**
```diff
               {activePageId === 'inventario' && (
-                <InventoryModule isDarkMode={isDarkMode} />
+                <InventoryModule isDarkMode={isDarkMode} initialSubTab={inventarioInitialSubTab} />
               )}
               {activePageId === 'gastos_creditos' && (
-                <GastosCreditosModule isDarkMode={isDarkMode} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} db={db} appId={appId} />
+                <GastosCreditosModule isDarkMode={isDarkMode} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} db={db} appId={appId} initialSubTab={gastosInitialSubTab} />
               )}
```

---

### Task 2: Modificar Módulo de Finanzas (GastosCreditosModule.jsx)

**Files:**
- Modify: `src/components/finances/GastosCreditosModule.jsx`

- [ ] **Step 1: Aceptar la prop initialSubTab y sincronizar activeTab**

Actualizar los argumentos recibidos por la función `GastosCreditosModule` (línea 10) y añadir un `useEffect` para sincronizar `activeTab` con `initialSubTab` cuando cambie.

**Code diff to apply:**
```diff
-export default function GastosCreditosModule({ isDarkMode, showToast, transactions = [], thirdParties = [], db, appId }) {
+export default function GastosCreditosModule({ isDarkMode, showToast, transactions = [], thirdParties = [], db, appId, initialSubTab }) {
   const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'pasivos' | 'historial_gastos'
```
```javascript
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
```

- [ ] **Step 2: Eliminar la barra horizontal superior (cabecera)**

Localizar y remover el bloque JSX que renderiza la cabecera y navegación horizontal (líneas 225-253).

**JSX to remove:**
```jsx
      {/* CABECERA Y NAVEGACIÓN */}
      <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${
        isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/10 bg-primary-light'
      }`}>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
          {[
            { id: 'resumen', label: 'Resumen Financiero', icon: TrendingUp },
            { id: 'pasivos', label: 'Pasivos y Financiamiento', icon: Landmark },
            { id: 'historial_gastos', label: 'Historial de Egresos', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isActive
                    ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-black hover:text-black hover:bg-black/5')
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
```

---

### Task 3: Modificar Módulo de Inventario (InventoryModule.tsx)

**Files:**
- Modify: `src/components/inventory/InventoryModule.tsx`

- [ ] **Step 1: Actualizar la firma del componente e interfaces**

Modificar la interfaz `InventoryModuleProps` para que acepte `initialSubTab?: string`, recibirla en la firma y añadir un `useEffect` para sincronizar `activeTab`.

**Code diff to apply:**
```diff
 interface InventoryModuleProps {
   isDarkMode: boolean;
+  initialSubTab?: string;
 }
```
```diff
-export default function InventoryModule({ isDarkMode }: InventoryModuleProps) {
+export default function InventoryModule({ isDarkMode, initialSubTab }: InventoryModuleProps) {
   const [activeTab, setActiveTab] = useState('productos');
```
```javascript
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
```

- [ ] **Step 2: Eliminar la barra horizontal superior (cabecera)**

Remover el fragmento TSX que dibuja los sub-tabs de Inventario (líneas 249-270).

**TSX to remove:**
```tsx
      {/* Sub-Tabs de Inventario */}
      <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/10 bg-primary-light'}`}>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isActive
                    ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-black hover:text-black hover:bg-black/5')
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
```

---

### Task 4: Modificar Accesos Rápidos en el Dashboard (ErpDashboard.jsx)

**Files:**
- Modify: `src/components/dashboard/ErpDashboard.jsx`

- [ ] **Step 1: Reestilizar los 6 botones y sus iconos**

Modificar los 6 elementos del grid de Accesos Rápidos (líneas 270-334) para quitar las clases de borde (`border`, `border-gray-300`, `hover:border-...`), aplicar `border-0 shadow-sm hover:shadow-md` en modo claro y `border-0` en modo oscuro. En el contenedor de iconos, reemplazar todos los fondos y colores específicos por `bg-primary/10 text-primary` de forma unificada.

---

### Task 5: Compilación y Verificación

- [ ] **Step 1: Validar build local del ERP**

Run: `npm run build`
Expected: Compilación finalizada con éxito sin errores en Vite o TypeScript.
