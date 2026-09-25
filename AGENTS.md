# AGENTS.md — Memoria del proyecto

## Proyecto

**proyectos-webfix** — ERP ligero para gestión empresarial (Ecuador).
React 19 + Vite 8 | Tailwind CSS 4 | Firebase | React Router 7

## Walkthroughs activos (ordenados por fecha)

### 1. Design Standardization (2026-07-06) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-07-06-design-standardization-design.md`
**Plan:** `docs/superpowers/plans/2026-07-06-design-standardization-plan.md`

UI estandarizado a **Flat Modern Design** (Token-First). 8 tareas completadas.

**Reglas:** Zero shadows, sin `bg-[#...]`, sin `text-[Npx]`, sin `backdrop-blur`, radius 4-6px, sin dark mode.

### 2. Purchase Module (2026-06-28) — COMPLETADO
**Plan:** `docs/superpowers/plans/2026-06-28-purchase-module-plan.md`
Renombrar "Compras" a "Historial de Compras", integrar `TransactionsView`, renderizar `PurchaseForm`.

### 3. Dashboard & Tabbars (2026-06-27)
**Plan:** `docs/superpowers/plans/2026-06-27-dashboard-and-tabbars-plan.md`
Remover barras de pestañas horizontales, migrar a sidebar navigation.

### 4. Preventas Workflow (2026-06-27)
### 5. Compact Tables (2026-06-27)
### 6. SuperAdmin Sidebar & Tenant Mgmt (2026-06-18)

### 7. Control Financiero — Rediseño Integral (2026-07-22) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-07-22-control-financiero-redesign.md`
**Commits:** `93bdd9a` → `a9abd02` (11 fases + mejoras completadas)

**Módulo reconstruido desde cero con 11 submódulos interconectados:**

| Fase | Submódulo | Estado |
|------|-----------|--------|
| 1 | Movimientos Financieros | ✅ |
| 2 | Cuentas por Cobrar (CxC) | ✅ |
| 3 | Cuentas por Pagar (CxP) | ✅ |
| 4 | Bancos y Caja | ✅ |
| 5 | Tarjetas y Créditos | ✅ |
| 6 | Préstamos Bancarios | ✅ |
| 7 | Captura Inteligente (OCR) | ✅ |
| 8 | Resumen Financiero | ✅ |
| 9 | Contabilidad | ✅ |
| 10 | Impuestos y SRI | ✅ |
| 11 | Reportes Especializados | ✅ |

**Colecciones Firebase creadas:**
- `fin_movimientos` — Registro central de ingresos/egresos
- `fin_cxc` — Cuentas por cobrar con abonos parciales
- `fin_cxp` — Cuentas por pagar con retenciones
- `fin_bancos` — Cuentas bancarias y movimientos
- `fin_tarjetas` — Tarjetas de crédito con consumos diferidos
- `fin_prestamos` — Préstamos con tabla de amortización
- `fin_capturas` — Documentos OCR con IA
- `fin_cuentas` — Plan de cuentas contable
- `fin_centros_costo` — Centros de costo
- `fin_asientos` — Asientos contables
- `fin_auditoria` — Log de auditoría completo

**Mejoras implementadas:**
- ✅ Integración automática Ventas/Compras → módulo financiero
- ✅ Validaciones de integridad de datos (suma partidas, saldos, duplicados, consistencia CxC/CxP)
- ✅ Conciliación bancaria automática con matching inteligente (monto ±0.01, fecha ±3 días, referencia, tercero)
- ✅ Exportación CSV/PDF en todos los reportes
- ✅ Auditoría completa de todas las operaciones
- ✅ Build exitoso, lint limpio

### 8. Radix Themes UI & Eliminación del Módulo de Proyectos (2026-09-17) — COMPLETADO
- **Migración a Radix Themes UI**: Implementación del nuevo sistema de diseño basado en `@radix-ui/themes` con wrappers temáticos (`WebFixTheme`, `controls.jsx`, `layout.jsx`, tokens y CSS unificado).
- **Eliminación del Módulo de Proyectos**: Removido por completo el módulo de proyectos (tablero Kanban, gestión de tareas, Notion-style doc pages, calendario de reuniones y exportador CSV). Preservación total de los módulos ERP (Ventas, Compras, Finanzas, Inventario, Personas, Ajustes, Suscripción y Soporte).

