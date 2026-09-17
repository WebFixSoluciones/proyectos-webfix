# Plan de Implementación: Rediseño Integral con Radix Themes 3.0 & Tipografía Inter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar visualmente toda la interfaz del ERP WebFix adoptando de forma estricta el diseño de **Radix Themes 3.0** con tipografía **Inter** universal, botones de tabla en formato **Radix Soft Colorido** (eliminando bloques planos saturados y links desalineados), sin alterar ni dañar la lógica de facturación electrónica ni los flujos tributarios del SRI.

**Architecture:** 
- Inyección de Google Fonts Inter en `index.html` y unificación tipográfica en `index.css` y `radixTheme.css`.
- Extensión de componentes base en `src/components/ui/controls.jsx` (`UiButton asChild`, `UiInput` con slots y `Badge variant="soft"`).
- Reemplazo y estandarización sistemática en cascada de vistas de tablas, barras de herramientas, topbar, sidebar, modales y formularios.
- Verificación continua con `npm test` en cada tarea para asegurar cero regresiones en facturación electrónica.

**Tech Stack:** React 19, Vite 8, Radix Themes 3.0 (@radix-ui/themes), Tailwind CSS 4, Lucide React, Node Test Runner.

---

### Task 1: Tipografía Universal Inter y Fundamentos del Tema

**Files:**
- Modify: `index.html:8-12`
- Modify: `src/index.css:87-95`
- Modify: `src/radixTheme.css:1-26`
- Modify: `src/designTokens.css:87-95`

- [ ] **Step 1: Reemplazar Geist por Inter en `index.html`**
  Cargar `family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600` desde Google Fonts.

- [ ] **Step 2: Configurar variables CSS de fuente en `src/index.css` y `src/radixTheme.css`**
  Asignar `--font-sans: 'Inter', -apple-system, sans-serif;` y `--default-font-family: 'Inter', sans-serif;`.
  Forzar `font-family: 'Inter', sans-serif !important;` en `body`, `#root`, `.radix-themes` y `.webfix-theme`.

- [ ] **Step 3: Verificar que los tests de comercio sigan pasando**
  Run: `npm test`
  Expected: 15 passed, 0 failed.

- [ ] **Step 4: Commit**
  ```bash
  git add index.html src/index.css src/radixTheme.css src/designTokens.css
  git commit -m "style: establecer tipografia Inter universal y tokens base Radix Themes"
  ```

---

### Task 2: Robustecer Wrappers de Controles Base (`controls.jsx`, `badge.jsx`)

**Files:**
- Modify: `src/components/ui/controls.jsx:1-69`
- Modify: `src/components/ui/badge.jsx:1-7`

- [ ] **Step 1: Añadir soporte `asChild` a `UiButton`**
  Permitir que `UiButton` soporte `asChild` de Radix para que elementos `<a>` (enlaces de descarga XML/PDF) adopten la variante, tamaño y estilo de `IconButton` o `Button` sin estilos CSS manuales en línea.

- [ ] **Step 2: Soportar slots decorativos en `UiInput`**
  Permitir props `iconPrefix` e `iconSuffix` que rendericen `<TextField.Slot>` nativo de Radix sin romper `onChange` ni inputs de tipo texto, fecha, número o búsqueda.

- [ ] **Step 3: Estandarizar `Badge` a `variant="soft"`**
  Asegurar que todas las variantes (`success`, `warning`, `destructive`, `info`, `secondary`) usen `variant="soft"` de Radix por defecto con sus respectivos colores (`green`, `amber`, `red`, `blue`, `gray`).

