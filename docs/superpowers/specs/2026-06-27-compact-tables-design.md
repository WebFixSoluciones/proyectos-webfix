# Especificación de Diseño: Tablas Compactas y Minimalistas

Este documento detalla el plan de diseño para mejorar de forma global la densidad de información y la usabilidad de las tablas a lo largo de todo el sistema.

## 1. Problema de Espaciado Actual
Las tablas del sistema utilizan actualmente un padding vertical amplio de `py-3.5` (14px) y un padding horizontal de `px-6` (24px).
Esto provoca que:
- Se visualicen pocos registros en la pantalla sin necesidad de hacer scroll.
- Haya mucho espacio vacío vertical innecesario.
- Los botones de iconos (`.btn-icon`) de 32px aumenten la altura total de la fila.

## 2. Propuesta de Diseño Aceptada: Clean Minimal con Padding de 5px
Se implementará un diseño de tabla ultra-compacto que maximiza el espacio y mejora el escaneo visual de datos.

### Lineamientos de Diseño:
1. **Padding Vertical de 5px:** Las celdas del cuerpo (`td`) y del encabezado (`th`) tendrán exactamente **5px** de padding superior e inferior (`padding-top: 5px !important`, `padding-bottom: 5px !important`).
2. **Padding Horizontal de 16px:** Las celdas tendrán **16px** de padding izquierdo y derecho (`padding-left: 16px !important`, `padding-right: 16px !important`). Esto corresponde a un balance intermedio y moderno (equivalente a `px-4`), reduciendo los 24px originales para optimizar el ancho de la tabla.
3. **Escalamiento de Iconos en Tabla (28px):** Para que las filas no se ensanchen debido a la altura de los botones de acción de 32px, todos los botones `.btn-icon` dentro de celdas de tabla se adaptarán a un tamaño compacto de **28px de alto y ancho**, con iconos internos SVG de **13px** y stroke-width proporcional.
4. **Mapeo Global en CSS:** La mejora se implementará directamente en la hoja de estilos global [index.css](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix/src/index.css). Esto asegura que **todas las tablas del sistema** adopten el nuevo formato de manera automática, sin riesgo de discrepancias entre módulos.

---

## 3. Cambios Propuestos

### Componente: Estilos Globales
#### [MODIFY] [index.css](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/index.css)
Añadir las reglas globales para `table th`, `table td` y el tamaño de `.btn-icon` dentro de las tablas.

---

## 4. Plan de Verificación

### Pruebas Visuales Manuales
1. **Pestañas de Ventas (Historial, Preventas, Cotizaciones):**
   - Verificar que el alto de las filas se reduzca significativamente (altura de fila aproximada de 38px).
   - Validar que el padding se aplique correctamente sin desalineaciones de texto.
   - Confirmar que los botones de iconos (`.btn-icon`) se escalen a 28px e iconos a 13px.
2. **Otros Módulos:**
   - Comprobar que las tablas de Compras, Clientes y Proveedores se muestren de forma compacta y consistente.
