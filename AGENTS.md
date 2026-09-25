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

### 19. Resaltado de Tipo de Documento y Ficha de Cliente en Verde Difuminado (2026-09-24) — COMPLETADO
- **Selector de Tipo de Documento Dinámico**:
  - **Estado inicial / reposo**: Resaltado suave con estilo superficial azul idéntico al botón *Añadir* (`variant="surface"` con fondo `var(--blue-2)`, borde `var(--blue-7)` y texto `var(--blue-11)` semibold).
  - **Al seleccionar**: Se transforma y permanece (`se quede`) con fondo azul sólido vibrante (`var(--accent-9)`), texto blanco brillante en negrita (`!text-white font-bold`) y chevron blanco.
- **Ficha de Cliente Seleccionado en Verde Difuminado**:
  - Eliminado el fondo gris opaco (`var(--gray-2)`).
  - Contenedor compacto en verde difuminado suave (`bg-[#e6f4ea] border border-[#ceead6] dark:bg-emerald-950/40 dark:border-emerald-800/60`).
  - Letras negras de alta legibilidad (`text-black dark:text-white font-bold`) para los datos del cliente (Razón Social, RUC/CI, Teléfono/Correo), sin checks ni títulos adicionales.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 5.52s.

### 20. Eliminación Integral de Dobles Bordes en Tablas y Tarjetas (2026-09-24) — COMPLETADO
- **Causa Raíz Resuelta en Tablas (`UiTable` / `Table.Root`)**:
  - `UiTable` configurado por defecto con `variant="ghost"` en `src/components/ui/controls.jsx`.
  - En `src/radixTheme.css`, regla `.rt-TableRoot { border: none !important; background-color: transparent !important; }`.
  - El contenedor exterior (`UiBox` o `UiCard`) actúa como el único dueño legítimo del borde (`1px solid var(--gray-a6)`), radio y scroll horizontal, eliminando de raíz el doble borde perimetral y superior en las 63 tablas del ERP (Ventas, Compras, Finanzas, Inventarios, Personas).
- **Causa Raíz Resuelta en Tarjetas (`UiCard`)**:
  - En `src/radixTheme.css`, regla `.rt-Card { border: none !important; }` para prevenir duplicación del borde pseudo-elemento Radix (`::after`) al aplicar clases de borde de Tailwind.
  - Saneamiento de clases manuales `border border-[var(--gray-a6)]` en `BillingPortal.jsx`, `ThirdPartiesView.jsx`, `LoginPage.jsx`, `RegisterPage.jsx` y `TransactionForm.jsx`.
- **Eliminación de Anidamiento en Suscripción (`BillingPortal.jsx`)**:
  - Desempaquetada la tarjeta redundante exterior que envolvía el catálogo de planes; los planes ahora se despliegan directamente en su grid con la barra de cambio de ciclo (Mensual / Anual -20%) limpia y alineada.
  - Removidas cabeceras duplicadas y eliminadas clases `border-b` manuales en `UiTableRow` de la tabla de historial de pagos.
### 21. Fase 1: Blindaje Crítico de Seguridad Firestore y Correcciones Fiscales SRI (2026-09-24) — COMPLETADO
- **Blindaje Total de Firestore Rules (`firestore.rules`)**:
  - **Eliminación de Lecturas Mundiales en Configuración**: Suprimido `allow read: if true;` en `finances_settings/config`. Solo accesible por personal autenticado del tenant o superadmin, protegiendo certificados digitales `.p12`, contraseñas privadas y credenciales SMTP.
  - **Protección de Transacciones Financieras**: Separado `allow get: if true;` (para consulta RIDE pública de comprobante individual por ID/clave) de `allow list:`, restringiendo listados de transacciones a usuarios del tenant o consultas unitarias (`limit <= 1`), impidiendo el raspado masivo de transacciones ajenas.
  - **Aislamiento Multi-Tenant Estricto en Colecciones `fin_*`**: Todas las 13 colecciones financieras (`fin_movimientos`, `fin_bancos`, `fin_cxc`, `fin_cxp`, `fin_asientos`, etc.) validan que `tenantId` coincida con el usuario autenticado vía `userBelongsToTenant()`.
  - **Cierre de Escalada de Privilegios (`/users/{uid}`)**: Reglas estrictas impiden que un usuario común se auto-asigne `role: 'superadmin'` o altere su `tenantId`.
  - **Aislamiento en Inquilinos (`/tenants/{tenantId}`)**: Lectura y actualización restringida al tenant correspondiente o superadmin.
  - **Validación Sintáctica Oficial**: Validado exitosamente con compilador oficial Firebase Security Rules (0 errores).
- **Correcciones Fiscales y Visor RIDE (`PublicRideView.jsx`)**:
  - **Segregación Precisa de IVA 12% vs 15%**: Desacoplado `rate === 12` de la base imponible del 15%. Cálculo independiente de `subtotal12` e `iva12`, renderizado dinámico en la tabla de totales cuando existan comprobantes con tarifa histórica del 12%.
  - **Lectura Pública Resiliente**: Se eliminó la dependencia bloqueante de `finances_settings/config`, utilizando con prioridad `tx.emisorSnapshot` e ignorando de forma segura fallos de permisos sin sesión.
- **Mapeo de Formas de Pago SRI (`sriService.js`)**:
  - `cruce_cuentas` y `compensacion` mapeados a `'15'` (Compensación de deudas según Tabla 24 SRI).
  - `credito` y `credito_directo` mapeados a `'20'` (Otros con utilización del sistema financiero - crédito comercial).
  - Soporte de pagos desglosados en XML: generación de múltiples etiquetas `<pago>` según `paymentsBreakdown` con cuadre exacto al importe total.
- **Normalización de Fechas Robusta (`integracionFinanzasService.js`)**:
  - Creado `parsearFecha()` para soportar fechas en formato `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD` e ISO sin lanzar `Invalid Date` ni desfasar mes por día.
- **Identificadores Seguros en Enlaces RIDE**:
  - URLs en correos de notificación (`invoiceNotification.js`), enlaces del SRI (`sriAuthorization.js`), vistas POS (`PosView.jsx`) e historial de comprobantes (`TransactionsView.jsx`) ahora incorporan `txId`, asegurando acceso directo por documento `getDoc`.
- **Pruebas y Build**: 45 tests unitarios aprobados (4 nuevos tests en `tests/phase1-security-fiscal.test.mjs`), compilación limpia de producción en 18.76s.

### 22. Rediseño Integral de Landing Page — Estilo Brevo & SiteGround (2026-09-24) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-09-24-landing-page-redesign.md`
**Plan:** `docs/superpowers/plans/2026-09-24-landing-page-redesign-plan.md`

- **Header Glassmorphism & Menú a la Izquierda (`LandingLayout.jsx`)**:
  - Barra fijada con efecto cristal real `backdrop-blur-md bg-white/85 border-b border-slate-200/80`.
  - Logotipo WebFix ERP y menú de navegación agrupados de forma continua **a la izquierda** (`flex items-center gap-8 md:gap-10`).
  - Extremo derecho con botón de texto `Iniciar Sesión` y botón píldora negro sólido `#0F172A` `Comenzar Gratis`.
  - Drawer móvil responsivo con `aria-expanded` y cierre automático al navegar.