### 9. Control Financiero — Estandarización y Sincronización Integral (2026-09-19) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-09-19-finanzas-redesign-integracion-design.md`
**Plan:** `docs/superpowers/plans/2026-09-19-finanzas-redesign-integracion-plan.md`

- **Encabezados Estandarizados**: Creado `FinancialPageHeader.jsx` e integrado de manera uniforme en las 11 pantallas de finanzas con KPIs, acciones contextuales y navegación por breadcrumb.
- **Sincronización Bancaria Automática**: `bancosService.js` y `integracionFinanzasService.js` registran de forma atómica débitos y créditos en `fin_bancos` y `fin_movimientos_bancarios` en ventas (`TransactionForm`, `PosView`) y compras (`PurchaseForm`).
- **Apertura de Crédito en Caliente & Autorización POS**:
  - `CreditSetupModal.jsx`: Apertura y ajuste inmediato de líneas de crédito en ventas administrativas si el cliente no posee cupo.
  - `PosCreditAuthModal.jsx`: Flujo de autorización con PIN de supervisor en caja POS para cuentas abiertas ("anotar a mi cuenta") o exceso de cupo.
  - Soporte de cobro combinado (e.g. anticipo \$20 por transferencia $\rightarrow$ banco + \$30 a crédito $\rightarrow$ CxC).
- **Ficha Completa de Cliente (`CustomerDetailView.jsx`)**: Sustituido el modal básico por una vista de pantalla completa con switch de activación de crédito, cupo, plazo, garante y balances. En el listado de `ThirdPartiesView.jsx` se añadió columna de crédito y filtros dedicados.
- **Cobros y Pagos Formales (`FinancialPaymentModal.jsx`)**: Reemplazados los prompts nativos en CxC (`CuentasPorCobrarView`) y CxP (`CuentasPorPagarView`) por un modal formal conectado a cuentas bancarias.
- **Pruebas y Build**: 19 tests unitarios aprobados en `tests/commerce.test.mjs`, build de producción verificado con éxito.

### 10. Submódulo Dedicado de Servicios en Inventario (2026-09-19) — COMPLETADO
- **Segregación Total**: Catálogo de Productos (`productos`) filtrado estrictamente a `type !== 'SERVICE'`. Nuevo submódulo dedicado `servicios` (`type === 'SERVICE'`).
- **Vista Especializada (`ServicesView.tsx`)**: KPIs (Total, Activos, Digitales, Categorías), barra de filtros (búsqueda, categorías, modalidades, estados) y tabla de servicios con acciones contextuales.
- **Formulario Mejorado (`ServiceCreationForm.tsx`)**: Modalidades (Digital, Consultoría, Presencial, Mantenimiento, Suscripción, etc.), generador inteligente de SKU (`SRV-DIG-XXXX` / `SRV-XXXX`), vinculación a categorías existentes (`inventory_categories`), unidades expandidas, tarifas SRI (0%, 5%, 15%) y PVP con desglose de IVA.
- **Navegación e Integración Global**: Enlace dedicado en `Sidebar.jsx`, nuevo shortcut en `ShortcutCustomizerModal.jsx`, compatibilidad total en Ventas, Cotizaciones, POS y facturación electrónica SRI sin trabas de stock.
- **Pruebas y Build**: 22 tests unitarios aprobados, compilación limpia en 5.36s.

### 11. Corrección y Modernización de Clientes y Proveedores (2026-09-24) — COMPLETADO
- **Encabezados y KPIs Dedicados (`FinancialPageHeader`)**: Integración uniforme en `ThirdPartiesView.jsx`. Métricas contextuales en tiempo real para Clientes (Total, Con Crédito, Cupo Total Otorgado, Clientes Contado) y Proveedores (Total, Con Plazo/Crédito, Plazo Promedio, Régimen RIMPE/Especial).
- **Corrección de Filtros y Modelado de Proveedores**: Solucionado el bug donde terceros tipo `'ambos'` no se visualizaban en la lista de proveedores. Tabla adaptada con columnas específicas según rol (Términos de Pago, Régimen Fiscal para Proveedores vs Línea de Crédito y Correo Notificación para Clientes).
- **Ficha 360° Adaptativa (`CustomerDetailView.jsx`)**:
  - Distinción dinámica entre Cliente y Proveedor en títulos, términos y ayudas.
  - Sincronización precisa de cartera: consulta `fin_cxc` para clientes y `fin_cxp` para proveedores (saldo pendiente y facturas por pagar).
  - Pestaña de Condiciones Comerciales adaptada para proveedores (Plazo de pago concedido, asesor de ventas, acuerdos comerciales) vs Línea de crédito y garante para clientes.
  - Autocompletado SRI optimizado con asignación de nombre comercial, tipo de contribuyente y checkboxes fiscales de obligación contable y agente de retención.
  - Nueva pestaña de Historial de Comprobantes con listado cronológico de comprobantes vinculados (Ventas/Compras).
