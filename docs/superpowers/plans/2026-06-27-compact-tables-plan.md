# Tablas Compactas (Opción B) y de Alto Contraste Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar de forma global las tablas compactas minimalistas (Opción B) con un padding vertical máximo de 5px, color de textos y títulos en `#000000` (alto contraste), font-weight de 400, filas cebradas sutiles y botones de iconos reescalados a 28px.

**Architecture:** Modificación de `src/index.css` agregando estilos globales con alta especificidad para los elementos `table`, `thead`, `tbody`, `th`, `td` y `.btn-icon` dentro de celdas.

**Tech Stack:** CSS vanilla.

---

### Task 1: Modificar estilos globales de tablas en index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Añadir reglas globales de tablas en index.css**

Añadir al final de `src/index.css` las reglas de estilo globales para configurar el padding de 5px, color `#000000` y font-weight de 400 para cabeceras y celdas (y blanco `#ffffff` en modo oscuro), filas cebradas sutiles y reescalado de botones de iconos de tabla a 28px con iconos internos SVG de 13px.

**Code to append to index.css:**
```css
/* --------------------------------------------------------------------------
   ESTILOS GLOBALES DE TABLAS COMPACTAS (OPCIÓN B - MODERN STRIPE)
   -------------------------------------------------------------------------- */
table th,
table td {
  padding-top: 5px !important;
  padding-bottom: 5px !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
  color: #000000 !important;
  font-weight: 400 !important;
}

/* Invertir color para modo oscuro */
.dark table th,
.dark table td,
[class*="dark"] table th,
[class*="dark"] table td {
  color: #ffffff !important;
}

/* Cabecera con fondo gris sutil y borde */
table thead tr {
  background-color: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.dark table thead tr,
[class*="dark"] table thead tr {
  background-color: rgba(255, 255, 255, 0.02) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

/* Filas cebradas (alternadas) muy suaves */
table tbody tr:nth-child(even) {
  background-color: rgba(248, 250, 252, 0.5) !important;
}

.dark table tbody tr:nth-child(even),
[class*="dark"] table tbody tr:nth-child(even) {
  background-color: rgba(255, 255, 255, 0.015) !important;
}

/* Escalamiento de botones de icono dentro de tablas a 28px */
table td .btn-icon,
table td .table-icon-btn {
  width: 28px !important;
  height: 28px !important;
  border-radius: 8px !important;
}

table td .btn-icon svg,
table td .table-icon-btn svg {
  width: 13px !important;
  height: 13px !important;
  stroke-width: 2.2px !important;
}
```

- [ ] **Step 2: Ejecutar la compilación del proyecto para validar el build**

Run: `npm run build`
Expected: Compilación finalizada con éxito sin errores de CSS o sintaxis.

- [ ] **Step 3: Guardar y comprometer cambios**

Run:
```bash
git add src/index.css
git commit -m "style: implement global compact tables with 5px padding and high contrast text"
```
Expected: Commit realizado con éxito.