- **Ancho Estandarizado al 90% (`w-[90%] max-w-[1720px] mx-auto`)**:
  - Eliminadas las restricciones estrechas (`max-w-5xl`); todas las secciones (Header, Hero, Bondades, Pestañas, Precios, FAQ, CTA y Footer) aprovechan el 90% de pantalla con respiración visual de grado internacional.
- **Animaciones Parallax & Revelado de Entrada/Salida Nativos**:
  - `useParallaxScroll.js`: Hook reactivo nativo a 60fps con `requestAnimationFrame` pasivo, soporte para `prefers-reduced-motion` y límites `min`/`max`.
  - `ScrollReveal.jsx`: Componente wrapper con `IntersectionObserver` para transiciones suaves de entrada y salida (`opacity`, `translateY`, `scale`) y soporte escalonado (`stagger`).
- **Hero de Alto Contraste con Capas Parallax (`LandingHome.jsx`)**:
  - Fondo sólido fresco `bg-[#F0FDF4]` con curvatura inferior `rounded-b-[40px] md:rounded-b-[56px]`.
  - H1 contundente sin marketing fluff, subtítulo de 2 líneas directo a las bondades y micro-insignias con checkmarks en verde esmeralda.
  - Maqueta viva interactiva del ERP con conmutador de módulos y dos tarjetas flotantes con efecto parallax independiente (Factura SRI Autorizada y Cobro Express POS con F12).
  - Franja de confianza monocromática con entidades ecuatorianas (SRI, Pichincha, Guayaquil, Produbanco, Visa, Mastercard, RIMPE).
- **Bondades en Tarjetas Planas (Estilo SiteGround Imagen 3 y Brevo Imagen 4)**:
  - Cero cards anidadas y títulos de sección limpios sin burbujas ni dots parpadeantes.
  - 6 tarjetas planas con borde nítido, acentos de color sólidos (Verde Esmeralda, Azul Eléctrico, Índigo, Ámbar, Violeta y Slate) y botón CTA `COMIENZA AHORA ↗`.
- **Pestañas Interactivas por Segmento Comercial (Estilo Brevo Imagen 5)**:
  - Selector píldora central con 3 segmentos: `[Comercios & Retail (POS)]`, `[Servicios & Profesionales]`, `[Distribuidoras & Mayoristas]`.
  - Split 50/50: propuesta de valor en viñetas directas a la izquierda, y tarjeta de impacto con métrica grande (`-85%`, `1.1s`, `100%`) y testimonio real a la derecha.
- **Precios, FAQ Acordeón y Banner Final CTA al 90%**:
  - Selector Mensual / Anual (-20%) con tipografía monospace/Inter en números.
  - Acordeón FAQ accesible y directo con `aria-expanded` y transiciones limpias.
  - Banner final de alta conversión en pizarra oscura `#0F172A` con botones píldora.
- **Cero Gradientes Tipo IA**: Eliminados en su totalidad; estética sólida, nítida y profesional.
### 23. Estandarización a Fondo Blanco Puro y Eliminación de Dark Mode Automático (2026-09-25) — COMPLETADO
- **Causa Raíz Diagnosticada**: Tailwind CSS v4 compila por defecto la variante `dark:` usando la media query del sistema `@media (prefers-color-scheme: dark)`. Al tener el navegador o el sistema operativo del usuario en modo oscuro, la landing page renderizaba de forma no deseada fondos oscuros (`#0c1017`, `slate-950`, `#071d12`), incumpliendo el diseño de fondo blanco solicitado.
- **Estandarización a Modo Claro Forzado (`@custom-variant dark`)**:
  - En `src/index.css`, se configuró `@custom-variant dark (&:where(.dark, .dark *));`, asegurando que Tailwind nunca active estilos oscuros a través de preferencias del navegador u OS.
  - Saneamiento completo de más de 390 clases `dark:` en `LandingLayout.jsx` y `LandingHome.jsx`.
- **Fondo Blanco Puro y Estilo Brevo / SiteGround**:
  - **Fondo General**: Todo el lienzo (`LandingLayout` y `LandingHome`) opera sobre fondo blanco inmaculado (`bg-white`), títulos en negro pizarra de alto contraste (`text-slate-950 font-bold`) y descripciones directas en `text-slate-600`.
  - **Hero**: Bloque superior en tono menta pastel sutil (`bg-[#EAF8EA] border-b border-emerald-100 rounded-b-[40px] md:rounded-b-[56px]`), idéntico a la paleta insignia de Brevo.
  - **Pestañas por Segmento**: Selector tipo píldora con pestaña activa en verde menta sólido Brevo (`bg-[#A3EFA2] text-slate-950 font-bold`) e inactivas en texto suave.
  - **Banner Final de Conversión**: Reemplazado el antiguo bloque negro `#0F172A` por una tarjeta limpia en tono menta pastel `bg-[#EAF8EA]` con borde verde esmeralda suave, titular negro de alto impacto y botón píldora negro sólido `#0F172A`.
  - **Sección de Pestañas Réplica Idéntica Brevo**:
    - Título centrado sin subtítulo redundante (`text-[40px] font-extrabold tracking-tight`).
    - Selector píldora centrado con pestaña activa en verde menta Brevo (`bg-[#B3F2A9]`) y pestañas inactivas en texto limpio sin fondos grises.
    - Columna izquierda con categoría en texto verde plano (`text-[#0B5D3A]`), viñetas con puntos minimalistas (`•`) y botón negro sólido compacto `Saber más`.
    - Tarjeta derecha testimonial con fondo suave `bg-[#F8FAF8]`, emblema de negocio arriba a la izquierda, comillas tipográficas gigantes `“` arriba a la derecha, fotografía del emprendedor en split horizontal y cita con autoría.
  - **Footer Réplica Idéntica Brevo**:
    - Fondo menta sutil (`bg-[#F6FAF6] border-t border-slate-200/80`).
    - Fila superior con logotipo WebFix en verde bosque (`#0B5D3A`) a la izquierda y 6 iconos de redes sociales a la derecha (X, LinkedIn, Instagram, YouTube, Facebook, TikTok).
    - Grid de 5 columnas limpias: `PRODUCTO`, `PARA EMPEZAR`, `RECURSOS`, `PARTNERS` y `EMPRESA`.
    - Barra legal inferior con enlaces horizontales a la izquierda (Cookies, Política anti-spam, Privacidad, Términos, Aviso legal, Seguridad SRI) y copyright a la derecha.
- **Pruebas y Build**: 43/43 tests unitarios aprobados, compilación de producción exitosa en 5.89s.

### 24. Encabezado Réplica Idéntica Brevo y Despeje de Elementos en el Hero (2026-09-25) — COMPLETADO
- **Eliminación de Barra Superior de Anuncios**:
  - Removida por completo la franja superior de aviso (*"Cumplimiento tributario SRI 2026 activo..."*) en `LandingLayout.jsx`.