- **Cumplimiento Flat Modern**: Cero sombras, avatares con tokens Radix limpios, sin clases de degradados arbitrarios ni tamaños fijos en px. Build limpio y 40 tests unitarios aprobados.

### 12. Rediseño Minimalista de Fila de Producto en Venta Administrativa (2026-09-24) — COMPLETADO
- **Limpieza de Encabezado**: Eliminado subtítulo redundante *"Escribe el nombre, código o escanea para añadir al carrito"* de la tarjeta de ítems.
- **Fila de Producto Unificada y Homogénea**:
  - **Código SKU**: Tipografía mono sutil (`var(--code-font-family)`), sin burbujas ni bordes, números claros y limpios.
  - **Nombre del Producto**: Al frente del SKU con tipografía limpia en negrita (`text-[var(--gray-12)]`).
  - **Descripción Editable en Factura**: Input inline (`h-7`, `bg-[var(--gray-2)]`, sin bordes externos) directamente al frente del nombre para añadir detalles específicos de facturación (series, garantías, notas de entrega) sin alterar el catálogo.
  - **Controles Unificados en Altura (`h-7`)**: Stepper de cantidad, precio unitario (`$XX.XX`), botón de descuento y botón de eliminar tienen exactamente la misma altura (28px), fondo suave sin bordes (`var(--gray-2)` / `var(--red-3)`), compactos y homogéneos.
  - **Alineación y Tipografía Inter Semibold**: Input de descripción acotado (`w-44 sm:w-56`), subtotal ampliado a `w-28` con alineación vertical perfecta con la cabecera `SUBTOTAL`, números en fuente Inter `font-semibold` en cantidad, precio unitario, descuento (`0%` o `-${x}%`) y subtotal. Placeholder del buscador simplificado a *"Buscar productos..."*.
- **Pruebas y Build**: 40 tests unitarios aprobados, compilación limpia en 9.83s.

### 13. Pantalla de Confirmación de Emisión, Notificaciones por Correo Electrónico e Impresión Directa (2026-09-24) — COMPLETADO
- **Desbloqueo de Notificaciones para Notas de Venta y Facturas**:
  - Eliminado bloqueo en `api/send-email/index.js` y `invoiceNotification.js` que impedía el envío de correos en Notas de Venta (Recibos Internos).
  - Eliminado requerimiento estricto de `xmlAutorizado` previo para disparar correos en facturas autorizadas (usando enlaces directos al RIDE / comprobante).
  - Normalizado el remitente y destinatarios: soporte transparente cuando cliente y emisor comparten el mismo buzón para pruebas sin saltar la notificación del cliente.
  - Asuntos y contenidos personalizados: `Comprobante de Venta: N° XXX` (cliente) y `Emitiste comprobante de venta: N° XXX` (emisor) con enlace directo al visor RIDE público por `txId`/`id` sin requerir clave de acceso de 49 dígitos.
- **Visor Público RIDE (`PublicRideView.jsx`)**:
  - Soporte de consulta tanto por `claveAcceso` (SRI electrónico) como por `txId`/`id` (comprobantes internos y notas de venta).
- **Impresión Directa (`RidePreviewModal.jsx` y `TransactionForm.jsx`)**:
  - Nuevo prop `autoPrint`: lanza inmediatamente el diálogo nativo de impresión del navegador (`window.print()`).
  - Botón principal de **"Impresión Directa"** en la pantalla de confirmación.
  - Accesos rápidos en un solo clic para **Ticket Térmico (80mm)** y **Hoja A4 (RIDE)**.
