# Flujo de Preventas y Reorganización de Submenús Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el submódulo de Preventas con flujo de control de despacho en tiempo real, renombrar las opciones de submenús de Ventas en la barra lateral, y configurar el redireccionamiento de "Registrar Venta" a la facturación directa.

**Architecture:** Modificación de `src/App.jsx` para cambiar las etiquetas y añadir el submenú de Preventas, actualización de `src/components/finances/FinanceModule.jsx` para interceptar la navegación y renderizar el listado de preventas, y adaptación de `src/components/finances/TransactionsView.jsx` para añadir filtrado por preventa, columna de despacho interactiva, y prellenado de `isPreventa: true`.

**Tech Stack:** React, TailwindCSS, Firebase Firestore.

---

### Task 1: Modificar la Barra Lateral en App.jsx

**Files:**
- Modify: `src/App.jsx:960-968` y `src/App.jsx:2062-2072`

- [ ] **Step 1: Actualizar las etiquetas y la lista de submenús de Ventas**

Reemplazar la definición del submenu de Ventas en `src/App.jsx` (alrededor de la línea 2063) para renombrar "Resumen" a "Historial de Ventas", "Facturación / Vender" a "Registrar Venta", "Cotizaciones / Proformas" a "Cotizaciones", "Retenciones Recibidas" a "Retenciones de Venta", y añadir "Preventas".

**Code diff to apply:**
```diff
                 <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                   {[
-                    { id: 'resumen_ventas', label: 'Resumen' },
-                    { id: 'ventas_preventa', label: 'Facturación / Vender' },
+                    { id: 'resumen_ventas', label: 'Historial de Ventas' },
+                    { id: 'ventas_preventa', label: 'Registrar Venta' },
                     { id: 'pos', label: 'Punto de Venta (POS)' },
-                    { id: 'quotes', label: 'Cotizaciones / Proformas' },
+                    { id: 'preventas', label: 'Preventas' },
+                    { id: 'quotes', label: 'Cotizaciones' },
                     { id: 'nota_credito', label: 'Notas de Crédito' },
-                    { id: 'retencion', label: 'Retenciones Recibidas' }
+                    { id: 'retencion', label: 'Retenciones de Venta' }
                   ].map(sub => {
```

- [ ] **Step 2: Actualizar títulos y descripciones de las pestañas en App.jsx**

Modificar el objeto `subtabs` dentro de `case 'ventas'` (alrededor de la línea 960) para reflejar los nuevos nombres de pestañas y añadir la descripción para la pestaña `preventas`.

**Code diff to apply:**
```diff
         const subtabs = {
-          resumen_ventas: { title: 'Ventas: Resumen', desc: 'Panel informativo y métricas clave de facturación electrónica' },
-          ventas_preventa: { title: 'Facturación / Registrar Venta', desc: 'Genera facturas, notas de venta y comprobantes electrónicos SRI' },
-          quotes: { title: 'Cotizaciones y Proformas', desc: 'Emisión y gestión de proformas comerciales para clientes' },
+          resumen_ventas: { title: 'Ventas: Historial de Ventas', desc: 'Listado y métricas de comprobantes electrónicos de venta autorizados' },
+          ventas_preventa: { title: 'Registrar Venta', desc: 'Registro directo de ventas y facturación electrónica' },
+          pos: { title: 'Punto de Venta (POS)', desc: 'Facturación rápida e intuitiva para tiendas y comercio directo' },
+          preventas: { title: 'Preventas', desc: 'Gestión y despacho de ventas y pedidos realizados de forma anticipada' },
+          quotes: { title: 'Cotizaciones', desc: 'Emisión y gestión de cotizaciones comerciales para clientes' },
           nota_credito: { title: 'Notas de Crédito', desc: 'Anulaciones y devoluciones tributarias autorizadas por el SRI' },
-          retencion: { title: 'Retenciones Recibidas', desc: 'Registro de retenciones de IVA y Renta recibidas de clientes' }
+          retencion: { title: 'Retenciones de Venta', desc: 'Registro de retenciones de IVA y Renta recibidas de clientes' }
         };
```

---

### Task 2: Modificar el Controlador en FinanceModule.jsx

**Files:**
- Modify: `src/components/finances/FinanceModule.jsx`

- [ ] **Step 1: Interceptar y redirigir el subTab de ventas_preventa en FinanceModule.jsx**