- **Encabezado Réplica Brevo (`LandingLayout.jsx`)**:
  - **Fondo Menta Translúcido**: Sincronizado en `bg-[#EAF8EA]/95 backdrop-blur-md border-b border-emerald-100/80`, logrando continuidad y fusión con el fondo del Hero.
  - **Logotipo Tipográfico**: Removido el recuadro negro `[W]` y el badge `[ERP]`. Logotipo en texto limpio `WebFix` en verde bosque de alto contraste (`text-[#0B5D3A] font-extrabold text-2xl sm:text-3xl tracking-tight`).
  - **Navegación Izquierda Inmediata**: Enlaces alineados a la izquierda junto al logo (`Soluciones`, `Precios`, `Nosotros`, `Contacto`).
  - **Bloque de Acciones a la Derecha**:
    - Icono de globo terráqueo (`<Globe size={18} />`).
    - Línea divisora vertical sutil (`h-4 w-px bg-slate-300`).
    - Enlace de texto `Iniciar Sesión` (`/login`).
    - Botón negro sólido con esquinas redondeadas `Regístrate gratis` (`bg-[#1E1E1E] text-white rounded-xl px-4 py-2`).
    - Botón outline con borde negro `Hablar con Ventas` (`border border-slate-900 text-slate-900 rounded-xl px-4 py-2`).
    - Menú móvil sincronizado con las mismas acciones y enlaces.
- **Despeje Minimalista del Hero (`LandingHome.jsx`)**:
  - **Remoción de Burbuja Superior**: Eliminado el badge flotante pill sobre el H1 (*"WebFix ERP 2.0 • Facturación SRI 2026 →"*).
  - **Remoción de Lista de Checks**: Eliminada la fila de viñetas con checks verdes inferiores (*"✓ Sin tarjeta de crédito  ✓ Firma .p12 integrada  ✓ Comprobantes SRI ilimitados"*), otorgando protagonismo al H1, subtítulo y botones de acción principales.
- **Pruebas y Build**: 43 tests unitarios aprobados (41 de comercio/SRI + 2 de animación), compilación de producción limpia en 5.58s.

### 25. Tipografías Aumentadas en Encabezado, Desplazamiento Fluido y Glassmorphism en Scroll (2026-09-25) — COMPLETADO
- **Tipografía Aumentada en Navegación y Botones (`LandingLayout.jsx`)**:
  - Enlaces del menú (`Soluciones`, `Precios`, `Nosotros`, `Contacto`) escalados a `text-[15px] lg:text-base font-semibold` con padding aumentado (`px-3.5 py-2`), mejorando su legibilidad y balance jerárquico.
  - Enlace `Iniciar Sesión` escalado a `text-[15px] lg:text-base font-semibold`.
  - Botón principal `Regístrate gratis` escalado a `text-[15px] lg:text-base font-semibold` con padding `px-5 py-2.5 rounded-xl`.
  - Botón secundario `Hablar con Ventas` escalado a `text-[15px] lg:text-base font-semibold` con padding `px-5 py-2.5 rounded-xl`.
  - Icono de globo terráqueo ampliado a `size={20}`.
- **Desplazamiento Fluido y Fijado del Menú (Sticky Navbar)**:
  - Reemplazado `overflow-x-hidden` por `overflow-x-clip` en `LandingLayout.jsx` y `LandingHome.jsx`. Esto elimina la causa raíz que impedía que `position: sticky` se anclara a la ventana durante el scroll.
- **Glassmorphism Dinámico al Desplazarse**:
  - Integrado listener de scroll reactivo pasivo sobre `window.scrollY`.
  - Al desplazarse (`scrollY > 20`), el fondo del header activa glassmorphism traslúcido `backdrop-blur-md bg-[#EAF8EA]/85 border-b border-emerald-200/80 shadow-xs`, difuminando suavemente el contenido de la página que pasa por debajo con el tono menta insignia.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción exitosa en 5.58s.

### 26. Beneficios de Facturación en 6 Tarjetas Minimalistas Réplica Brevo (2026-09-25) — COMPLETADO
- **Reemplazo de Sección Multiplataforma (`LandingHome.jsx`)**:
  - Removido el bloque contenedor antiguo de 3 dispositivos (*"Tu negocio sincronizado en PC, Móvil y Punto de Venta"*).
  - La tabla comparativa moderna vs tradicional ahora finaliza limpiamente con `mb-0`.
- **Nueva Sección Minimalista de 6 Tarjetas Estilo Brevo (`media_1790317678074.png`)**:
  - **Título Centrado**: `Factura y gestiona tu negocio, a tu manera` (`text-[40px] font-extrabold text-slate-950 tracking-tight text-center`), sin subtítulos ni decoraciones secundarias.
  - **Grid de 6 Columnas**: 6 tarjetas verticales en fondo blanco (`rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 h-[250px] sm:h-[270px]`) con títulos directos en 2 líneas y micro-ilustraciones vectoriales limpias al pie:
    1. **Facturación electrónica SRI**: Squircle pastel con icono de documento y badge circular menta con checkmark verificado SRI.
    2. **Punto de venta (POS)**: Mini terminal POS/móvil con reloj `12:30` y banner de ticket emitido `$18.50 Listo`.
    3. **Firma digital .p12**: Squircle verde bosque `#0B5D3A` con llave de seguridad y badge oficial `SRI`.
    4. **Envío por WhatsApp**: Dos burbujas apiladas con confirmación de entrega en vivo y RIDE/XML disponible en 1s.
    5. **Inventario & Kardex**: Tarjeta de almacén con código de barras en vivo, stock actual `142 un` y badge de paquete.
    6. **Cobros & Bancos**: Mini teclado numérico, badge de tendencia y botón circular negro con flecha `[ → ]` idéntico al componente de Brevo.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción limpia en 7.89s.

### 27. Estandarización de Ancho: 80% en Cuerpo de Página y 90% en Header, Footer y Heroes (2026-09-25) — COMPLETADO
- **Preservación de Ancho al 90% (`w-[90%] max-w-[1720px] mx-auto`)**:
  - Header de navegación (`LandingLayout.jsx`).
  - Pie de página institucional (`LandingLayout.jsx`).
  - Hero principal de bienvenida (`LandingHome.jsx`).
  - Encabezados hero de las subpáginas (`LandingFeatures.jsx`, `LandingPricing.jsx`, `LandingAbout.jsx`, `LandingContact.jsx`).
- **Ajuste de Ancho al 80% en el Cuerpo de Página (`w-[80%] max-w-[1720px] mx-auto`)**:
  - **`LandingHome.jsx`**:
    - Franja de confianza / Social proof bar (`w-[80%]`).
    - Sección 3: Grid de bondades en tarjetas planas (`w-[80%]`).
    - Sección 3.5: Tabla comparativa moderna vs tradicional (`w-[80%]`).
    - Sección 3.6: Fila de 6 tarjetas de beneficios estilo Brevo (`w-[80%]`).
    - Sección 4: Pestañas interactivas y testimoniales por segmento (`w-[80%]`).
    - Sección 5: Catálogo de precios y selector mensual/anual (`w-[80%]`).
    - Sección 6: Preguntas frecuentes en acordeón (`w-[80%] max-w-4xl`).
    - Sección 7: Banner final de conversión CTA (`w-[80%]`).
  - **Subpáginas (`LandingFeatures.jsx`, `LandingPricing.jsx`, `LandingAbout.jsx`, `LandingContact.jsx`)**:
    - Secciones de cuerpo ajustadas con `w-[80%]` para un encuadre visual más compacto, centrado y con mayor respiración lateral.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción exitosa en 6.97s.

