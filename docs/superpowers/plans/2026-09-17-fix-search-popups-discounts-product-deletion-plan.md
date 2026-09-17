# Corrección Integral: Buscadores, Popups Radix, Eliminación de Productos y Descuentos en Ventas y POS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el diseño de buscadores y popups a los estándares Radix Themes 3.0, asegurar que los productos desactivados/eliminados no aparezcan en ventas con soporte de eliminación física en inventario, y reparar la visualización y cálculo de descuentos (maestros y manuales) en Venta Administrativa y POS.

**Architecture:** Modificación de `ProductRepository` y componentes de vista (`TransactionForm`, `PosView`, `InventoryModule`), más el servicio unificado `discountCalcService.js`.

**Tech Stack:** React 19, Radix Themes 3.0, Tailwind CSS 4, Firebase Firestore, Node Test Runner.

---

### Task 1: Corrección de Dropdowns de Búsqueda y Popups en TransactionForm y PosView

- [ ] Reemplazar `<UiButton variant="outline">` en el dropdown de búsqueda de clientes de `TransactionForm.jsx` por una lista flotante con diseño Radix, hover pastel `var(--accent-3)`, badges y bordes finos.
- [ ] Reemplazar `<UiButton variant="outline">` en el dropdown de búsqueda de productos de `TransactionForm.jsx` con items flotantes limpios, precio mono y badge de stock.
- [ ] Actualizar el dropdown de clientes en `PosView.jsx` con el mismo estándar de diseño.
- [ ] Corregir modales en `TransactionForm.jsx` (`isQuickAddOpen`, `isQuickAddProductOpen`, `selectedLineItemForDiscount`, `authDialog`) asegurando cabeceras con botón `X` y backdrop `bg-[var(--black-a7)]`.
- [ ] Corregir modales en `PosView.jsx` (`isQuickAddOpen`, `selectedLineItemForDiscount`, `authDialog`, `isSearchModalOpen`) usando backdrop `bg-[var(--black-a7)]` y cabeceras pulidas.

### Task 2: Eliminación de Productos y Filtrado de Inactivos en Ventas

- [ ] En `ProductRepository.ts`, actualizar `delete(id, permanent)` para permitir eliminación física de Firestore (`inventory_products`, `finances_products`, `inventory_skus`) o soft-delete (`status: 'INACTIVE'`).
- [ ] En `InventoryModule.tsx`, añadir filtro por estado (Activos, Inactivos, Todos), badge rojo "Inactivo" en la tabla, y opciones claras al eliminar un producto.
- [ ] En `TransactionForm.jsx`, asegurar que el buscador rápido, el buscador avanzado y el selector de productos filtren con `isSellable(p)`.
- [ ] En `PosView.jsx`, asegurar que la búsqueda por código de barras (`handleSearchKeyDown`) y los listados filtren estrictamente con `isSellable(p)`.

### Task 3: Visualización y Cálculo de Descuentos en Venta Administrativa y POS

- [ ] En `discountCalcService.js`, flexibilizar y robustecer `isDiscountScheduleActive` (fechas ISO, `activo !== false`, soporte de descuentos manuales).
- [ ] En `TransactionForm.jsx`, actualizar `getActiveDiscounts` para aceptar `VENTA` y `GLOBAL` usando `isDiscountScheduleActive`.
- [ ] En `TransactionForm.jsx`, añadir la opción de ingresar Descuento General manual (% o $) además de los preconfigurados, y permitir descuento manual por ítem en el modal de descuento de línea.
- [ ] En `PosView.jsx`, actualizar `getActiveDiscounts`, añadir controles para descuento manual (% o $) en el panel de Descuento General, y permitir descuento manual en el modal de descuento por ítem.
- [ ] Verificar que `calculateTransactionTotals` aplique correctamente los descuentos y preserve el cálculo fiscal para el SRI.

### Task 4: Verificación y Pruebas

- [ ] Ejecutar `npm test` y comprobar que los 15 tests comerciales sigan pasando al 100%.
- [ ] Ejecutar `npm run build` y verificar compilación limpia sin advertencias críticas.