En el `useEffect` que sincroniza el tab (alrededor de la línea 59), verificar si `initialSubTab === 'ventas_preventa'`. De ser así, configurar `subTabVentas` como `'resumen_ventas'`, abrir el modal de facturación (`setIsModalOpen(true)`) con datos limpios (`setEditingTx(null)`) y establecer la pestaña activa como `'ventas'`.

**Code to modify:**
```javascript
  // Sincronizar subTab de ventas y personas desde prop de navegación rápida
  useEffect(() => {
    if (initialSubTab) {
      if (mode === 'ventas') {
        if (initialSubTab === 'ventas_preventa') {
          setSubTabVentas('resumen_ventas');
          setEditingTx(null);
          setIsModalOpen(true);
          setActiveTab('ventas');
        } else {
          const targetSub = String(initialSubTab).startsWith('pos') ? 'pos' : initialSubTab;
          setSubTabVentas(targetSub);
          setActiveTab('ventas');
        }
      } else if (mode === 'personas') {
        setSubTabPersonas(initialSubTab);
      } else if (mode === 'compras') {
        setActiveTab(initialSubTab);
      } else if (mode === 'contabilidad') {
        setActiveTab(initialSubTab);
      }
    }
  }, [initialSubTab, mode]);
```

- [ ] **Step 2: Renderizar el nuevo tab preventas en FinanceModule.jsx**

Agregar la sección de renderizado para `subTabVentas === 'preventas'` dentro de Ventas (alrededor de la línea 268) utilizando el componente `TransactionsView` con la prop `isPreventaTab={true}` y `forcedType="ingreso"`.

**Code to modify:**
```javascript
              {activeTab === 'ventas' && subTabVentas === 'retencion' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="retencion" forcedType="ingreso" />
              )}
              {activeTab === 'ventas' && subTabVentas === 'preventas' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} isPreventaTab={true} forcedType="ingreso" />
              )}
```

---

### Task 3: Modificar la Vista de Transacciones en TransactionsView.jsx

**Files:**
- Modify: `src/components/finances/TransactionsView.jsx`

- [ ] **Step 1: Importar los iconos de Lucide requeridos y recibir la nueva prop isPreventaTab**