### 28. Ajuste de Fondo del Pie de Página a Verde Suave (#f9fff6) (2026-09-25) — COMPLETADO
- **Color de Fondo del Footer (`LandingLayout.jsx`)**:
  - Actualizado el contenedor `<footer>` con el tono `bg-[#f9fff6]`.
  - Proporciona un acabado sumamente suave, fresco y homogéneo con la identidad de marca, integrándose en armonía con el resto del lienzo y el borde superior.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción limpia en 7.50s.

### 29. Integración de la Paleta de Tokens Oficiales de Brevo (:root) en CSS y Landing Page (2026-09-25) — COMPLETADO
- **Tokens Oficiales de Brevo (`src/brevoTokens.css` & `src/index.css`)**:
  - Declaradas todas las variables `:root` extraídas del sitio web de Brevo: paleta Mint Green (`#f9fff6`, `#e8fedf`, `#c0ffa5`), Forest Green (`#f0fdf4`, `#b3f4cb`, `#0b996f`, `#02835c`, `#006a43`, `#004227`), Charcoal Grey (`#fafafa`, `#f5f5f5`, `#f0f0f0`, `#1b1b1b`), Sky Blue, Iris Purple, Aqua Teal, Coral Orange y Electric Yellow.
  - Vinculación en `src/index.css` vía `@import "./brevoTokens.css";` y mapeo de tokens utilitarios en `@theme` de Tailwind 4 (`--color-brand-mint-*`, `--color-brand-forest-*`, `--color-brand-charcoal-*`, etc.).
- **Estandarización en `LandingLayout.jsx`**:
  - Fondo del Header y Overlay móvil: `--brand-mint-green-200: #e8fedf` con bordes `--brand-forest-green-200: #b3f4cb`.
  - Logotipo WebFix y enlaces activos: `--brand-forest-green-800: #006a43`.
  - Botones principales ("Regístrate gratis"): `--brand-charcoal-grey-900: #1b1b1b` con hover en negro sólido.
  - Botones outline ("Hablar con Ventas"): borde y texto en `#1b1b1b`.
  - Fondo del Footer: `--brand-mint-green-100: #f9fff6`, logotipo en `#006a43` y redes sociales con hover en `#006a43`.
- **Estandarización en `LandingHome.jsx`**:
  - Fondo del Hero: `--brand-mint-green-200: #e8fedf` con borde inferior `#b3f4cb`.
  - Botón CTA principal del Hero: `#1b1b1b` hover `bg-black`.
  - Maqueta interactiva ERP: Píldora activa en `--brand-mint-green-300: #c0ffa5` con texto `--brand-forest-green-900: #004227`. Badge SRI Online y tarjeta flotante con verde bosque `#006a43` y dot `#0b996f`.
  - 6 Tarjetas de Beneficios Minimalistas: Cajas y badges con tokens oficiales de Brevo (Sky Blue `#e6f3ff`/`#2679c6`, Mint Green `#c0ffa5`, Forest Green `#006a43`, Charcoal `#1b1b1b`).
  - Pestañas interactivas por segmento: Píldora activa en `#c0ffa5` con texto `#004227`, botón "Saber más" en `#1b1b1b`, tarjeta testimonial en fondo Charcoal 25 `#fafafa`.
  - Precios y Planes: Badge de descuento anual en `#c0ffa5` con texto `#004227`, botón del Plan Pro en `#1b1b1b`.
  - Banner final de conversión CTA: Contenedor en `#e8fedf` con borde `#b3f4cb`, badge en `#c0ffa5`/`#004227` y botón en `#1b1b1b`.
### 30. Eliminación Integral de Bordes Divisores en Encabezado, Hero, Secciones y Footer (2026-09-25) — COMPLETADO
- **Remoción de Bordes en Encabezado y Hero**:
  - `LandingLayout.jsx`: Eliminado el borde inferior `border-b border-[#b3f4cb]` del `<header>`, permitiendo que el efecto glassmorphism flote de manera limpia e integrada.
  - `LandingHome.jsx`: Eliminado el borde inferior `border-b border-[#b3f4cb]` de la `<section>` del Hero, logrando una transición curva orgánica (`rounded-b-[40px] md:rounded-b-[56px]`) hacia el cuerpo de página.
- **Remoción de Bordes Divisores Intermedios (`LandingHome.jsx`)**:
  - Franja de confianza / Social proof bar: Removido `border-b border-slate-100`.
  - Sección 3 (Bondades en Tarjetas Planas): Removido `border-b border-slate-100`.
  - Sección 3.5 (Comparativa Ecosistema Cloud): Removido `border-b border-slate-200/80`.
  - Sección 3.6 (6 Beneficios Minimalistas Brevo): Removido `border-b border-slate-100`.
  - Sección 4 (Pestañas por Segmento Comercial): Removido `border-b border-slate-100`.
  - Sección 5 (Precios Transparentes): Removido `border-t border-slate-100`.
  - Sección 6 (Preguntas Frecuentes Acordeón): Removido `border-t border-slate-200/80`.
- **Remoción de Bordes Superior e Interno del Footer (`LandingLayout.jsx`)**:
  - Removido `border-t border-slate-200/80` del contenedor principal `<footer>`.
  - Removido el borde divisor interno `border-b border-slate-200/70` entre la fila del logotipo/redes sociales y las columnas de enlaces.
  - Removido el borde divisor interno `border-t border-slate-200/80` sobre los enlaces legales y copyright.
  - Resultado: Un lienzo fluido, continuo y minimalista sin cortes lineales abruptos.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación limpia de producción en 6.91s.

### 31. Rediseño de Inicio de Sesión y Registro con Guía Gráfica Brevo (2026-09-25) — COMPLETADO
- **Estética Brevo Oficial**:
  - Lienzo fresco y luminoso con fondo menta (`#f9fff6` / `--brand-mint-green-100`) y textura de micro-patrón radial sutil (`#b3f4cb 1.2px`).
  - Cabecera de autenticación limpia: Logotipo WebFix ERP con isotipo en verde bosque (`#006a43` / `--brand-forest-green-800`), píldora `ERP` menta y badge de seguridad `SRI Ecuador` con borde `#b3f4cb`.
  - Tarjeta de autenticación de alto contraste (`max-w-[440px]`, `rounded-3xl`, `bg-white`, borde sutil `border-slate-200/90`, cero sombras) con tipografía Inter bold/semibold limpia.
  - Campos de entrada: `UiInput` con `iconPrefix` (Mail, Lock) para evitar superposiciones, foco limpio y alternador de contraseña integrado.
  - Botón principal de acción: Botón charcoal sólido estilo Brevo (`#1b1b1b` / `--brand-charcoal-grey-900` hover `bg-black`, texto blanco, esquinas redondeadas `rounded-xl`, tipografía semibold).
  - Enlaces de navegación: "¿Olvidaste tu contraseña?" y "Regístrate gratis / Inicia sesión" en verde bosque interactivo (`#006a43` hover `#004227`).
  - Alerta de errores: Contenedor semántico suave en tonos rosados/rojos (`bg-[#fff0f5] border-[#fbc6d9] text-[#b22456]`).
