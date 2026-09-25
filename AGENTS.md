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