- **Pantalla Integral de Confirmación Post-Emisión (Paso 2 en `TransactionForm.jsx`)**:
  - **Tarjeta Hero de Emisión**: Indicador visual de éxito, secuencial en tipografía monospace/Inter semibold legible, nombre y RUC/CI del cliente, total facturado y clave de acceso SRI.
  - **Tarjeta de Notificaciones por Correo**: Estado en vivo de entrega al cliente y copia de respaldo al emisor (enviando, entregado, fallido o sin correo registrado), con botón para reintentar e input rápido para enviar copia a cualquier correo alternativo en caliente.
  - **Acciones Rápidas**: Impresión directa, descarga de XML autorizado, botón de "Nueva Venta / Emisión" para reiniciar el formulario de inmediato y "Terminar y Salir".
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación de producción exitosa en 12.67s.

### 14. Estandarización de Espaciados, Encabezado Limpio y Eliminación de Submódulo Equipo en Personas (2026-09-24) — COMPLETADO
- **Espaciados y Márgenes Estandarizados**: Eliminado el wrapper `isPersonasActive` en `App.jsx` que forzaba `pb-0 pt-0` y `px-0 py-0` sin márgenes laterales. El módulo de Personas ahora hereda el layout estándar idéntico a Ventas e Inventario (`pb-8 pt-4 px-4 md:px-6` y `max-w-[1600px] mx-auto` con `space-y-4`).
- **Encabezado Homogéneo Tipo Card**: Reemplazado el banner `FinancialPageHeader` por una tarjeta de encabezado estándar (`UiCard`) idéntica a Venta Administrativa, con título a la izquierda (`Gestión de Clientes` / `Gestión de Proveedores`) y botón de acción principal a la derecha (`+ Nuevo Cliente` / `+ Nuevo Proveedor`).
- **Eliminación de Tarjetas de Métricas**: Removidas las 4 tarjetas KPI de la cabecera (Total Clientes, Con Línea de Crédito, Cupo Total Otorgado, Clientes Contado) para un diseño minimalista, despejado y enfocado en la tabla de datos.
- **Eliminación del Submódulo Equipo**: Removido por completo el submódulo "Equipo" del menú lateral `Personas` en `Sidebar.jsx` y sus rutas de navegación en `App.jsx`.

### 15. Eliminación de Métricas en Submódulo de Servicios (2026-09-24) — COMPLETADO
- **Eliminación de Tarjetas de Métricas**: Removidas las 4 tarjetas KPI de la cabecera en `ServicesView.tsx` (Total Servicios, Servicios Activos, Servicios Digitales, Categorías Utilizadas).
- **Diseño Minimalista**: La vista ahora inicia directamente en la barra de herramientas y filtros rápidos, despejando el espacio visual y enfocando la interacción en el catálogo y acciones de servicios.

### 16. Estandarización y Rediseño de Suscripción y Facturación SaaS (2026-09-24) — COMPLETADO
- **Eliminación de Vacíos Laterales (`max-w-5xl`)**: Removida la restricción artificial de ancho que provocaba enormes espacios vacíos en los costados. Ahora utiliza el contenedor completo y homogéneo del ERP (`w-full space-y-4` dentro de `max-w-[1600px]`).
- **Encabezado Homogéneo Tipo Card (`UiCard`)**: Estandarizado con tarjeta de cabecera idéntica a Clientes, Proveedores y Venta Administrativa. Muestra el título contextual del submódulo activo, descripción clara y píldora con el estado del plan actual y días de prueba restantes.
- **Barra de Submódulos Rápida**: Barra de pestañas integrada con iconos para navegar fluidamente entre Facturación Electrónica, Páginas Web, Correos Corporativos, WhatsApp CRM e Historial de Pagos, sincronizada bidireccionalmente con el Sidebar.
- **Grid Balanceado Catálogo y Resumen de Pago**: Distribución responsive (8 columnas para planes y 4 columnas para resumen de pago y checkout), tarjetas de planes con tipografía limpia en números Inter, badge recomendado y selección instantánea.
- **Historial de Pagos de Ancho Completo**: Tabla organizada con estados visuales claros (Aprobado, Pendiente, Rechazado) y estados vacíos amigables.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación de producción exitosa en 14.08s.