- **Coherencia en Registro (`RegisterPage.jsx`)**: Aplicada la misma guía gráfica unificada para una transición fluida e impecable entre inicio de sesión y creación de cuenta.
- **Pruebas y Build**: 43 tests unitarios aprobados (41 suite de comercio/SRI + 2 animaciones), compilación de producción exitosa en 7.03s.

### 32. Color de Marca Menta Vibrante en Hero y Header (2026-09-25) — COMPLETADO
- **Aplicación de Token Brevo `brand-mint-green-300: #c0ffa5`**:
  - **Header Flotante (`LandingLayout.jsx`)**: Actualizado el fondo del header tanto en estado estático (`bg-[#c0ffa5]/95`) como al desplazarse con glassmorphism reactivo (`bg-[#c0ffa5]/85 backdrop-blur-md`), así como en el overlay móvil (`bg-[#c0ffa5]/98`).
  - **Hero Section (`LandingHome.jsx`)**: Actualizado el bloque curvo superior del Hero (`rounded-b-[40px] md:rounded-b-[56px]`) al fondo sólido menta vibrante `bg-[#c0ffa5]`, logrando continuidad cromática uniforme y de alto impacto con el header.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación limpia de producción en 14.13s.

### 33. Color Esmeralda #0b996e y Tipografía Semibold en Logo y Título Hero (2026-09-25) — COMPLETADO
- **Color y Peso del Logo**:
  - Actualizado el logotipo `WebFix` a color verde esmeralda exacto `#0b996e` y peso tipográfico `font-semibold` en el header y footer de [`LandingLayout.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/pages/landing/LandingLayout.jsx), así como en [`LoginPage.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/pages/LoginPage.jsx) y [`RegisterPage.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/pages/RegisterPage.jsx).
- **Tipografía del Título Principal Hero**:
  - Ajustado el encabezado `<h1>` del Hero en [`LandingHome.jsx`](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/pages/landing/LandingHome.jsx) de `font-extrabold` a `font-semibold`, brindando una presencia visual más limpia, refinada y legible acorde al estilo editorial moderno.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción exitosa en 6.18s.

### 34. Franja de Confianza con Logos Negros y Carrusel Continuo con Difuminado Estilo Brevo (2026-09-25) — COMPLETADO
- **Estructura Split Idéntica a Brevo (Imagen de Referencia)**:
  - **Bloque Izquierdo**: Texto conciso en dos líneas alineado a la izquierda: *"Más de 500 comercios en todo el Ecuador ya confían en WebFix"* en tipografía semibold sólida negra (`text-black font-semibold text-base sm:text-lg`).
  - **Bloque Derecho (Carrusel Marquee Continuo)**:
    - Logos corporativos y entidades financieras (SRI Ecuador, Banco Pichincha, Banco Guayaquil, Produbanco, Visa, Mastercard, Banco del Pacífico, RIMPE, Diners Club) en **color negro puro** (`text-black`, `fill-currentColor`).
    - Animación `@keyframes marquee` fluida y suave a velocidad moderada (35s) con pausa interactiva al hover (`animation-play-state: paused`).
    - Máscara de desvanecimiento suave en los extremos (`mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)`) para un efecto donde los logos se difuminan gradualmente al entrar y salir.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción exitosa en 10.35s.

### 35. Rediseño de Sección de Beneficios a Bento Grid Pastel (Réplica Imagen 1) (2026-09-25) — COMPLETADO
- **Arquitectura Bento Grid 5 Cards (12 Columnas)**:
  - **Fila Superior (2 Tarjetas Anchas, 6 cols c/u)**:
    - **Card 1 (Azul Pastel `#edf4fb`)**: *Facturación para Negocios* con botón pill negro *"Comienza ahora"* y ventana browser emergente a la derecha con dashboard de comprobante autorizado SRI y total `$1,240.50`.
    - **Card 2 (Gris Cálido `#f5f5f7`)**: *Punto de Venta Mostrador* con botón pill negro *"Comienza ahora"*, preview tenue de fondo y **tarjeta flotante oscura (*Dark Popover*)** con selector activo *"Efectivo + Transferencia"* con checkmark circular verde, atajo F12 y ticket térmico 80mm.
  - **Fila Inferior (1 Tarjeta Ancha 6 cols + 2 Tarjetas Compactas 3 cols c/u)**:
    - **Card 3 (Lavanda Pastel `#f3f0fc`)**: *Captura Inteligente OCR con IA* con botón pill negro *"Comienza a procesar"* y tabla de extracción inteligente de factura que emerge desde la base.
    - **Card 4 (Menta Pastel `#edf8f1`)**: *Flujo de caja* con enlace textual minimalista *"Ver Finanzas ↗"* y widget de saldo disponible en bancos con desglose Pichincha/Guayaquil y badge `+15.2%`.
    - **Card 5 (Vainilla Pastel `#fef9e7`)**: *Kardex & Stock* con enlace textual minimalista *"Pruébalo Gratis ↗"* y tarjeta de producto con stock de 142 unidades y badge *"Óptimo"*.
- **Diseño y Acabado**:
  - Bordes redondeados generosos (`rounded-[32px]`), micro-elevación suave en hover (`hover:-translate-y-1`), cero dobles bordes y tipografía bold de alto contraste.
- **Pruebas y Build**: 43 tests unitarios aprobados, compilación de producción limpia en 7.55s.

### 36. Rediseño del Entorno de Administración ERP según el Sistema de Diseño Brevo (2026-09-25) — COMPLETADO
- **Header Superior Brevo (`src/App.jsx`)**:
  - Fondo blanco puro `#ffffff` con borde inferior sutil `border-b border-slate-200/80`.
  - Alternador de menú lateral minimalista con icono de panel y breadcrumb contextual (`/ [Módulo activo]`).
  - Botón de texto/píldora "✦ Uso y plan" con icono de destello `Sparkles` dorado, acceso directo a Punto de Venta POS, y botones de icono limpios para Ayuda (`HelpCircle` -> soporte), Ajustes (`Settings` -> configuración) y Notificaciones (`Bell`).
  - Píldora de Perfil de Usuario con avatar circular (`WF` / iniciales sobre fondo sólido `#1b1b1b`), nombre de empresa truncado con `ChevronDown` y menú desplegable interactivo con:
    - Tarjeta de usuario con avatar, "Mi perfil" y correo electrónico.
    - "🗂 Mi plan" (navigación a suscripción).
    - "✦ Centro de control de IA" (abre asistente lateral de IA).
    - "⚙ Configuración" y "🎧 Soporte técnico".
    - "🚪 Cerrar sesión" (ejecución segura de `handleLogout()`).
- **Sidebar de Navegación Brevo (`src/components/Sidebar.jsx`)**:
  - Fondo blanco puro `bg-white border-r border-slate-200/90`.
  - Logotipo WebFix en verde bosque `#0b996e` semibold con badge `ERP` esmeralda.
  - Ítem Activo con píldora verde menta suave `bg-[#c0ffa5] text-[#004227] font-semibold rounded-xl` y barra indicadora vertical verde en el borde derecho (`border-r-2 border-[#0b996e]`).
  - Ítems inactivos en `text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl font-medium`.
  - Submódulos anidados con píldoras de navegación idénticas a Brevo (`bg-[#c0ffa5]` al estar activo, `text-slate-600 hover:bg-slate-100` inactivos).
