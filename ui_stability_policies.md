# Políticas de Estabilidad Visual y Rendimiento de la Interfaz (UI)

Este documento define las políticas y lineamientos técnicos para el desarrollo de la interfaz de usuario del ERP. El objetivo es mantener una experiencia fluida, minimizar el uso de CPU/GPU del navegador (especialmente crucial para dispositivos de bajo rendimiento en el Punto de Venta / POS) y evitar la sobrecarga gráfica del sistema.

---

## 1. Reglas de Renderizado y Estilos de Borde y Sombra

*   **Estandarización de Radio de Borde (Border Radius):**
    *   **Tarjetas y Contenedores:** Todos los paneles, tarjetas (`cards`), y contenedores principales del sistema deben tener un radio de borde exacto de **10px**.
    *   **Botones y Controles Interactivos:** Los botones, inputs, selects, textareas, y atajos (`kbd`) deben tener un radio de borde de **4px**.
    *   **Excepción Circular:** Los avatares, indicadores de estado circulares, y botones flotantes redondos deben usar `.rounded-full`.
*   **Eliminación de Sombras:**
    *   No se deben aplicar sombras (`box-shadow`) en botones, tarjetas ni inputs. Esto se gestiona de manera centralizada a nivel global con `box-shadow: none !important`.
    *   Para dar profundidad visual, se deben utilizar bordes sutiles (como `border-white/10` o `border-gray-250`) en lugar de sombras.

---

## 2. Prevención de Sobrecarga en la GPU y CPU del Cliente

### 2.1 Limitación de Filtros Complejos (Backdrop Filter + Shadows)
El uso simultáneo de filtros de desenfoque (`backdrop-filter: blur()`), sombras complejas multinivel, y opacidad variable sobre elementos con desplazamiento (scroll) causa caídas drásticas de frames por segundo (FPS) en navegadores móviles o terminales POS integradas.
*   **Política:** Prohibido combinar `backdrop-filter` con sombras en contenedores con scroll dinámico o listas largas.
*   **Alternativa:** Usar fondos planos con transparencias sencillas (por ejemplo, `bg-black/80` o `bg-white/95`) con un borde fino para la separación.

### 2.2 Animaciones Aceleradas por Hardware
Las transiciones y animaciones que alteran el flujo del layout (como animar `width`, `height`, `margin`, `padding`, `top`, `left`, etc.) obligan al navegador a recalcular la geometría de toda la página ("Reflow" y "Repaint").
*   **Política:** Toda animación o transición de movimiento/escala debe utilizar únicamente propiedades aceleradas por la GPU:
    *   `transform` (para traslaciones con `translate3d` o `translate`, escala con `scale`, rotación con `rotate`).
    *   `opacity` (para desvanecimientos).
*   **Buenas Prácticas:**
    *   Utilizar la propiedad `will-change` con moderación y solo en elementos que se animen constantemente para preparar al navegador.
    *   Limitar las animaciones infinitas de pulso o brillo en segundo plano en la pantalla del POS.

---

## 3. Optimización del Ciclo de Vida y Renderizado en React

### 3.1 Memorización de Componentes Críticos (POS y Ventas)
El Punto de Venta dibuja cientos de productos en el catálogo de ventas. Cualquier cambio en el carrito de compras puede causar un renderizado de toda la lista si no se optimiza adecuadamente.
*   **Política:**
    *   Los componentes de items del catálogo (tarjetas de productos individuales) deben estar envueltos en `React.memo` para evitar redibujados cuando sus props no cambien.
    *   El cálculo del total de la venta, impuestos o filtrados de búsqueda pesados deben memorizarse usando `useMemo()`.
    *   Las funciones de callback que se pasan como props a componentes hijos memorizados deben envolverse en `useCallback()`.

### 3.2 Listado Virtual para Grandes Volúmenes de Datos
*   **Política:** Cuando una lista (como el historial de facturas, transacciones o catálogo) supere los 100 elementos renderizados en el DOM, se debe implementar una técnica de **Listado Virtual** (renderizar solo los elementos visibles en el viewport) para evitar el colapso de memoria del navegador.

---

## 4. Consistencia del Código de Diseño

*   **Uso de Variables CSS Centralizadas:**
    *   Los colores de marca y estilos compartidos deben definirse únicamente dentro del bloque `@theme` o `:root` en `src/index.css`.
    *   Evitar definir colores inline arbitrarios en los archivos JSX (por ejemplo, evitar `bg-[#1a1c24]`) para garantizar la mantenibilidad y consistencia del diseño en todo el ERP.