### 17. Rediseño de Login y Corrección Global de Iconos Montados en Inputs (2026-09-24) — COMPLETADO
- **Causa Raíz Diagnosticada**: `UiInput` envuelve el componente compuesto `TextField.Root` de Radix UI Themes. Al colocar iconos flotantes con posicionamiento absoluto (`absolute left-3` o `left-0 pl-3.5`) por fuera del input, el texto interno y placeholder de Radix no tenía indentación sincronizada, montando y sobreponiendo los iconos directamente sobre el texto/placeholder en todo el sistema.
- **Estandarización Radix Slot (`iconPrefix` / `iconSuffix`)**:
  - `controls.jsx` y `radixTheme.css`: Normalizado el uso de `TextField.Slot` nativo con `iconPrefix` e `iconSuffix`. Se configuró flex alignment, `flex-shrink: 0`, color base `var(--gray-10)` y transición a `var(--accent-9)` al hacer focus.
  - Sanitizado automático de clases residuales `pl-*` y estilos inline de padding que antes causaban distorsiones.
- **Rediseño Integral de Inicio de Sesión (`LoginPage.jsx`)**:
  - Eliminados fondos antiguos de burbujas animadas y partículas líquidas estridentes.
  - Nuevo diseño **Flat Modern**: textura sutil de cuadrícula geométrica sobre `var(--gray-1)`, tarjeta centrada limpia en `var(--color-panel-solid)` con bordes `var(--gray-a5)` y cero sombras.
  - Cabecera con logo de empresa o WebFix, títulos claros y mensaje descriptivo.
  - Campos de Correo y Contraseña estilizados con `iconPrefix={<Mail />}` y `iconPrefix={<Lock />}`.
  - Toggle de visibilidad de contraseña integrado en `iconSuffix` sin solapamiento ni descuadres.
  - Alerta de errores estilizada con `AlertCircle` y colores semánticos suaves.
  - Botón principal con estados de verificación y enlace limpio a registro.
- **Saneamiento en Todo el Sistema (14 Pantallas y Submódulos Corregidos - 0 Incidencias Residuales)**:
  - `LoginPage.jsx` & `RegisterPage.jsx`: Reemplazados todos los iconos flotantes de usuario, empresa, correo y contraseña por `iconPrefix`.
  - `CuentasPorCobrarView.jsx` & `CuentasPorPagarView.jsx`: Buscadores actualizados a `iconPrefix={<Search />}`.
  - `ContabilidadView.jsx` & `MovimientosView.jsx`: Buscadores de asientos y transacciones actualizados a `iconPrefix={<Search />}`.
  - `ComprasSriView.jsx`: Buscador principal y buscador de productos modal actualizados con `iconPrefix` e `iconSuffix` para limpiar texto.
  - `PurchaseForm.jsx`: Buscador de proveedores y buscador de productos actualizados con `iconPrefix={<Search />}`.
  - `ReportesView.jsx`: Buscadores de auditoría y cartera actualizados con `iconPrefix={<Search />}`.
  - `TransactionForm.jsx`: Buscador de cliente, buscador de productos y montos de pago (efectivo, transferencia, tarjeta, crédito) actualizados con `iconPrefix`.
  - `MovimientoAbono.jsx`: Input de monto actualizado con `iconPrefix={<DollarSign />}`.
  - `ServiceCreationForm.tsx`: Campos de SKU, Nombre, Plazo, Costo y Margen actualizados con `iconPrefix`.
  - `ProductCreationForm.tsx`: Campos de SKU, Nombre, Costo Base, Precios sin/con IVA y precio manual actualizados con `iconPrefix`.
  - `SuperAdminPage.jsx`: Buscador general migrado a `UiInput` con `iconPrefix={<Search />}`.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 11.63s.

### 18. Eliminación de Líneas Divisoras en Secciones de Venta Administrativa (2026-09-24) — COMPLETADO
- **Eliminación de Bordes Inferiores**: Removidas las líneas divisoras sutiles (`border-b border-[var(--gray-a4)] pb-2.5`) ubicadas directamente debajo de los títulos "Datos de Cliente" y "Productos y Servicios" en `TransactionForm.jsx`.
- **Acabado Limpio**: Los encabezados de sección quedan fluidos, directos e integrados sin cortes de línea, manteniendo el diseño minimalista homogéneo del formulario.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 5.62s.

## Últimos commits
```
cec7a71 fix(superadmin): utilizar UiInput con iconPrefix en buscador para eliminar icono montado
0472054 feat(billing): estandarizar diseno de suscripcion, eliminar vacios laterales y sincronizar submodulos
b27f571 docs: actualizar hash 792350c en AGENTS.md
792350c feat(servicios): eliminar metricas kpi de la cabecera en ServicesView
```