- [ ] **Step 4: Verificar tests y build**
  Run: `npm test && npm run build`
  Expected: exit 0.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/ui/controls.jsx src/components/ui/badge.jsx
  git commit -m "feat(ui): robustecer UiButton asChild, UiInput slots y Badge soft"
  ```

---

### Task 3: Estandarizar Historial de Ventas (`TransactionsView.jsx`) con Radix Soft Colorido

**Files:**
- Modify: `src/components/finances/TransactionsView.jsx:580-745`

- [ ] **Step 1: Reemplazar botones toscos de la columna "Archivos"**
  - XML: `<UiButton iconOnly asChild variant="soft" color="blue" size="1" title="Ver XML"><a href={tx.xmlUrl} target="_blank" rel="noreferrer"><FileText size={13}/></a></UiButton>` (o disabled con `variant="ghost"` si no existe).
  - PDF: `<UiButton iconOnly asChild variant="soft" color="red" size="1" title="Ver PDF"><a href={tx.pdfUrl} target="_blank" rel="noreferrer"><FileText size={13}/></a></UiButton>` (o disabled si no existe).
  - RIDE: `<UiButton iconOnly variant="soft" color="amber" size="1" onClick={() => setSelectedRideTx(tx)} title="Ver RIDE"><Eye size={13}/></UiButton>`.
  - Correo: `<UiButton iconOnly variant="soft" color="indigo" size="1" onClick={() => handleOpenEmailModal(tx)} title="Enviar por Correo"><Mail size={13}/></UiButton>`.

- [ ] **Step 2: Estandarizar botones de la columna "Acciones"**
  - Editar: `UiButton iconOnly variant="soft" color="gray" size="1"` con `<Edit2 size={13} />`.
  - Eliminar: `UiButton iconOnly variant="soft" color="red" size="1"` con `<Trash2 size={13} />`.

- [ ] **Step 3: Estandarizar buscador y filtros de la cabecera**
  Usar `UiInput` con slot de búsqueda y `UiSelect` nativo para Mes, Año y Tipo.

- [ ] **Step 4: Verificar preservación de facturación electrónica**
  Run: `npm test`
  Expected: 15 passed, 0 failed.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/finances/TransactionsView.jsx
  git commit -m "style(ventas): aplicar Radix Soft Colorido a tabla de comprobantes y acciones"
  ```

---

### Task 4: Estandarizar Topbar Superior y Sidebar de Navegación

**Files:**
- Modify: `src/App.jsx:945-1025`
- Modify: `src/components/Sidebar.jsx:18-120`

- [ ] **Step 1: Estandarizar barra superior en `src/App.jsx`**
  - Buscador global `⌘K`: Convertir a `TextField.Root` de Radix con slot de `<Search size={14}/>` y `<kbd>`.
  - Botón "Punto de Venta": `UiButton variant="solid" color="blue" size="2"` con Inter 500.
  - Botón "Asistente AI": `UiButton variant="soft" color="gray" size="2"`.
  - Botones Menú lateral y Ajustes: `UiButton iconOnly variant="ghost" color="gray" size="2"`.
  - Badge SRI: `Badge variant="soft" color="green"`.

- [ ] **Step 2: Estandarizar navegación del menú lateral en `src/components/Sidebar.jsx`**
  - Actualizar clases de items activos e inactivos para usar `var(--accent-3)`, `var(--accent-11)`, `var(--gray-a3)` y `var(--gray-11)`.
  - Tipografía Inter en escala de 13px con alineación armónica de iconos Lucide.

- [ ] **Step 3: Verificar tests y build**
  Run: `npm test && npm run build`
  Expected: exit 0.

- [ ] **Step 4: Commit**
  ```bash
  git add src/App.jsx src/components/Sidebar.jsx
  git commit -m "style(shell): alinear Topbar y Sidebar al diseno Radix Themes 3.0"
  ```

---

### Task 5: Estandarizar Vistas de Compras, Gastos e Inventario

**Files:**
- Modify: `src/components/finances/ComprasGastosView.jsx`
- Modify: `src/components/finances/ComprasSriView.jsx`
- Modify: `src/components/finances/PurchaseForm.jsx`
- Modify: `src/components/inventory/InventoryModule.tsx`
- Modify: `src/components/inventory/ProductCreationForm.tsx`

- [ ] **Step 1: Estandarizar Compras y Compras SRI**
  Aplicar los mismos botones suaves `variant="soft"` en tablas de comprobantes de compras y conciliar SRI.

- [ ] **Step 2: Estandarizar formulario de compra (`PurchaseForm.jsx`)**
  Asegurar que los inputs de 15 dígitos de factura, clave de 49 dígitos del SRI y selects tributarios usen los componentes Radix y tipografía Inter/Mono sin alterar cálculos ni retenciones.

- [ ] **Step 3: Estandarizar catálogo de Inventario (`InventoryModule.tsx`, `ProductCreationForm.tsx`)**
  Aplicar `UiTable` con badges soft de stock y botones de edición/ajuste en `variant="soft"` / `variant="ghost"`.

