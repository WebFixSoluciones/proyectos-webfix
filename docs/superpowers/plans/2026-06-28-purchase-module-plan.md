# Módulo de Compras, Historial e Ingreso Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renombrar el submenú de Compras a "Historial de Compras", renderizar el listado completo mediante `TransactionsView`, e integrar el formulario `PurchaseForm` para permitir registrar compras de forma manual o mediante importación XML/Clave de Acceso.

**Architecture:** Modificaciones en `src/App.jsx` para actualizar nombres de pestañas y metadatos, en `src/components/finances/FinanceModule.jsx` para enlazar `TransactionsView` y renderizar `PurchaseForm`, y en `src/components/finances/TransactionsView.jsx` para soportar el filtrado de compras.

---

### Task 1: Modificar la Barra Lateral en App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Renombrar el submenú compras_resumen en el menú lateral**

Actualizar el label de la opción `compras_resumen` en la barra lateral (alrededor de la línea 2135).

**Code diff to apply:**
```diff
               {isSidebarOpen && expandedSidebarMenu === 'compras' && (
                 <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                   {[
-                    { id: 'compras_resumen', label: 'Resumen' },
+                    { id: 'compras_resumen', label: 'Historial de Compras' },
                     { id: 'compras_sri', label: 'Facturas Recibidas SRI' },
```

- [ ] **Step 2: Actualizar títulos y descripciones de las subpestañas de compras**

Modificar el objeto `subtabs` bajo el caso `compras` (alrededor de la línea 1003).

**Code diff to apply:**
```diff
       case 'compras': {
         const subtabs = {
-          compras_resumen: { title: 'Compras: Resumen', desc: 'Análisis y métricas clave de tus egresos y proveedores' },
+          compras_resumen: { title: 'Compras: Historial de Compras', desc: 'Listado y registro de facturas recibidas de tus proveedores' },
           compras_sri: { title: 'Facturas Recibidas SRI', desc: 'Sincroniza y concilia facturas emitidas por tus proveedores en el SRI' },
```

---

### Task 2: Modificar el Controlador FinanceModule.jsx

**Files:**
- Modify: `src/components/finances/FinanceModule.jsx`

- [ ] **Step 1: Importar PurchaseForm y reestructurar TABS**

Importar `PurchaseForm` al principio de `FinanceModule.jsx` y renombrar "Resumen" a "Historial de Compras" en la lista de pestañas de compras (línea 178).

**Code diff to apply:**
```diff
 import TransactionForm from './TransactionForm';
+import PurchaseForm from './PurchaseForm';
 import AccountsReceivablePayable from './AccountsReceivablePayable';
```
```diff
     if (mode === 'compras') {
       return [
-        { id: 'compras_resumen', label: 'Resumen', icon: PieChart },
+        { id: 'compras_resumen', label: 'Historial de Compras', icon: ShoppingBag },
         { id: 'compras_sri', label: 'Facturas Recibidas (SRI)', icon: Download },
```

- [ ] **Step 2: Renderizar TransactionsView para compras_resumen**

En lugar de renderizar la vista de resumen estática anterior (líneas 311-415), renderizar el listado mediante `TransactionsView`.

**Code to modify:**
```jsx
              {/* SECCIÓN COMPRAS */}
              {activeTab === 'compras_resumen' && (
                <TransactionsView 
                  transactions={transactions} 
                  thirdParties={thirdParties} 
                  isDarkMode={isDarkMode} 
                  showToast={showToast} 
                  db={db} 
                  storage={storage} 
                  appId={appId} 
                  onOpenForm={handleOpenFormModal} 
                  forcedDocType="compras_resumen" 
                  forcedType="egreso" 
                />
              )}
```

- [ ] **Step 3: Renderizar condicionalmente PurchaseForm o TransactionForm**

Modificar el renderizado del modal al final de `FinanceModule.jsx` (alrededor de la línea 440) para cargar `PurchaseForm` cuando la transacción a registrar/editar sea de tipo `egreso` (gasto/compra) y no sea de tipo Nota de Crédito o Retención.

**Code to modify:**
```jsx
      {/* MODAL GLOBAL DE FACTURACIÓN (COMPARTIDO) */}
      {isModalOpen && (
        editingTx?.type === 'egreso' && 
        (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType) ? (
          <PurchaseForm 
            tx={editingTx} 
            onClose={() => setIsModalOpen(false)} 
            thirdParties={thirdParties} 
            products={products}
            isDarkMode={isDarkMode} 
            showToast={showToast} 
            db={db} 
            appId={appId} 
          />
        ) : (
          <TransactionForm 
            tx={editingTx} 
            onClose={() => setIsModalOpen(false)} 
            thirdParties={thirdParties} 
            products={products}
            isDarkMode={isDarkMode} 
            showToast={showToast} 
            db={db} 
            storage={storage} 
            appId={appId} 
          />
        )
      )}
```

---

### Task 3: Actualizar el Filtrado de Compras en TransactionsView.jsx

**Files:**
- Modify: `src/components/finances/TransactionsView.jsx`

- [ ] **Step 1: Filtrar compras_resumen en TransactionsView.jsx**

Modificar la lógica de filtros de tipos de documentos (alrededor de la línea 63) para soportar el caso de compras generales (`compras_resumen`), seleccionando transacciones de tipo `egreso` que no sean retenciones ni notas de crédito.

**Code diff to apply:**
```diff
     let matchesDocType = false;
     if (filterDocType === 'all') {
       matchesDocType = true;
     } else if (filterDocType === 'ventas_resumen') {
       matchesDocType = tx.type === 'ingreso' && (tx.documentType === 'factura' || tx.documentType === 'nota_venta');
+    } else if (filterDocType === 'compras_resumen') {
+      matchesDocType = tx.type === 'egreso' && (tx.documentType === 'factura' || tx.documentType === 'nota_venta' || tx.documentType === 'liquidacion');
     } else {
       matchesDocType = tx.documentType === filterDocType;
     }
```

---

### Task 4: Compilación y Verificación

- [ ] **Step 1: Ejecutar build del proyecto**

Run: `npm run build`
Expected: Compilación finalizada correctamente sin errores de tipado o importación.
