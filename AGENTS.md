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

## Últimos commits
```
5290ece feat: migrar componentes a Radix Themes UI y remover modulo legacy de proyectos
3e55cde fix(print): ajustar clave de acceso y codigo de barras para no desbordar el encabezado
34dee15 fix(print): reducir tamano de texto en encabezado y pie de pagina legal de la factura
5560ca9 fix(print): quitar columna COD/BARRAS de la tabla y compactar tipografia en datos de cliente y fechas
```
