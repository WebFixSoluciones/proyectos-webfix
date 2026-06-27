# Especificación de Diseño: Mejora General de Visibilidad de Iconos

Este documento detalla el plan de diseño para mejorar de forma global la visibilidad, legibilidad y estética de los botones con iconos (`.btn-icon`) a lo largo de todo el sistema.

## 1. Problema de Visibilidad Actual
Actualmente, la clase global `.btn-icon` en [index.css](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/index.css) fuerza un fondo transparente (`background: transparent`) y un color heredado (`color: inherit`).
Esto provoca que:
- Las clases utilitarias de Tailwind como `bg-primary`, `bg-red-600` y `text-white` aplicadas a botones de iconos sean anuladas.
- Todos los iconos se rendericen planos, grises y agrupados de forma ambigua, dificultando al usuario distinguir rápidamente acciones o tipos de archivos (por ejemplo, diferenciar entre el archivo XML y PDF).
- Falta de respuesta interactiva adecuada (hover).

## 2. Propuesta de Diseño Aceptada: Botones Dinámicos Profesionales
Se implementará un diseño basado en botones con fondos de tonalidades sutiles, iconos con colores de alto contraste y esquinas redondeadas estilizadas.

### Lineamientos de Diseño:
1. **Fondo Sutil Dinámico:** Cada botón de icono tendrá un fondo con un **12% de opacidad** de su color respectivo (el color primario del tema o el color del estado/acción). Esto se calcula dinámicamente mediante la función `color-mix()` de CSS nativo.
2. **Color de Icono de Contraste:** El icono vectorial interno (SVG) se renderizará con el color de base sólido (100% de opacidad) para asegurar un excelente contraste.
3. **Radio de Borde (Border Radius):** Se aplicará un radio de borde de **10px** (`border-radius: 10px !important`) a todos los botones `.btn-icon`.
4. **Interactividad (Hover):** Al pasar el cursor sobre el botón (hover), el fondo sutil se oscurecerá ligeramente (20% de opacidad) para dar feedback visual instantáneo.
5. **Mapeo Automático a Nivel Global:** La mejora se implementará directamente en la hoja de estilos global [index.css](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/index.css), interceptando y adaptando las clases utilitarias que los componentes ya usan (como `bg-primary`, `bg-red-600`, `bg-amber-600` y `bg-blue-600`). Esto garantiza que **todo el sistema se actualice automáticamente** sin riesgo de romper el diseño y con mínimo impacto en el código de los componentes.

---

## 3. Cambios Propuestos

### Componente: Estilos Globales
#### [MODIFY] [index.css](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/index.css)
Reemplazar la definición de `.btn-icon` para implementar la nueva especificación de diseño y añadir las clases de mapeo inteligente de colores.

---

## 4. Plan de Verificación

### Pruebas Visuales Manuales
1. **Tabla de Transacciones (Comprobantes):**
   - Verificar que los iconos de archivos (XML en verde, PDF en rojo, RIDE en ámbar, Correo en azul) se rendericen con fondo sutil, color de icono contrastante y bordes de 10px.
   - Verificar que los botones deshabilitados/no disponibles mantengan un estilo grisáceo opaco de bajo contraste.
   - Verificar que las acciones de fila (Editar en azul, Eliminar en rojo) se vean consistentes y con los mismos radios de borde.
2. **Otros Módulos:**
   - Verificar botones de iconos generales en paneles laterales, formularios u otros listados para asegurar que no haya regresiones visuales.
   - Asegurar que los iconos de cerrar (X) en modales mantengan su fondo transparente y no se vean alterados.
