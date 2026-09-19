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

## Últimos commits
```
e3316ef feat(inventario): submodulo dedicado de servicios con segregacion de productos e integracion global
063c6a3 fix(smtp): auto-detect default port, force STARTTLS on port 587, clean password spaces and add toggle
b587ab5 test(finanzas): prueba automatizada de venta combinada con abono a banco y saldo a CxC
f4702ac feat(cartera): modal profesional de pagos y cobros con impacto bancario en CxC y CxP
7c4c235 feat(clientes): ficha completa de cliente con activacion y gestion de linea de credito
383db16 feat(credito): apertura en caliente en TransactionForm y autorizacion supervisor en PosView
98dea7b feat(compras): integracion de cuentas bancarias y vencimiento de credito en PurchaseForm
1e322ed feat(ventas): selector dinamico de cuentas bancarias en TransactionForm y PosView
d0f0b02 feat(finances): soporte para sincronizacion automatica con fin_bancos en ventas y compras
43ff54f feat(finances): crear FinancialPageHeader y estandarizar encabezados en los 11 submodulos
```
