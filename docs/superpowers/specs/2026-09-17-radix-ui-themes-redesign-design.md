# Spec Exhaustivo: Rediseño Integral de Todo el ERP con Radix Themes 3.0 & Tipografía Inter

- **Fecha:** 2026-09-17
- **Alcance:** Barrido completo de la totalidad del sistema ERP (todos los módulos, submódulos, pantallas, subpantallas, tablas, formularios, modales y popups).
- **Objetivo Central:** Alinear cada rincón de la plataforma al lenguaje visual oficial de **Radix Themes 3.0** (referencia oficial visual), aplicando **Tipografía Inter** universalmente, botones de tabla en formato **Radix Soft Colorido**, y reemplazando cualquier botón o control plano/saturado o etiqueta cruda por componentes nativos de Radix.

---

## 1. Fundamentos Globales del Sistema de Diseño

### 1.1. Tipografía Universal: Inter
- **Fuente**: `Inter` de Google Fonts (pesos 300, 400, 500, 600, 700) con `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`.
- **Aplicación obligatoria**: Se elimina `Geist` de `index.html`, `index.css` y `designTokens.css`.
- **Variables**: `--font-sans: 'Inter', -apple-system, sans-serif;` y `--default-font-family: 'Inter', -apple-system, sans-serif;`.
- **Regla estricta**: `body`, `#root`, `.radix-themes`, `.webfix-theme`, títulos, botones, tablas, tooltips, formularios y badges heredan Inter en toda la app.
- **Códigos y RUCs**: Para claves de acceso del SRI, RUCs y montos numéricos en tablas se usa tipografía monoespaciada limpia (`JetBrains Mono` / `ui-monospace`) con `font-variant-numeric: tabular-nums`.

### 1.2. Paleta de Colores y Tokens Radix Themes 3.0
- **Acento Principal**: `blue` (o `indigo`) nativo de Radix:
  - Sólido principal: `var(--accent-9)`
  - Hover sólido: `var(--accent-10)`
  - Fondo suave (Soft): `var(--accent-3)`
  - Borde suave: `var(--accent-a6)`
  - Texto e icono de alto contraste en Soft: `var(--accent-11)`
