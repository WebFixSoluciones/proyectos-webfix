# AGENTS.md — Memoria del proyecto

## Proyecto

**proyectos-webfix** — ERP ligero para gestión empresarial (Ecuador).
React 19 + Vite 8 | Tailwind CSS 4 | Firebase | React Router 7

## Walkthroughs activos (ordenados por fecha)

### 1. Design Standardization (2026-07-06) — EN PROGRESO
**Spec:** `docs/superpowers/specs/2026-07-06-design-standardization-design.md`
**Plan:** `docs/superpowers/plans/2026-07-06-design-standardization-plan.md`

Estandarizar todo el UI a **Flat Modern Design** (Token-First). 8 tareas:

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Actualizar `designTokens.css` con paleta azul `#2563EB` | pendiente |
| 2 | Mapear tokens en `index.css` (`@theme` block) | pendiente |
| 3 | Crear 5 componentes base (`Button`, `Card`, `Badge`, `Input`, `Table`) en `src/components/ui/` | pendiente |
| 4 | Migrar `Sidebar.jsx` (~15 colores hardcodeados) | pendiente |
| 5 | Migrar `LoginPage` y `RegisterPage` | pendiente |
| 6 | Migrar dashboard (`ErpDashboard`, `GeneralSettings`, etc.) | pendiente |
| 7 | Migrar finanzas (~13 archivos), inventario (~5), landing (~6), etc. | pendiente |
| 8 | Actualizar `ui_stability_policies.md` y validación final | pendiente |

**Reglas:** Zero shadows, sin `bg-[#...]`, sin `text-[Npx]`, sin `backdrop-blur`, radius 4-6px, sin dark mode.

### 2. Purchase Module (2026-06-28)
**Plan:** `docs/superpowers/plans/2026-06-28-purchase-module-plan.md`
Renombrar "Compras" a "Historial de Compras", integrar `TransactionsView`, renderizar `PurchaseForm`.

### 3. Dashboard & Tabbars (2026-06-27)
**Plan:** `docs/superpowers/plans/2026-06-27-dashboard-and-tabbars-plan.md`
Remover barras de pestañas horizontales, migrar a sidebar navigation.

### 4. Preventas Workflow (2026-06-27)
### 5. Compact Tables (2026-06-27)
### 6. SuperAdmin Sidebar & Tenant Mgmt (2026-06-18)

## Últimos commits
```
3a1f43e feat: implementar motor avanzado de descuentos y promociones
b58dfdd feat: agregar alertas y validaciones profesionales de cliente, carrito y formulario
055d990 feat: implementar tipo de descuento especial SIN_IVA
6152313 fix: importar icono Percent en PosView y TransactionForm
79c9404 fix: corregir referencia a propiedad de subtotal de linea en POS
```
