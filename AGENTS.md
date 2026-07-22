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

### 7. Control Financiero — Fase 1: Movimientos (2026-07-22) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-07-22-control-financiero-redesign.md`
**Plan:** `docs/superpowers/plans/2026-07-22-finanzas-fase1-movimientos.md`
**Commits:** `93bdd9a` → `3ab6ef9` (8 commits)

Registro central de ingresos/egresos con partidas múltiples, abonos parciales, filtros, exportación CSV, estados UI (carga/vacío/error/éxito) y auditoría completa en `fin_auditoria`.

Próxima: **Fase 3: Cuentas por Pagar (CxP)**.

### 8. Control Financiero — Fase 2: Cuentas por Cobrar (2026-07-22) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-07-22-control-financiero-redesign.md`
**Plan:** `docs/superpowers/plans/2026-07-22-finanzas-fase2-cxc.md`
**Commits:** `3ab6ef9` → `79a3826` (4 commits)

Seguimiento de facturas de venta a crédito con abonos parciales, aging de saldos (0-30/31-60/61-90/+90 días), filtros, exportación CSV, KPIs de cartera y estados UI completos.

Próxima: **Fase 3: Cuentas por Pagar (CxP)**.

### 9. Control Financiero — Fase 6: Préstamos Bancarios (2026-07-22) — COMPLETADO
**Spec:** `docs/superpowers/specs/2026-07-22-control-financiero-redesign.md`

Obligaciones financieras con CRUD de préstamos, generación automática de tabla de amortización (3 métodos: Francés, Alemán, Americano), registro de pagos de cuota, cálculo de saldo pendiente, alertas de cuotas vencidas, KPIs de deuda y estados UI completos.

## Últimos commits
```
3a1f43e feat: implementar motor avanzado de descuentos y promociones
b58dfdd feat: agregar alertas y validaciones profesionales de cliente, carrito y formulario
055d990 feat: implementar tipo de descuento especial SIN_IVA
6152313 fix: importar icono Percent en PosView y TransactionForm
79c9404 fix: corregir referencia a propiedad de subtotal de linea en POS
```