- **Escala de Grises**: `slate` nativo de Radix:
  - Fondo general de la app: `var(--gray-2)` (#F8FAFC)
  - Fondo de paneles y tarjetas: `var(--color-panel-solid)` (#FFFFFF)
  - Fondo de barra lateral: `var(--gray-1)` (#FCFCFD)
  - Bordes hairline: `var(--gray-a4)` y `var(--gray-a6)`
  - Textos principales: `var(--gray-12)` (#111827)
  - Textos secundarios: `var(--gray-11)` (#64748B)
- **Radios de Borde (Border Radius)**:
  - Tarjetas y Modales: `var(--radius-4)` (10-12px)
  - Botones e Inputs: `var(--radius-3)` (6-8px)
  - Badges y Tags: `var(--radius-2)` (4-6px) o pill `rounded-full`
- **Sombras (Shadows)**:
  - Estricto estilo Radix: Cero sombras oscuras duras. Únicamente elevación ambiental sutil `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)` o delimitación por borde hairline `1px solid var(--gray-a4)`.

### 1.3. Estandarización de Botones de Tabla: "Radix Soft Colorido"
Todo botón de acción en tablas (Archivos, Acciones, Despacho, Abonos) abandona las etiquetas `<a>` con `style` manual y los botones `variant="solid"` saturados, adoptando el estándar:
- **Tamaño**: `size="1"` uniforme (28x28px en `iconOnly`).
- **Forma**: `radius="medium"` (6px) con flex centrado perfecto.
- **Transición**: Transición suave a opacidad 90% y micro-elevación en hover.
- **Archivos**:
  - **XML**: `UiButton iconOnly variant="soft" color="blue" size="1"` (`var(--blue-3)` fondo, `var(--blue-11)` icono). Si no existe: `variant="ghost" color="gray"` disabled (opacidad 35%).
  - **PDF**: `UiButton iconOnly variant="soft" color="red" size="1"` (`var(--red-3)` fondo, `var(--red-11)` icono). Si no existe: `variant="ghost" color="gray"` disabled.
  - **RIDE / Ver**: `UiButton iconOnly variant="soft" color="amber" size="1"` (`var(--amber-3)` fondo, `var(--amber-11)` icono).
  - **Correo**: `UiButton iconOnly variant="soft" color="indigo" size="1"` (`var(--indigo-3)` fondo, `var(--indigo-11)` icono).
- **Acciones**:
  - **Editar / Ver Detalle**: `UiButton iconOnly variant="soft" color="gray" size="1"` con hover hacia azul.
  - **Eliminar**: `UiButton iconOnly variant="soft" color="red" size="1"` (o `variant="ghost" color="red"`).

---

## 2. Inventario Detallado y Aplicación por Módulo y Pantalla

### 2.1. SHELL GENERAL, TOPBAR Y SIDEBAR (`App.jsx`, `Sidebar.jsx`)
- **Topbar**:
  - Buscador global `⌘K`: Migrar de `UiCard` genérico a `TextField.Root size="2" variant="surface"` con `TextField.Slot` para `<Search size={14} />` a la izquierda y `<kbd>` estilizado a la derecha.
  - Botón "Punto de Venta": `UiButton variant="solid" color="blue" size="2"` con tipografía Inter medium.
  - Botón "Asistente AI": `UiButton variant="soft" color="gray" size="2"`.
  - Botones Menú lateral y Ajustes: `UiButton iconOnly variant="ghost" color="gray" size="2"`.
  - Badge "Facturación Electrónica": `Badge variant="soft" color="green"` con indicador luminoso animado.
  - Diálogo de confirmación global (`globalConfirmDialog`): Rediseñado con `Dialog.Root` de Radix, icono de alerta ámbar suave y botones `variant="solid"` (Aceptar) y `variant="outline"` (Cancelar).
  - Notificaciones Toasts: Tarjetas flotantes `UiCard` con fondo blanco puro, borde `1px solid var(--gray-a4)` e iconos semánticos suaves.
- **Sidebar (`Sidebar.jsx`)**:
  - Fondo limpio `var(--gray-1)`, borde derecho `1px solid var(--gray-a4)`.
  - Items de menú: Inter (13px, weight 500). Estado inactivo `hover:bg-[var(--gray-a3)] text-[var(--gray-11)]`. Estado activo `bg-[var(--accent-3)] text-[var(--accent-11)] font-semibold`.
  - Submenús desplegables: Línea guía izquierda en `var(--gray-a4)` y enlaces indentados con hover sutil.
- **Drawer de Equipo (`drawerUser`)**:
  - Panel deslizante con fondo `var(--color-panel-solid)`, borde izquierdo `1px solid var(--gray-a4)`, títulos en `UiHeading size="4"`, inputs con `UiInput` y `UiSelect` nativos, y selector de colores de avatar circulares con anillo activo de Radix.

---

### 2.2. MÓDULO 1: DASHBOARD GENERAL ("Mi espacio")
- **Archivo**: `src/components/dashboard/ErpDashboard.jsx`
- **Tarjetas de KPIs Superiores**:
  - `UiCard` con fondo blanco puro, radio 12px, borde hairline.
  - Valores numéricos en `UiHeading size="6"` en Inter bold con métricas de comparación en `Badge variant="soft"` verde (positivo) o rojo (negativo).
- **Gráficos y Tendencias**:
  - Contenedor en `UiCard`, selector de períodos con `UiSelect size="1"`.
- **Tablas de Comprobantes Recientes**:
  - `UiTable variant="surface"`, badges de estado SRI en `Badge variant="soft"` y botones de acción rápida en `variant="soft"` o `variant="ghost"`.
- **Banners y Alertas SRI**:
  - Reemplazo de alertas estridentes por `Callout.Root variant="soft"` de Radix en ámbar o azul.

---

### 2.3. MÓDULO 2: VENTAS Y FACTURACIÓN ELECTRÓNICA
- **Contenedor**: `src/components/finances/FinanceModule.jsx` (`mode="ventas"`)

#### A. Submódulo: Historial de Ventas (`resumen_ventas`)
- **Archivo**: `src/components/finances/TransactionsView.jsx`
- **Barra de Herramientas Superior**:
  - Botón principal "+ Registrar Venta": `UiButton variant="solid" color="blue" size="2"`.
  - Input de búsqueda: `UiInput size="2"` con slot de lupa integrado.
  - Selectores (Mes, Año, Tipo): `UiSelect size="2"` con menús flotantes Radix.
- **Tabla de Ventas**:
  - Encabezados: Fecha, Documento, Tercero, Total, Estado SRI, Archivos, Acciones.
  - **Columna Archivos**: Estandarizada con **Radix Soft Colorido** (XML en azul soft, PDF en rojo soft, RIDE en ámbar soft, Correo en índigo soft).
  - **Columna Acciones**: Editar en gris soft, Eliminar en rojo soft.
  - **Estado SRI**: `Badge variant="soft" color="green"` (Autorizado), `Badge variant="soft" color="blue"` (Registrado/Nota de Venta).
- **Popups y Modales**:
  1. `RidePreviewModal.jsx`: Modal de previsualización RIDE oficial. Contenedor Radix Dialog con barra de herramientas de impresión (`UiButton variant="solid" color="blue"`) y descarga de PDF.
  2. Modal de Envío de Correo (`emailModalTx`): `Dialog.Root` con `UiInput` para email de destino y botones Radix `variant="solid"` (Enviar) y `variant="soft"` (Cancelar).

#### B. Submódulo: Registrar Venta Administrativa (`ventas_preventa`)
- **Archivo**: `src/components/finances/TransactionForm.jsx`
- **Formulario de Emisión**:
  - Cabecera: Selector de cliente con búsqueda predictiva SRI, selector de tipo de documento (Factura, Nota de Venta), fecha con `UiInput type="date"`.
  - Tabla de Ítems / Productos:
    - Inputs de cantidad, precio unitario y descuento usando `UiInput size="2"` con slots numéricos.
    - Selector de IVA (15%, 0%, No objeto) con `UiSelect size="2"`.
    - Botón de eliminar fila en `UiButton iconOnly variant="ghost" color="red" size="1"`.
    - Botón "+ Agregar Ítem": `UiButton variant="soft" color="blue" size="2"`.
  - Panel de Totales: `UiCard` lateral con desglose de Subtotal 15%, Subtotal 0%, Descuentos, IVA y Total en tipografía Inter destacada.
  - Sección de Pago: Selección de método (Efectivo, Tarjeta, Transferencia, Crédito con plazo).
  - Botones de pie: `UiButton variant="solid" color="blue" size="3"` ("Emitir y Autorizar SRI") y `UiButton variant="soft" color="gray"` ("Guardar Borrador").

#### C. Submódulo: Punto de Venta (POS) (`pos`)
- **Archivo**: `src/components/finances/PosView.jsx` y `PosProductCard.jsx`
- **Barra de Búsqueda y Filtro de Categorías**:
  - Píldoras de categoría usando `UiButton variant="soft"` / `variant="surface"` con Inter medium.
  - Input de búsqueda rápida de producto/código de barras con slot de lupa.
- **Catálogo de Productos (`PosProductCard.jsx`)**:
  - Tarjetas compactas con imagen, nombre (Inter 500), precio en Inter bold y stock disponible con `Badge variant="soft"`. Micro-interacción suave al hacer clic para agregar al carrito.
- **Panel Lateral de Carrito y Cobro**:
  - Listado de ítems con botones de ajuste `+` y `-` en `UiButton iconOnly variant="soft" color="gray" size="1"`.
  - Calculadora de Cambio y formas de pago rápidas con botones estilizados en Radix.
  - Modal de Cierre de Caja / Arqueo diario: `Dialog.Root` con inputs de conteo de efectivo y reporte impreso térmico.

#### D. Submódulo: Preventas y Pedidos Anticipados (`preventas`)
- **Archivo**: `TransactionsView.jsx` (`isPreventaTab={true}`)
- **Tabla de Preventas**:
  - Columna Despacho: `Badge variant="soft" color="green"` ("Entregado") o `UiButton variant="soft" color="amber" size="1"` ("Pendiente / Despachar").
  - Botón de conversión a Factura Electrónica en `UiButton variant="soft" color="blue" size="1"`.

#### E. Submódulo: Cotizaciones Comerciales (`quotes`)
- **Archivo**: `src/components/finances/QuotesView.jsx`
- **Tabla de Cotizaciones**:
  - Estados en `Badge variant="soft"`: Aprobada (verde), Pendiente (ámbar), Vencida (rojo).
  - Acciones: Ver PDF cotización, Enviar por email, Convertir en Venta directa.
- **Modal de Nueva Cotización**:
  - Formulario en `Dialog.Root` con vigencia en días, términos comerciales y desglose de artículos.

#### F. Submódulo: Notas de Crédito de Venta (`nota_credito`)
- **Archivo**: `TransactionsView.jsx` (filtrado `nota_credito`)
- Tabla y modal de vinculación con la factura original autorizada por el SRI y motivo de anulación/devolución.

#### G. Submódulo: Retenciones de Venta Recibidas (`retencion`)
- **Archivo**: `TransactionsView.jsx` (filtrado `retencion`)
- Registro de retenciones recibidas de clientes con desglose de porcentaje de retención IVA (30%, 70%, 100%) y Renta (1%, 1.75%, 2.75%, 10%).

#### H. Submódulo: Descuentos & Promociones Comerciales (`discounts`)
- **Archivo**: `src/components/finances/DiscountsPromotionsView.jsx`
- **Tabs Radix**: `Tabs.Root` con `Tabs.List` y `Tabs.Trigger` para alternar entre "Descuentos por Producto" y "Reglas de Promoción".
- **Modales de Creación**:
  - Formulario de descuento con porcentaje/monto fijo y fechas de vigencia.
  - Formulario de promoción (2x1, combos, precios especiales por volumen).

---

### 2.4. MÓDULO 3: COMPRAS Y FACTURAS RECIBIDAS
- **Contenedor**: `src/components/finances/FinanceModule.jsx` (`mode="compras"`)

#### A. Submódulo: Historial de Compras (`compras_resumen`)
- **Archivo**: `TransactionsView.jsx` (egreso)
- Zona Drag-and-Drop de IA: Contenedor con borde discontinuo `var(--gray-a6)`, fondo suave y botón de carga manual.
- Tabla de facturas de proveedores: Columnas con **Radix Soft Colorido** para XML, PDF y acciones.

#### B. Submódulo: Registrar Compra de Proveedor
- **Archivo**: `src/components/finances/PurchaseForm.jsx`
- **Formulario Completo de Compra**:
  - Input de 15 dígitos de número de factura con validación de máscara `001-001-000000001`.
  - Número de autorización del SRI (49 dígitos numéricos en tipografía monoespaciada).
  - Selector de sustento tributario SRI con `UiSelect`.
  - Detalle de compra: Base imponible 15%, Base 0%, IVA, y retención a emitir.
  - Botones de acción: `UiButton variant="solid" color="blue"` ("Guardar Compra") y botón opcional de generar retención electrónica inmediata.

#### C. Submódulo: Facturas Recibidas SRI (`compras_sri`)
- **Archivo**: `src/components/finances/ComprasSriView.jsx`
- Sincronización automática con el portal SRI. Tabla comparativa entre lo reportado en SRI y lo registrado en WebFix.
- Botones de conciliar / registrar automático en `UiButton variant="soft" color="blue" size="1"`.

#### D. Submódulo: Gastos Asistidos con IA (`compras_gastos`)
- **Archivo**: `src/components/finances/ComprasGastosView.jsx`
- Carga de imágenes o comprobantes físicos. Visualización de resultados de extracción de Gemini en `UiCard` con inputs editables antes de confirmar el egreso.

#### E. Submódulo: Retenciones Emitidas a Proveedores (`compras_retencion`)
- Emisión de comprobantes de retención electrónica según normativa SRI con previsualización RIDE.

---

### 2.5. MÓDULO 4: CONTROL FINANCIERO INTEGRAL
- **Contenedor**: `src/components/finances/FinanceModule.jsx` (`mode="contabilidad"`)

#### A. Submódulo: Resumen Financiero (`dashboard` / `resumen_financiero`)
- **Archivos**: `src/components/finances/FinanceDashboard.jsx` y `ResumenFinancieroView.jsx`
- Métricas consolidadas: Flujo de caja neto, saldo en bancos, cuentas por cobrar vs pagar.
- Tarjetas destacadas con fondo suave temático (`var(--green-3)` para ingresos, `var(--red-3)` para gastos, `var(--blue-3)` para liquidez).

#### B. Submódulo: Movimientos Financieros (`movimientos`)
- **Archivo**: `src/components/finances/MovimientosView.jsx`
- Tabla del libro de ingresos y egresos con indicador de tipo (Ingreso verde soft, Egreso rojo soft).
- **Modales asociados**:
  1. `MovimientoForm.jsx`: Modal `Dialog.Root` para registrar nuevo ingreso o gasto directo, con selección de cuenta origen/destino, centro de costo y comprobante adjunto.
  2. `MovimientoDetalle.jsx`: Vista modal de trazabilidad completa de la transacción.
  3. `MovimientoAbono.jsx`: Modal para registrar abonos con actualización en tiempo real de saldos.

#### C. Submódulo: Cuentas por Cobrar (CxC) (`cxc`)
- **Archivo**: `src/components/finances/CuentasPorCobrarView.jsx`
- Cartera de clientes: Tabla con vencimientos, días de atraso destacados con `Badge variant="soft"` (Vigente en verde, Por vencer en amarillo, Vencido en rojo).
- Modal de Cobro / Abono con recibo de caja imprimible.

#### D. Submódulo: Cuentas por Pagar (CxP) (`cxp`)
- **Archivo**: `src/components/finances/CuentasPorPagarView.jsx`
- Deudas con proveedores: Programación de pagos con alertas de vencimiento y modal de pago a proveedor con emisión de comprobante de egreso.

#### E. Submódulo: Bancos y Caja (`bancos`)
- **Archivo**: `src/components/finances/BancosCajaView.jsx`
- Tarjetas de cuentas bancarias (Banco Pichincha, Guayaquil, Pacífico, Caja General) con saldos contables y disponibles.
- **Herramienta de Conciliación Bancaria**: Interfaz de cruce lado a lado entre extracto bancario y movimientos contables con sugerencias automáticas de matching por monto (±0.01) y fecha (±3 días).
- Modal de creación de cuenta bancaria con número de cuenta y tipo.

#### F. Submódulo: Tarjetas y Créditos Corporativos (`tarjetas`)
- **Archivo**: `src/components/finances/TarjetasCreditosView.jsx`
- Tarjetas corporativas con barra de progreso de cupo utilizado (`Progress.Root` de Radix).
- Modal de registro de tarjeta, fecha de corte y desglose de consumos diferidos con tasa de interés.

#### G. Submódulo: Préstamos Bancarios (`prestamos`)
- **Archivo**: `src/components/finances/PrestamosView.jsx`
- Simulación y seguimiento de créditos bancarios. Tabla de amortización francesa/alemana con columnas: N° Cuota, Fecha, Capital, Interés, Seguro y Saldo.
- Botón de registrar pago de cuota con asiento automático.

#### H. Submódulo: Captura Inteligente OCR (`captura`)
- **Archivo**: `src/components/finances/CapturaInteligenteView.jsx`
- Interfaz interactiva de escaneo y revisión de campos detectados por IA.

#### I. Submódulo: Contabilidad & Plan de Cuentas (`contabilidad_tab`)
- **Archivo**: `src/components/finances/ContabilidadView.jsx`
- Árbol jerárquico del Plan de Cuentas NIIF con niveles expandibles y códigos contables en tipografía monoespaciada.
- Libro Diario: Asientos contables con suma de Debe y Haber balanceada.
- Modal de Nuevo Asiento Manual con validación de partida doble en tiempo real.

#### J. Submódulo: Impuestos & SRI (`impuestos`)
- **Archivo**: `src/components/finances/ImpuestosSriView.jsx`
- Resumen fiscal mensual: Cruce de IVA a pagar/crédito tributario, retenciones acumuladas y botón de exportar XML del Anexo ATS con validación previa.

#### K. Submódulo: Reportes Especializados (`reportes`)
- **Archivos**: `src/components/finances/ReportesView.jsx` y `ReportsView.jsx`
- Selector de reportes (Balance General, Estado de Pérdidas y Ganancias, Flujo de Efectivo, Reporte de Ventas por Producto/Cliente).
- Botones de exportación: `UiButton variant="soft" color="green"` ("Exportar Excel/CSV") y `UiButton variant="soft" color="red"` ("Exportar PDF").

---

### 2.6. MÓDULO 5: INVENTARIO Y CATÁLOGO
- **Contenedor**: `src/components/inventory/InventoryModule.tsx`

#### A. Submódulo: Catálogo de Productos (`productos`)
- **Archivos**: `InventoryModule.tsx`, `ProductCreationForm.tsx`, `AdjustmentModal.tsx`, `TransferModal.tsx`
- Tabla de productos con imagen miniatura, SKU en fuente monoespaciada, stock actual, costo, precio de venta, margen de ganancia y estado de stock (`Badge variant="soft"` verde si hay stock, amarillo si está en mínimo, rojo si está agotado).
- **Modales asociados**:
  1. `ProductCreationForm.tsx`: Formulario de creación/edición de producto con pestañas Radix (Datos Generales, Precios e Impuestos SRI, Inventario y Stock, Combos).
  2. `AdjustmentModal.tsx`: Modal para ingreso/salida de inventario con motivo (Merma, Conteo físico, Devolución).
  3. `TransferModal.tsx`: Modal para transferir stock entre sucursales o bodegas.

#### B. Submódulo: Catálogo de Servicios (`servicios`)
- **Archivo**: `ServiceCreationForm.tsx`
- Catálogo de servicios profesionales, consultorías e intangibles exentos de stock físico con parametrización de IVA del SRI.

#### C. Submódulo: Categorías y Marcas (`categorias`)
- **Archivo**: `CategoryBrandModal.tsx`
- Gestión de categorías de productos y marcas con modal Radix Dialog.

---

### 2.7. MÓDULO 6: PERSONAS (CLIENTES, PROVEEDORES Y EQUIPO)
- **Contenedor**: `src/components/finances/FinanceModule.jsx` (`mode="personas"`) y `App.jsx` (`activePageId === 'team'`)

#### A. Submódulo: Clientes (`cliente`)
- **Archivo**: `src/components/finances/ThirdPartiesView.jsx`
- Tabla de clientes con RUC/Cédula, nombre comercial, email, teléfono y cupo de crédito otorgado.
- Modal de Crear / Editar Cliente con consulta automática de datos RUC en el SRI.

#### B. Submódulo: Proveedores (`proveedor`)
- **Archivo**: `src/components/finances/ThirdPartiesView.jsx`
- Directorio de proveedores con clasificación tributaria (Contribuyente Especial, Régimen RIMPE Emprendedor/Negocio Popular, General).

#### C. Submódulo: Directorio del Equipo & Roles (`team`)
- **Archivo**: `App.jsx`
- Cuadrícula de tarjetas de miembros con avatar estilizado con tokens Radix, cargo, rol (Admin, Miembro, Observador) en `Badge variant="soft"` y botones de editar/eliminar miembro.

---

### 2.8. MÓDULO 7: SUSCRIPCIÓN Y PLANES SAAS (`billing`)
- **Archivo**: `src/pages/billing/BillingPortal.jsx`
- Selector de pestañas Radix: Facturación Electrónica, Hosting y Páginas Web, Correos Corporativos, WhatsApp CRM, Historial de Pagos, Planes.
- Visualización de consumo de comprobantes emitidos con barras de progreso Radix `Progress.Root`.
- Catálogo de Planes SaaS (Starter, Professional, Enterprise) con tarjetas destacadas, lista de características con checkmarks verdes suaves y botón de suscripción `UiButton variant="solid" color="blue"`.
- Modal de reporte de pago por transferencia bancaria con carga de comprobante.

---

### 2.9. MÓDULO 8: AJUSTES Y CONFIGURACIÓN GENERAL (`general_settings`)
- **Archivo**: `src/components/dashboard/GeneralSettings.jsx`
- **Pestañas de Configuración**:
  - Datos de Empresa y Facturación Electrónica: Carga de archivo `.p12`, contraseña protegida con botón de mostrar/ocultar, datos tributarios y logo comercial.
  - Configuración de Servidor de Correo SMTP: Credenciales para envío automático de comprobantes a clientes.
  - Integración con IA (Gemini API Key) y Google Workspace.
  - Copia de Seguridad: Botón `UiButton variant="soft" color="blue"` para descargar backup JSON completo.
  - Gestión de Módulos ERP Activos: Switches redondeados de Radix para activar/desactivar módulos según las necesidades del negocio.

---

### 2.10. MÓDULO 9: SOPORTE TÉCNICO Y SERVICIOS
- **Archivos**: `src/components/dashboard/SupportModule.jsx` y `HiringServicesModule.jsx`
- Formulario de solicitud de soporte con `UiSelect` de módulo afectado, nivel de urgencia (`Badge variant="soft"`), descripción y botón de envío.
- Catálogo de servicios adicionales WebFix con tarjetas presentadas con estética Radix Themes.

---

### 2.11. PÁGINAS DE ACCESO Y PÚBLICAS
- **`LoginPage.jsx` y `RegisterPage.jsx`**:
  - Tarjeta central centrada en fondo `var(--gray-2)`, inputs limpios con slot de correo y candado, botón principal `variant="solid"` e Inter bold.
- **`PublicRideView.jsx`**:
  - Previsualización pública limpia del comprobante electrónico SRI accesible por los clientes finales sin necesidad de login.
- **`SuperAdminPage.jsx`**:
  - Panel multi-tenant para supervisar empresas clientes, estados de suscripción, módulos contratados y planes.
- **Landing Pages (`src/pages/landing/*`)**:
  - Header, Hero, Sección de Características, Tabla de Precios y Footer sincronizados con tipografía Inter y componentes de botón Radix.

---

## 3. Plan de Estandarización de Controles (`src/components/ui/`)

1. **`controls.jsx`**:
   - **`UiButton`**: Garantizar soporte de prop `asChild` para que enlaces `<a href=... download>` adquieran automáticamente todas las clases, tamaños, colores y variantes de `IconButton` o `Button` de Radix Themes.
   - **`UiInput`**: Añadir soporte para slots decorativos (`iconPrefix`, `iconSuffix`) usando `TextField.Slot` nativo de Radix sin requerir clases manuales como `pl-9`.
   - **`UiSelect`**: Asegurar que las opciones de dropdown se rendericen con altura adecuada, tipografía Inter y estados activos consistentes.
   - **`UiTable`**: Estandarizar variante `variant="surface"` con bordes hairline limpios y cabecera semibold.
2. **`layout.jsx`**:
   - `UiCard`: Asignar por defecto `variant="surface"` de Radix, eliminando cualquier sombra invasiva.
   - `UiBox`: Wrapper de diseño transparente que no interfiera con las variables CSS de Radix.
   - `UiText` y `UiHeading`: Forzar tipografía Inter con los tamaños de escala tipográfica oficial de Radix (1 al 9).
3. **`badge.jsx`**:
   - Estandarizar para que todas las variantes (`success`, `warning`, `destructive`, `info`, `secondary`) utilicen **`variant="soft"`** por defecto con sus colores correspondientes (`green`, `amber`, `red`, `blue`, `gray`).

---

## 4. Matriz de Verificación y Criterios de Aprobación

| Prueba | Comando / Criterio | Resultado Esperado |
|---|---|---|
| Tests Unitarios | `npm test` | 15/15 pruebas pasando exitosamente. |
| Build de Producción | `npm run build` | Compilación con Vite sin errores ni advertencias de sintaxis. |
| Inspección Tipográfica | Inspección en navegador | Fuente `Inter` activa en el 100% de los elementos visibles. Cero fuentes Geist. |
| Inspección de Tablas | `TransactionsView`, `ComprasGastosView`, `ProductsView`, etc. | Columna Archivos con botones `variant="soft"` (azul, rojo, ámbar, índigo). Cero botones sólidos toscos o links desalineados. |
| Inspección de Inputs | Filtros y Formularios | Inputs con slots limpios de Radix, sin padding roto ni estilos desajustados. |