- **Dashboard Principal Brevo (`src/components/dashboard/ErpDashboard.jsx`)**:
  - Encabezado "Hola, [Nombre]" con botón "Personalizar página" (modal de atajos) y botón píldora negra "+ Nueva venta".
  - **Widget de Calendario Mensual Interactivo**: vista de días del mes actual con navegación `< >`, cabeceras lun-dom y marcador de día de hoy en círculo sólido `#1b1b1b`.
  - **Tarjeta "Programado para hoy"**: dropdown "+ Crear ▾" con accesos directos (Venta SRI, Compra, Cliente, Producto) y dos tarjetas de recomendación rápida con iconos circulares verdes.
  - **Tarjeta "Tus contactos & ventas"**: métricas dinámicas reales de total de clientes y comprobantes emitidos en el mes con enlaces directos.
  - **Tarjeta "Uso de tu plan"**: barras de recursos para comprobantes SRI ilimitados, firma electrónica activa y sincronización en tiempo real.
  - **Accesos directos personalizables**: tarjetas planas de fondo blanco con acentos de color pastel, 100% compatibles con `ShortcutCustomizerModal`.
- **Estandarización de Encabezados y Tablas de Módulos**:
  - `FinancialPageHeader.jsx`: simplificado a título, badge numérico, icono informativo y acciones en píldora sin descripciones largas.
  - `ThirdPartiesView.jsx` y `TransactionsView.jsx`: encabezados planos, botones de acción en píldora negra sólida `#1b1b1b`, tabs en píldora Brevo y tablas planas con `border border-slate-200/90 rounded-2xl bg-white overflow-hidden`.
- **Pruebas y Build**: 41 tests de comercio/SRI + 2 tests de animación aprobados (43/43), compilación de producción exitosa en 5.04s.

### 37. Rediseño de Pantalla de Venta Administrativa al Sistema de Diseño Brevo (2026-09-25) — COMPLETADO
- **Estética Brevo Aplicada Integralmente (`src/components/finances/TransactionForm.jsx`)**:
  - **Barra Superior Limpia**: Encabezado en tarjeta plana de fondo blanco (`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-none`), isotipo con icono `Calculator` en pastilla neutra, título semibold `Nueva Venta / Emisión de Comprobante`, stepper de 2 pasos con píldoras redondeadas e indicador activo en verde menta Brevo (`bg-[#c0ffa5] text-[#004227]`), y botón outline redondeado *"Cancelar / Cerrar"*.
  - **Banners de Estado y Recuperación**: Rediseñados como tarjetas suaves `rounded-2xl` con bordes nítidos (esmeralda para autorizados SRI, ámbar para pendientes y rose para cancelados) y botones píldora.
  - **Navegación Móvil por Pestañas**: Pestañas redondeadas tipo cápsula (`bg-slate-100 rounded-2xl p-1.5`) con badges mint y contadores dinámicos.
  - **Ficha de Cliente y Ubicación (Card 1)**: Tarjeta `rounded-2xl p-5 sm:p-6 shadow-none` con icono `User` en verde esmeralda. Buscador con botón `X` de limpieza rápida, botón de creación rápida en negro carbón `#1b1b1b`, ficha de cliente seleccionado en verde difuminado suave (`bg-[#e6f4ea] border border-[#ceead6]`) con tipografía semibold de alta legibilidad sin duplicidades ni dobles bordes. Selector de Tipo de Documento dinámico con resaltado activo.
  - **Catálogo y Carrito de Productos (Card 2)**: Encabezado minimalista sin líneas divisorias, buscador con autocompletado y botones píldora (*"Añadir"* y *"Crear"* rápido). Barra de descuento general en contenedor sutil `bg-slate-50/70 border border-slate-200/80 rounded-xl`, botón de vaciar carrito en rose suave y tabla de carrito en contenedor `rounded-2xl border border-slate-200/80` preservando la fila de producto unificada (SKU limpio, nombre bold, descripción editable en factura `h-7`, steppers y subtotales en fuente Inter `font-semibold`).
  - **Datos Adicionales (Card 3)**: Desplegable en tarjeta limpia `rounded-2xl` para número de pedido y notas de comprobante.
  - **Resumen e Impuestos (Columna Derecha)**: Tarjeta plana `rounded-2xl` con desglose de Subtotales (0%, 15%), Descuentos, IVA e importe Total en tipografía monospace de alto contraste `#1b1b1b`.
  - **Medios de Pago y Cobro Dividido**: Selector de métodos en cuadrícula 4x con selección activa en verde menta Brevo (`bg-[#c0ffa5] text-[#004227] border-[#a2f07f] font-bold`), inputs numéricos `rounded-xl`, cajas de vuelto / cubierto y alertas suaves de consistencia.
  - **Emisión SRI y Consola en Vivo**: Botón principal en píldora negra sólida `#1b1b1b` hover `bg-slate-800` y terminal de eventos de autorización con esquinas redondeadas `rounded-2xl bg-[#0c1017] border border-slate-800 text-emerald-400`.
  - **Pantalla de Confirmación Post-Emisión (Paso 2)**:
    - Tarjeta hero de confirmación con badge de éxito verde menta, secuencial en tipografía legible, métricas de comprobante y clave de acceso SRI.
    - Tarjeta de entrega y notificaciones de correo con estados de envío al cliente y copia al emisor en tarjetas independientes, reintento rápido e input de copia adicional.
    - Tarjeta de acciones rápidas con botón principal de "Impresión Directa", accesos rápidos a Ticket 80mm y Hoja A4 RIDE, descargas y navegación.
    - Previsualización del ticket en tarjeta Brevo limpia con tipografía mono sobre `bg-slate-50/80 border border-slate-200/80 rounded-xl`.
  - **Barra de Asistente Inferior (Wizard Bar)**: Barra fijada `sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200/90` con botones de navegación desktop y móvil con esquinas redondeadas.
  - **Modales y Diálogos**: Todos los diálogos modales (Seguimiento de CxC, Creación Rápida de Cliente, Creación Rápida de Producto, Búsqueda Avanzada de Catálogo, Descuento de Ítem, Autorización de Supervisor y Confirmaciones de Seguridad) homogeneizados con contenedor `rounded-2xl bg-white border border-slate-200/90 shadow-xl` y botones píldora.
- **Preservación Total de Lógica y Validaciones**: Conservadas al 100% todas las rutinas fiscales del SRI, desglose de pagos combinados, sincronización de stock y kardex, cálculos de IVA 15% / 0%, recuperación de clave de acceso y previsualización de impresión.
- **Pruebas y Build**: 41 tests de comercio/SRI aprobados, compilación de producción limpia en 7.52s.

### 38. Eliminación de Acciones Inferiores del Menú Lateral (Sidebar) (2026-09-25) — COMPLETADO
- **Limpieza de Barra Lateral Izquierda (`src/components/Sidebar.jsx`)**:
  - Removidos por completo los tres botones de pie de menú lateral: `Soporte Técnico` (LifeBuoy), `Papelera` (Trash2) y `Cerrar Sesión` (LogOut), junto con su contenedor y divisores inferiores.
  - Las funciones de Soporte Técnico y Cerrar Sesión continúan centralizadas y accesibles desde el menú de usuario del encabezado superior estilo Brevo (`App.jsx`).
  - Resultado: Barra lateral completamente despejada, minimalista y con navegación directa y fluida.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 7.28s.

