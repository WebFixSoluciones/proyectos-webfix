# Especificación de Diseño: Accesos Rápidos Minimalistas y de Color Unificado

Este documento describe la especificación de diseño para simplificar visualmente el panel de **Accesos Rápidos** del Dashboard, unificando los colores de los iconos al color primario y eliminando los bordes de las tarjetas.

## 1. Problema de Diseño Visual
El panel de "Accesos Rápidos" muestra actualmente:
- Tarjetas con bordes de color gris/blanco y bordes dinámicos que se iluminan de múltiples colores distintos en hover (naranja, verde, celeste, etc.).
- Fondos de iconos con diferentes tonalidades (naranja, verde, celeste, etc.), creando ruido visual y falta de coherencia de marca con el color primario configurado en el sistema.

## 2. Propuesta de Solución
Rediseñar las tarjetas de accesos rápidos para lograr una estética limpia, minimalista y coherente:
1. **Tarjetas Blancas Sin Bordes (`border-0`):**
   - En modo claro: Fondo blanco puro (`bg-white`), sin borde (`border-0`), con una sombra suave de elevación (`shadow-sm`) que se acentúa sutilmente en hover (`hover:shadow-md`).
   - En modo oscuro: Fondo gris oscuro (`bg-[#151517]`), sin borde (`border-0`), con un incremento leve de luminosidad en hover (`hover:bg-[#18181b]`).
2. **Iconos Unificados al Color Primario:**
   - Todos los iconos (Carrito, Archivo, Caja, Usuarios, Calendario, Engrane) usarán el color primario del ERP.
3. **Fondo de Icono Translúcido Dinámico:**
   - Se utilizará un contenedor con fondo translúcido del 10% del color primario y el texto del icono al 100% de opacidad (`bg-primary/10 text-primary`), tanto en modo claro como en modo oscuro.

---

## 3. Cambios Propuestos

### Componente: Dashboard General
#### [MODIFY] [ErpDashboard.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/dashboard/ErpDashboard.jsx)
- Modificar el mapeo o los 6 botones del grid en `Accesos Rápidos` para aplicar el color primario unificado, el fondo translúcido y quitar los bordes de la tarjeta.

---

## 4. Plan de Verificación

### Pruebas Visuales Manuales
- Abrir la pantalla del Dashboard.
- Confirmar que las tarjetas de accesos rápidos no tengan borde y tengan sombra suave.
- Confirmar que todos los iconos tengan color primario con su fondo translúcido dinámico.
