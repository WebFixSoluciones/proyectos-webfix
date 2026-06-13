# Especificación de Diseño - Rediseño de Login Split-Screen

Este documento define la arquitectura visual, componentes e interacción de la nueva pantalla de acceso para WebFix ERP, utilizando una estructura dividida (Split-Screen) de alta fidelidad y estética premium.

## 1. Arquitectura de Interfaz (Layout)

La pantalla se estructurará mediante una grilla responsiva de CSS (`grid grid-cols-1 md:grid-cols-12`):

### Panel Izquierdo: Showcase de Marca (5 columnas en escritorio)
* **Visibilidad**: Visible en pantallas medianas y grandes (`hidden md:flex md:col-span-5 lg:col-span-5`).
* **Estilo**: Fondo oscuro profundo (`bg-[#09090b]`) con gradientes decorativos animados.
* **Elementos**:
  - Logo corporativo de WebFix ERP.
  - Título descriptivo: `"WebFix ERP"`.
  - Eslogan: `"Gestión Inteligente de Proyectos y Finanzas"`.
  - Beneficios clave destacados con iconos vectoriales de `lucide-react` (`ShieldCheck`, `Sparkles`, `TrendingUp`):
    - **Seguridad Garantizada**: Datos protegidos en la nube de Firebase.
    - **Asistente AI**: Optimización y consultas asistidas por Inteligencia Artificial.
    - **Inventario y Facturación**: Control de Kardex y POS integrado.

### Panel Derecho: Formulario de Acceso (7 columnas en escritorio)
* **Visibilidad**: Siempre visible (`col-span-1 md:col-span-7 lg:col-span-7 flex items-center justify-center`).
* **Estilo**: Fondo adaptativo según el tema (claro: `bg-slate-50`, oscuro: `bg-[#020204]`).
* **Tarjeta de Login (Card)**:
  - Tarjeta de estilo Glassmorphism con bordes curvos muy amplios (`rounded-[2.5rem]`) y sombra profunda de elevación.
  - Clases para tema claro: `bg-white/70 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50`.
  - Clases para tema oscuro: `bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/80`.
  - Título: `"Acceso al Sistema"`.
  - Campos de entrada interactivos con bordes delgados y resplandor al enfocar.
  - Botón de envío con gradiente violeta/índigo de transición suave y efecto hover de elevación.

---

## 2. Paleta de Colores y Tipografía

* **Tipografía**: Fuente `Inter` del sistema, pesos semi-bold (600), bold (700) y extra-bold (800) para jerarquía de títulos.
* **Colores Primarios**:
  - Violeta: `#6d28d9` (violet-700) y `#7c3aed` (violet-600)
  - Índigo: `#4f46e5` (indigo-600) y `#4338ca` (indigo-700)
  - Oscuro Base: `#020204` y `#09090b`
  - Fondo Claro: `#f8fafc` (slate-50)

---

## 3. Micro-Interacciones y Transiciones

* **Inputs**: Transición suave de 300ms en el color de fondo, borde y sombra. Al enfocar (`focus`), se muestra un borde de color violeta y una sombra de resplandor.
* **Botón de Enviar**: Animación hover con escala del 1.02% y reducción de escala al presionar (click).
* **Conmutador de Tema (Sun/Moon)**: Botón flotante superior derecho en el panel del formulario con transición de opacidad y escala.

---

## 4. Pruebas y Validación de Responsividad

* **Desktop (>= 768px)**: Muestra el Split-Screen en su proporción 5:7.
* **Mobile (< 768px)**: Oculta el panel izquierdo de Showcase y centra la tarjeta de login a pantalla completa.

---

## 5. Código a Modificar

El rediseño se aplicará directamente en la sección de login de `src/App.jsx` (reemplazando el bloque `// --- PANTALLA DE LOGIN ---`).