### 39. Remoción de Título Redundante, Botón Cancelar Minimalista, Eliminación de Borde de Header y Fondo Blanco Puro (2026-09-25) — COMPLETADO
- **Remoción de Título y Tarjeta Superior en Venta Administrativa (`TransactionForm.jsx`)**:
  - Eliminada la tarjeta blanca superior que contenía el icono de calculadora y el título repetido *"Venta Administrativa"*, aprovechando que la ubicación ya se indica en el encabezado general del sistema.
  - Diseñado un botón de cancelación sumamente minimalista con icono `X` y texto *"Cancelar"* (`flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-950 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors`), discreto y sin ocupar espacio vertical.
- **Eliminación del Borde Inferior del Header (`App.jsx`)**:
  - Removido `border-b border-slate-200/80` de la barra superior del ERP (`<header>`), eliminando la línea de separación visual y logrando una fusión limpia y fluida con el contenido del módulo.
- **Fondo Blanco Puro en Venta Administrativa (`FinanceModule.jsx` y `TransactionForm.jsx`)**:
  - Eliminado el fondo gris opaco (`style={{ backgroundColor: 'var(--gray-2)' }}`) del contenedor principal de scroll en `FinanceModule.jsx`.
  - Actualizado el contenedor raíz de `TransactionForm.jsx` para usar siempre `bg-white`, garantizando un lienzo inmaculado, fresco y de alto contraste idéntico al estándar visual de Brevo.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia en 6.45s.

### 40. Simplificación del Dashboard a Saludo Inicial y Accesos Directos Centrados (2026-09-25) — COMPLETADO
- **Despeje Total del Dashboard Principal (`src/components/dashboard/ErpDashboard.jsx`)**:
  - Removidos el widget de calendario mensual, la tarjeta *"Programado para hoy"*, las tarjetas de métricas (*"Tus contactos"* y *"Uso de tu plan"*), y los botones de acción *"Personalizar página"* y *"Nueva venta"*.
  - Eliminado el encabezado/título *"Accesos directos"* y el contenedor envolvente tipo card con borde perimetral.
  - El Dashboard ahora renderiza exclusivamente:
    1. Saludo inicial en tipografía extrabold de alto impacto (`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900`): *"Hola, [Nombre]"*, centrado horizontalmente.
    2. Grid simétrico de tarjetas de accesos directos centrado (`max-w-4xl mx-auto`), sin bordes exteriores envolventes, con tarjetas individuales planas de esquinas redondeadas (`rounded-2xl border border-slate-200/90 bg-white hover:-translate-y-0.5`).
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 8.18s.

### 41. Botón Circular Minimalista de Cierre en Venta Administrativa (2026-09-25) — COMPLETADO
- **Botón Circular de Cierre (`TransactionForm.jsx`)**:
  - Sustituido el botón con texto *"✕ Cancelar"* por un botón circular limpio y claramente visible (`w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-950 border border-slate-200/80 active:scale-95`).
  - Icono `X` destacado con `size={18}` y `strokeWidth={2.2}`, sin textos adicionales, logrando una estética moderna, despejada y de rápida identificación táctil.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 8.31s.

### 42. Unificación y Compactación de Columna de Pagos y Emisión en Venta Administrativa (2026-09-25) — COMPLETADO
- **Columna Unificada en una Sola Tarjeta Compacta (`TransactionForm.jsx`)**:
  - Eliminada la fragmentación vertical en 3 tarjetas separadas (*Resumen e Impuestos*, *Medios de Pago* y *Emisión de Comprobante*) que forzaba al usuario a hacer scroll para alcanzar el botón de emisión.
  - Se unificó todo el contenido en una **única tarjeta limpia y compacta** (`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-none space-y-3.5 sticky top-4`).
  - Separación interna mediante sutiles divisores lineales (`h-px bg-slate-200/80`):
    1. **Resumen de Totales**: Subtotal, Descuentos por ítem/general, Base imponible, IVA y Total a Pagar en tipografía monospace de alto contraste.
    2. **Medios de Pago**: 4 botones compactos (Efectivo, Transf., Tarjeta, Crédito) con acento menta (`#c0ffa5`), inputs ágiles, y métricas de Cambio/Vuelto y Cubierto.
    3. **Acciones de Emisión**: Botón principal *"Emitir Factura Electrónica (SRI)"* (`bg-[#1b1b1b]`), botón secundario *"Guardar Borrador"*, y consola SRI reactiva.
  - Al incorporar `sticky top-4` y optimizar la altura vertical (~40% menos de espacio desperdiciado en paddings y cabeceras redundantes), todos los totales, medios de pago y el botón de emisión quedan inmediatamente visibles "de primera mano" sin scroll vertical.
### 43. Reubicación de Recuperación de Facturas SRI en Ajustes (2026-09-25) — COMPLETADO
- **Remoción del Banner de Ventas (`TransactionsView.jsx`)**:
  - Eliminado el banner azul `SriRecoveryPanel` de la parte superior del listado de ventas (`TransactionsView.jsx`), dejando la tabla de ventas limpia y despejada directamente bajo las acciones principales.
- **Integración en Módulo de Ajustes (`GeneralSettings.jsx`)**:
  - Añadida nueva pestaña dedicada en el menú lateral de Ajustes: **"Recuperar Facturas SRI"** (`{ id: 'recovery', label: 'Recuperar Facturas SRI', icon: RefreshCw }`) con explicaciones detalladas de seguridad, no emisión y conciliación.
### 44. Blindaje de Proxies SRI con Reintentos y Botón de Verificación en Paso 2 (2026-09-25) — COMPLETADO
- **Blindaje de Proxies SRI Serverless (`api/sri-ws-prod/index.js` y `api/sri-ws-pruebas/index.js`)**:
  - Incorporado bucle de reintento automático (hasta 3 intentos con 1000ms de backoff) para absorber intermitencias o cortes transitorios de conexión TCP con los servidores del SRI ecuatoriano.
  - Añadidos encabezados estándar HTTP (`User-Agent` de navegador, `Accept: text/xml, */*`, y `Connection: close`) para prevenir bloqueos por WAF o reuso de sockets caídos en Lambda/Vercel.
  - Sanitizada la ruta de destino (`cleanPath`) para evitar dobles barras (`//`) y detallado el error con `err.cause` (código de error real).
- **Botón de Verificación en Paso 2 de Venta Administrativa (`TransactionForm.jsx`)**:
  - En la pantalla de emisión confirmada (Paso 2), si el documento queda en estado *"Identidad fiscal reservada — autorización por verificar"*, se despliega una tarjeta de aviso amigable con el botón **"Verificar y Reintentar Autorización SRI"** (`recoverSriEmission(true)`), permitiendo al usuario re-consultar o autorizar inmediatamente sin perder el número secuencial ni tener que volver a capturar la venta.
