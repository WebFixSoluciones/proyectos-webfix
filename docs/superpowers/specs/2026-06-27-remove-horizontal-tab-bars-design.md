# Especificación de Diseño: Eliminación de Barras de Navegación Horizontales Redundantes

Este documento detalla la especificación para eliminar las barras de navegación horizontales redundantes en los módulos de **Finanzas** e **Inventario**, delegando el control de subpestañas completamente a la barra lateral del ERP.

## 1. Problema de Diseño Visual
Los módulos de **Finanzas** e **Inventarios** cuentan actualmente con:
1. Submenús desplegables en la barra lateral del ERP para cada una de sus secciones.
2. Una barra de navegación horizontal (pestañas superiores con fondo azul/púrpura) que replica las mismas opciones.

Esta redundancia provoca:
- Duplicidad visual de elementos de navegación que confunden al usuario.
- Desperdicio de espacio vertical importante en la pantalla principal de trabajo.
- Incoherencia visual con otros módulos (ej. Ventas, que no tiene esta barra horizontal).

## 2. Propuesta de Solución
Se removerán por completo las barras horizontales superiores de ambos módulos. Para lograrlo:
1. **Sincronización de Props:** Se pasarán los estados de navegación de la barra lateral (`gastosInitialSubTab` y `inventarioInitialSubTab`) como props a los respectivos componentes (`GastosCreditosModule` y `InventoryModule`).
2. **Efecto de Escucha (`useEffect`):** Dentro de cada módulo, se añadirá un efecto que actualice el estado del tab activo (`activeTab`) cada vez que cambie la sección elegida en la barra lateral.
3. **Remoción del Bloque HTML de Cabecera:** Se eliminará el bloque de código JSX/TSX correspondiente a la barra horizontal en:
   - `src/components/finances/GastosCreditosModule.jsx`
   - `src/components/inventory/InventoryModule.tsx`

---

## 3. Cambios Propuestos

### 1. Barra Central de Enrutamiento: `src/App.jsx`
- Pasar `initialSubTab={gastosInitialSubTab}` al renderizar `<GastosCreditosModule>`.
- Pasar `initialSubTab={inventarioInitialSubTab}` al renderizar `<InventoryModule>`.

### 2. Módulo de Finanzas: `src/components/finances/GastosCreditosModule.jsx`
- Soportar el prop `initialSubTab`.
- Añadir un `useEffect` para sincronizar `activeTab`.
- Remover el JSX de la barra horizontal (div de cabecera y botones de navegación).

### 3. Módulo de Inventario: `src/components/inventory/InventoryModule.tsx`
- Actualizar `InventoryModuleProps` para soportar `initialSubTab?: string`.
- Soportar el prop `initialSubTab` en la firma del componente.
- Añadir un `useEffect` para sincronizar `activeTab`.
- Remover el TSX de la barra horizontal.

---

## 4. Plan de Verificación

### Pruebas de Compilación
- Ejecutar `npm run build` para asegurar que TypeScript y Vite compilen correctamente.

### Pruebas Visuales Manuales
- Navegar a Finanzas y comprobar que la barra superior horizontal desapareció y que cambiar de submenú en la barra lateral (ej. Historial de Egresos, Pasivos) cambie de sección correctamente.
- Navegar a Inventarios y comprobar lo mismo.
