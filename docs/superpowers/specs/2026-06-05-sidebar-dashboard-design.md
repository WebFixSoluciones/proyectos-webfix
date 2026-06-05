# Especificación de Diseño - Ajuste de Estilos de Sidebar, Layout y Dashboard

Este documento detalla el plan de diseño para corregir los hovers y estados activos en el sidebar, restaurar la altura del sidebar al pie de la página mediante el ajuste del viewport central, y corregir el desbordamiento horizontal en el dashboard.

## 1. Requerimientos Visuales y de Comportamiento

### Sidebar
- **Hover de Botón**:
  - Modo Claro: Fondo celeste `bg-[#eef2f6]` y texto oscuro `text-gray-900`.
  - Modo Oscuro: Fondo gris translúcido `bg-white/10` y texto blanco `text-white`.
- **Iconos**:
  - Pasar al color primario en hover (mediante `group-hover`) y en estado activo.
  - En modo claro: Azul eléctrico `text-[#0066cc]`.
  - En modo oscuro: Azul brillante `text-blue-400`.
  - Unificación: Todos los iconos del sidebar (incluyendo Ventas, Finanzas, etc.) deben usar el color primario de hover/activo para mantener la coherencia con la marca.

### Layout del Viewport y Sidebar Completo
- Cambiar la clase del contenedor raíz en `src/App.jsx` de `min-h-screen` a `h-screen overflow-hidden`.
- Esto obliga al sidebar (`h-full`) a estirarse exactamente al 100% del viewport de la pantalla y elimina el scrollbar en el cuerpo (`body`), asegurando que el sidebar toque el pie de página.
- El scroll vertical sólo ocurrirá dentro del `Editor Area`.

### Dashboard Responsivo y Márgenes
- Agregar padding horizontal y un ancho máximo al `Editor Area` (`px-4 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto`) para evitar que el dashboard quede pegado a los bordes laterales.
- Ajustar el grid en `src/components/dashboard/ErpDashboard.jsx` de `lg:grid-cols-12` a `xl:grid-cols-12`.
- En resoluciones medianas (hasta 1280px), las dos columnas del dashboard (Proyectos y Consola SRI) colapsarán a una sola columna de ancho completo (`col-span-12`) para evitar el descompresionamiento excesivo que genera desbordamientos en tablas y textos.

---

## 2. Componentes Afectados

### [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx)
- Modificar el div contenedor principal.
- Actualizar las clases de Tailwind de los 9 botones principales del sidebar para usar `group`, `hover:bg-[#eef2f6]` (o `hover:bg-white/10`), y `group-hover:text-[#0066cc]` (o `group-hover:text-blue-400`).
- Agregar padding responsivo y ancho máximo al `Editor Area`.

### [ErpDashboard.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/dashboard/ErpDashboard.jsx)
- Cambiar la declaración del grid de doble panel para usar `xl:grid-cols-12`, `xl:col-span-7` y `xl:col-span-5`.