### 45. Estandarización Visual Brevo en Historial de Comprobantes y Encabezados Financieros (2026-09-25) — COMPLETADO
- **Encabezado Brevo en Historial de Ventas y Compras (`TransactionsView.jsx`)**:
  - Incorporado encabezado minimalista consistente con Brevo y Clientes/Proveedores: título contundente (`h1` en `text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight`), badge numérico redondeado con total de comprobantes filtrados, y botón píldora negro carbón (`#1b1b1b`) a la derecha con acción dinámica (*"Registrar Venta"*, *"Registrar Compra"*, *"Registrar Preventa"*, etc.).
  - Barra de filtros y búsqueda encapsulada en tarjeta plana blanca con bordes redondeados (`bg-white border border-slate-200/90 rounded-2xl p-3`).
  - Cabecera de tabla modernizada: sustituido el gris `var(--gray-2)` por `bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]` y celdas estilizadas con tipografía limpia en números monospace y estados visuales claros.
  - Zona de carga y drag-and-drop de comprobantes (Compras / Captura) adaptada a estética moderna Brevo con borde punteado suave y realce al arrastrar.
- **Estandarización de Encabezados Financieros (`FinancialPageHeader.jsx`)**:
  - Eliminado el borde inferior perimetral (`border-b border-slate-200/80`) para evitar cortes abruptos entre la cabecera y el contenido.
  - Tipografía `h1` en negrita con badge numérico redondeado y acciones contextuales en píldoras, logrando una estética sin separación rígida en los 11 submódulos de finanzas.
- **Pruebas y Build**: 41 tests unitarios aprobados, compilación limpia de producción en 11.84s.

### 46. Rediseño del Sistema de Botones Brevo, Sidebar Grueso y Toolbars Unificadas en Todos los Módulos (2026-09-25) — COMPLETADO
- **Sistema de Botones según CSS de Brevo (`border-radius: 1rem / rounded-xl`)**:
  - **Eliminación Total de `rounded-full` en Botones de Acción**: Erradicado el uso de cápsula/píldora al 100% en botones de acción y CTAs tanto en la Landing Page como en todos los módulos del ERP (`TransactionForm.jsx`, `ThirdPartiesView.jsx`, `TransactionsView.jsx`, `InventoryModule.tsx`, `ServicesView.tsx`, `LandingHome.jsx`).
  - **Estandarización en 4 Categorías Brevo**:
    1. *Sólidos primarios*: `bg-[#1b1b1b] hover:bg-slate-800 text-white font-semibold rounded-xl px-4 py-2 text-xs`.
    2. *Lineales / Outlines*: `border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl px-4 py-2 text-xs`.
    3. *Text / Ghost buttons*: `text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl px-3 py-2 text-xs`.
    4. *Toolbar Action / Dropdowns*: `bg-white border border-slate-200/90 text-slate-700 font-medium rounded-xl`.
  - **Preservación Estricta**: Los botones circulares de cierre 'X' (`w-8 h-8 rounded-full flex items-center justify-center`) y los badges de conteo numérico (`rounded-full px-2 py-0.5`) se mantienen circulares según especificación.
- **Sidebar Renovado: Mayor Tamaño e Iconos Más Oscuros y Gruesos**:
  - Ajustado padding y tipografía de navegación (`px-3.5 py-2.5 rounded-xl text-sm font-medium`).
  - Iconos actualizados con mayor grosor y color profundo: `size={18}`, `strokeWidth={2.2}` y color `text-slate-800` (hover `text-slate-950`), eliminando el aspecto lineal débil o pálido.
- **Estandarización de Encabezados y Toolbars Unificadas en una Sola Fila**:
  - **Encabezados Sin Slashes (`/`)**: Títulos limpios sin caracteres divisores superfluos (e.g. `Historial de Ventas`, `Historial de Compras`, `Clientes`, `Proveedores`, `Servicios`, `Catálogo de Productos`), acompañados de su contador numérico badge.
  - **Arquitectura de Toolbar en la Misma Fila**:
    - **A la IZQUIERDA**: Botón de acción principal (`+ Registrar Venta`, `+ Registrar Compra`, `+ Nuevo Cliente`, `+ Nuevo Producto`, `+ Nuevo Servicio`) estilizado en negro sólido con `rounded-xl`.
    - **A la DERECHA (en la misma fila)**: Buscador ágil con icono de lupa estilizado y selectores de filtrado rápido.
- **Pruebas y Build**: 41 tests unitarios aprobados (`npm test`), compilación de producción exitosa en 18.95s (`npm run build`).

### 47. Arquitectura de 3 Capas de Contingencia SRI Multi-Tenant & Monitor Global en SuperAdmin (2026-09-25) — COMPLETADO
- **Cero Impacto al Cliente y Mitigación de Caídas Masivas del SRI (Caso 21/100 tenants con fallos simultáneos)**:
  - **Capa 1 (Nivel Inquilino / Local Reactivo)**:
    - Preservación estricta de secuenciales (`reserveSriEmission`): el número correlativo y la clave de acceso de 49 dígitos se asignan de forma atómica antes de cualquier solicitud de red externa y quedan asegurados en Firestore con `sriStatus: 'pendiente_sri'`.
    - Nunca se alteran, decrementan ni reasignan secuenciales si el SRI responde con timeout, HTTP 500, o códigos transitorios (43/70).
    - En el historial de comprobantes (`TransactionsView.jsx`), el auto-poller reactivo verifica de forma transparente todos los comprobantes en `pendiente_sri` de cualquier tipo (Facturas, Retenciones, Notas de Crédito, Notas de Débito, Guías, Liquidaciones), consultando `AutorizacionComprobantesOffline` y actualizando a `AUTORIZADO` sin intervención del usuario.
  - **Capa 2 (Nivel SuperAdmin / Monitor SRI Global Multi-Tenant)**:
    - Nueva pestaña en `SuperAdminPage.jsx` (`sidebarLinks` con badge en tiempo real de comprobantes pendientes): **"Monitor SRI Global"**.
    - Escaneo concurrente de todos los inquilinos (`scanAllTenantsPendingSri` en `src/services/sriReconciliation.js`) para detectar documentos con `sriStatus === 'pendiente_sri'`.
    - Panel con 4 KPIs en vivo: Documentos Pendientes, Empresas Afectadas, Reconciliados en Sesión y Estado del Gateway SRI WebServices.
    - Botón masivo de un solo clic: **"Sincronizar Todos con el SRI Ahora"** (`batchReconcileSriDocuments`) con control de flujo secuencial (pausas de 350ms para evitar bloqueos por rate-limiting del SRI), barra de progreso en vivo, porcentaje y comprobante activo.
    - Botón de consulta individual por fila + enlace directo al visor RIDE público.
    - Notificaciones automáticas de correo al cliente y emisor disparadas al completarse la autorización.
  - **Capa 3 (Nivel Cloud / Worker Serverless 24/7)**:
    - Endpoint cron serverless `api/cron/reconcile-sri/index.js` configurado en `vercel.json` con frecuencia cada 10 minutos (`*/10 * * * *`).
    - Comunicación HTTPS directa con SRI Producción (`cel.sri.gob.ec`) y Pruebas (`celcer.sri.gob.ec`) con `rejectUnauthorized: false` para evitar bloqueos CORS y SSL.
    - Procesa lotes automáticamente en segundo plano mientras los usuarios siguen emitiendo normalmente.
- **Pruebas y Build**: 45 tests unitarios aprobados (`npm test`), incluyendo prueba integral de contingencia simultánea para 21 tenants, compilación limpia de producción en 4.95s (`npm run build`).