Importar los iconos `Truck`, `Clock` y `Package` en [TransactionsView.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix/src/components/finances/TransactionsView.jsx#L2) y recibir la prop `isPreventaTab` en la firma de la función (línea 9).

**Code diff to apply:**
```diff
-import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, AlertCircle, UploadCloud, Sparkles, AlertTriangle, Eye, Mail, Loader2 } from 'lucide-react';
+import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, AlertCircle, UploadCloud, Sparkles, AlertTriangle, Eye, Mail, Loader2, Truck, Package, Clock } from 'lucide-react';
 import { doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
```
```diff
-export default function TransactionsView({ transactions, thirdParties, isDarkMode, showToast, db, storage, appId, onOpenForm, forcedDocType, forcedType }) {
+export default function TransactionsView({ transactions, thirdParties, isDarkMode, showToast, db, storage, appId, onOpenForm, forcedDocType, forcedType, isPreventaTab = false }) {
```

- [ ] **Step 2: Filtrar transacciones de preventa en TransactionsView.jsx**

En el filtro de `transactions` (alrededor de la línea 38), separar las preventas: si `isPreventaTab` es verdadero, mostrar solo preventas (`tx.isPreventa === true`). Si es falso y estamos en la pestaña `'ventas_resumen'`, ocultar las preventas.

**Code to modify:**
```javascript
  const filtered = transactions.filter(tx => {
    // Filtrar preventas
    if (isPreventaTab) {
      if (!tx.isPreventa) return false;
    } else {
      if (forcedDocType === 'ventas_resumen' && tx.isPreventa) return false;
    }

    const matchesSearch = (tx.documentNumber || '').includes(searchTerm) || 
                          (thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
```

- [ ] **Step 3: Agregar la función handleToggleDelivery para despacho de preventas**

Añadir la función `handleToggleDelivery` dentro del componente para permitir despachar o revertir el despacho de preventas directamente desde el listado.

**Code to write:**
```javascript
  const handleToggleDelivery = async (txId, currentStatus) => {
    if (!db || !appId) return;
    try {
      const nextStatus = currentStatus === 'entregado' ? 'pendiente' : 'entregado';
      const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId);
      await setDoc(txRef, { deliveryStatus: nextStatus }, { merge: true });
      showToast(`Preventa marcada como ${nextStatus === 'entregado' ? 'despachada' : 'pendiente'}`, 'success');
    } catch (err) {
      console.error("Error al actualizar despacho", err);
      showToast("Error al actualizar estado de despacho", "error");
    }
  };
```

- [ ] **Step 4: Modificar el botón de agregar para prellenar preventas**

Actualizar el botón de registro de comprobante (alrededor de la línea 432) para que diga "Registrar Preventa" en lugar de "Registrar Venta" cuando `isPreventaTab` sea verdadero, y configurar el prellenado de `isPreventa: true` al ejecutar `onOpenForm`.

**Code to modify:**
```jsx
          <button
            type="button"
            onClick={() => {
              if (isPreventaTab) {
                onOpenForm({
                  id: '',
                  type: 'ingreso',
                  documentType: 'factura',
                  date: getEcuadorDateString(),
                  currency: 'USD',
                  baseImponible: 0,
                  ivaPorcentaje: 15,
                  ivaValor: 0,
                  retencionFuente: 0,
                  retencionIva: 0,
                  total: 0,
                  paymentMethod: 'transferencia',
                  paymentStatus: 'pendiente',
                  sriStatus: 'pendiente',
                  isPreventa: true,
                  deliveryStatus: 'pendiente',
                  items: []
                });
              } else if (forcedDocType) {
                const defaultType = forcedType || 'ingreso';
                const defaultDocType = forcedDocType === 'ventas_resumen' ? 'factura' : forcedDocType;
                
                onOpenForm({
                  id: '',
                  type: defaultType,
                  documentType: defaultDocType,
                  date: getEcuadorDateString(),
                  currency: 'USD',
                  baseImponible: 0,
                  ivaPorcentaje: 15,
                  ivaValor: 0,
                  retencionFuente: 0,
                  retencionIva: 0,
                  total: 0,
                  paymentMethod: 'transferencia',
                  paymentStatus: 'pendiente',
                  sriStatus: 'pendiente',
                  items: []
                });
              } else {
                onOpenForm(null);
              }
            }}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={15} /> Registrar {
              isPreventaTab 
                ? 'Preventa' 
                : (forcedDocType 
                    ? (forcedDocType === 'ventas_resumen' 
                        ? 'Venta' 
                        : (docTypeTabs.find(t => t.id === forcedDocType)?.label || forcedDocType)) 
                    : 'Comprobante')
            }
          </button>
```

- [ ] **Step 5: Añadir la columna de Despacho en el encabezado y el cuerpo de la tabla**

Modificar el encabezado de la tabla para incluir la columna "Despacho" sólo en la pestaña de preventas, y renderizar el botón interactivo para despachar en las celdas de datos.

**Code to modify in table header (around line 527):**
```jsx
                <th className="px-6 py-3.5">Total</th>
                <th className="px-6 py-3.5">Estado SRI</th>
                {isPreventaTab && <th className="px-6 py-3.5">Despacho</th>}
                <th className="px-6 py-3.5">Archivos</th>
```

**Code to modify in table body row (around line 607):**
```jsx
                  <td className="px-6 py-3.5">{getStatusBadge(tx.sriStatus, tx.documentType)}</td>
                  {isPreventaTab && (
                    <td className="px-6 py-3.5">
                      {tx.deliveryStatus === 'entregado' ? (
                        <span 
                          onClick={() => handleToggleDelivery(tx.id, tx.deliveryStatus)}
                          className="px-2.5 py-1 rounded-[10px] text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 flex items-center gap-1.5 w-fit cursor-pointer hover:opacity-85 transition-all"
                        >
                          <Truck size={11} /> Entregado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleDelivery(tx.id, tx.deliveryStatus)}
                          className="btn-icon bg-amber-600 text-white hover:bg-amber-700 transition-all"
                          title="Marcar como Entregado / Despachado"
                        >
                          <Clock size={13} />
                        </button>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-3.5">
```

- [ ] **Step 6: Ejecutar la compilación del proyecto para validar el build**

Run: `npm run build`
Expected: Compilación finalizada con éxito sin errores de tipado o CSS.