- [ ] **Step 4: Verificar tests de comercio e inventario**
  Run: `npm test`
  Expected: 15 passed, 0 failed.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/finances/ComprasGastosView.jsx src/components/finances/ComprasSriView.jsx src/components/finances/PurchaseForm.jsx src/components/inventory/
  git commit -m "style(compras-inventario): estandarizar tablas, filtros y formularios con Radix"
  ```

---

### Task 6: Estandarizar Control Financiero (Movimientos, CxC, CxP, Bancos, Préstamos, Contabilidad)

**Files:**
- Modify: `src/components/finances/MovimientosView.jsx`
- Modify: `src/components/finances/MovimientoForm.jsx`
- Modify: `src/components/finances/CuentasPorCobrarView.jsx`
- Modify: `src/components/finances/CuentasPorPagarView.jsx`
- Modify: `src/components/finances/BancosCajaView.jsx`
- Modify: `src/components/finances/PrestamosView.jsx`
- Modify: `src/components/finances/ContabilidadView.jsx`

- [ ] **Step 1: Estandarizar Movimientos y Modales de Abono/Detalle**
  Botones de tipo de movimiento (ingreso verde soft, egreso rojo soft) y modales de registro.

- [ ] **Step 2: Estandarizar CxC y CxP**
  Badges de vencimiento en `Badge variant="soft"` y botones de registrar abono/pago.

- [ ] **Step 3: Estandarizar Bancos, Conciliación Inteligente y Préstamos**
  Tablas de amortización y conciliación con tipografía Inter y números monoespaciados alineados.

- [ ] **Step 4: Verificar integridad financiera y tests**
  Run: `npm test`
  Expected: 15 passed, 0 failed.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/finances/MovimientosView.jsx src/components/finances/MovimientoForm.jsx src/components/finances/CuentasPorCobrarView.jsx src/components/finances/CuentasPorPagarView.jsx src/components/finances/BancosCajaView.jsx src/components/finances/PrestamosView.jsx src/components/finances/ContabilidadView.jsx
  git commit -m "style(finanzas): alinear submódulos de control financiero a Radix Themes"
  ```

---

### Task 7: Estandarizar POS, Personas, Suscripción y Ajustes

**Files:**
- Modify: `src/components/finances/PosView.jsx`
- Modify: `src/components/finances/PosProductCard.jsx`
- Modify: `src/components/finances/ThirdPartiesView.jsx`
- Modify: `src/pages/billing/BillingPortal.jsx`
- Modify: `src/components/dashboard/GeneralSettings.jsx`

- [ ] **Step 1: Refinar POS (`PosView.jsx`, `PosProductCard.jsx`)**
  Tarjetas de producto con Inter bold para precios, badges soft de stock y panel lateral de cobro con botones limpios.

- [ ] **Step 2: Estandarizar Directorio de Personas (Clientes y Proveedores)**
  Tabla de terceros con validación SRI y modal de nuevo cliente/proveedor.

- [ ] **Step 3: Refinar Portal de Suscripción (`BillingPortal.jsx`) y Ajustes (`GeneralSettings.jsx`)**
  Tarjetas de planes con listas de características en Inter, barras de consumo `Progress.Root` y switches de módulos de Radix.

- [ ] **Step 4: Verificar tests y build de producción**
  Run: `npm test && npm run build`
  Expected: 15 passed, build code 0.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/finances/PosView.jsx src/components/finances/PosProductCard.jsx src/components/finances/ThirdPartiesView.jsx src/pages/billing/BillingPortal.jsx src/components/dashboard/GeneralSettings.jsx
  git commit -m "style(pos-personas-settings): refinar POS, directorio, suscripcion y ajustes"
  ```

---

### Task 8: Verificación Final Integral y Push a GitHub

**Files:**
- Test suite: `tests/commerce.test.mjs`
- Build output: `dist/`

- [ ] **Step 1: Ejecutar suite completa de tests de comercio y facturación**
  Run: `npm test`
  Expected: 15/15 pass, 0 fail.

- [ ] **Step 2: Ejecutar compilación de producción con Vite**
  Run: `npm run build`
  Expected: exit 0, cero errores de bundling ni imports rotos.

- [ ] **Step 3: Subir a GitHub en la rama main**
  Run: `git push origin main`
  Expected: origin main al día con todos los commits.
