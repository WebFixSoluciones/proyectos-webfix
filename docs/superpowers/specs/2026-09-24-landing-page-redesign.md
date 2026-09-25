# Design Specification — Rediseño Integral de Landing Page WebFix ERP

**Fecha:** 2026-09-24  
**Estado:** Aprobado para Planificación  
**Autor:** Antigravity / WebFix Core Team  
**Referencias de Diseño:** Brevo & SiteGround (Minimalismo de alto contraste, tipografía negra nítida, paleta sólida de 3 colores, cero gradientes, sin cards anidadas).

---

## 1. Visión y Objetivos

Rediseñar por completo la landing page de WebFix ERP (`LandingLayout.jsx` y `LandingHome.jsx`) para convertirla en una experiencia visual de grado internacional, inspirada en la sobriedad, limpieza y dinamismo de **Brevo** y **SiteGround**:

1. **Header Glassmorphism Flotante**:
   - Barra fija con efecto cristal (`backdrop-blur-md bg-white/80 border-b border-slate-200/80`).
   - Logotipo de WebFix inmediatamente seguido del menú de navegación, **todo alineado a la izquierda** (`flex items-center gap-8`).
   - Acceso de usuarios (`Iniciar Sesión`) y botón de conversión principal (`Comenzar Gratis`) alineados a la derecha en formato píldora sólida.
2. **Ancho al 90% de Pantalla**:
   - Eliminar los anchos artificialmente estrechos (`max-w-5xl`, `max-w-4xl`).
   - Estandarizar un contenedor global amplio `w-[90%] max-w-[1720px] mx-auto` que permita a la interfaz respirar con generosidad en monitores medianos, grandes y ultrawide.
3. **Lenguaje Visual Sin Gradientes & Paleta Estricta de 3 Colores**:
   - **Cero degradados tipo IA** (ni mesh gradients, ni púrpuras/cianes fluorescentes, ni auras circulares difusas).
   - Paleta de color sólida, limpia y táctil:
     - **Base / Lienzo**: Blanco Puro (`#FFFFFF`) y Gris Perla Suave (`#F8FAFC`, `#F1F5F9`).
     - **Texto & Elementos Primarios**: Negro Pizarra de alto contraste (`#0F172A` / `#1E293B`).
     - **Acentos Funcionales**: Azul Eléctrico WebFix (`#2563EB`) y Verde Esmeralda SRI (`#16A34A`).
4. **Cero Ruido & Cero Cards Anidadas**:
   - Títulos de sección limpios, sin burbujas flotantes, sin badges con puntos parpadeantes innecesarios.
   - Prohibido anidar tarjetas dentro de otras tarjetas; cada bloque funcional es una tarjeta individual plana con bordes hairline (`border-slate-200`) y acento de color sólido.
5. **Efectos Parallax y Reveal de Entrada/Salida**:
   - Sistema de scroll reactivo con `IntersectionObserver` y `requestAnimationFrame` pasivo (`useParallaxScroll` y `<ScrollReveal>`).
   - Entrada y salida limpia de tarjetas (staggered reveal), y traslación sutil de capas en mockups para crear profundidad orgánica a 60fps sin dependencias externas pesadas (100% compatible con React 19).
6. **Módulo de Pestañas Interactivas por Segmento (Inspirado en Brevo)**:
   - Pestañas tipo píldora (`[Comercios & Retail]`, `[Empresas & Servicios]`, `[Distribución & Kardex]`) con presentación dividida: propuesta de valor en viñetas directas + botón CTA a la izquierda, y tarjeta de producto real con métrica y testimonio a la derecha.

---

## 2. Arquitectura de Componentes

### 2.1. Archivos Afectados y Nuevos Helpers

| Archivo | Rol | Descripción |
|---|---|---|
| `src/hooks/useParallaxScroll.js` | Nuevo Hook | Hook de cálculo de offset vertical reactivo según la posición de scroll del elemento en el viewport con soporte de dirección y factor de velocidad. |
| `src/components/landing/ScrollReveal.jsx` | Nuevo Componente | Wrapper ligero que detecta visibilidad vía `IntersectionObserver` y dispara clases de entrada/salida suaves (`opacity`, `translateY`, `scale`) con soporte de retraso escalonado (*stagger*). |
| `src/pages/landing/LandingLayout.jsx` | Modificación | Header Glassmorphism flotante con logo + menú a la izquierda, contenedor 90% y footer minimalista a juego. |
| `src/pages/landing/LandingHome.jsx` | Reescritura Total | Rediseño integral de las secciones (Hero, Social Proof, Bondades en Cards, Pestañas por Segmento, Precios, FAQ y CTA Final). |

---

## 3. Especificación Detallada de Secciones

### 3.1. Header Flotante (`LandingLayout.jsx`)
- **Contenedor**: `sticky top-0 z-50 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all duration-200`.
- **Estructura Interna (`w-[90%] max-w-[1720px] mx-auto h-16 flex items-center justify-between`)**:
  - **Bloque Izquierdo (`flex items-center gap-8 md:gap-10`)**:
    - **Logo**: Isotipo WebFix minimalista (`w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm`) + texto `WebFix ERP` en `font-bold text-slate-900 tracking-tight text-lg`.
    - **Menú de Enlaces**: `Soluciones`, `Facturación SRI`, `Punto de Venta`, `Precios`, `Contacto`. Enlaces directos en `text-slate-600 hover:text-slate-950 font-medium text-sm transition-colors`.
  - **Bloque Derecho (`flex items-center gap-3`)**:
    - Enlace de texto: `Iniciar Sesión` (`text-slate-700 hover:text-slate-950 font-medium text-sm px-3 py-2`).
    - Botón de Conversión: `Comenzar Gratis` (botón píldora `px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-none`).
  - **Menú Móvil**: Botón hamburguesa accesible que despliega un drawer limpio con los mismos enlaces y acciones.

### 3.2. Hero Section (Inspirado en Brevo Imagen 1 + SiteGround Imagen 2)
- **Fondo**: Bloque sólido con tinte sutil (`bg-[#F0FDF4]` o `bg-[#EFF6FF]`) con esquinas inferiores redondeadas (`rounded-b-[40px] md:rounded-b-[56px]`) y padding generoso (`pt-12 pb-20 md:pt-16 md:pb-28`).
- **Ancho**: `w-[90%] max-w-[1720px] mx-auto`.
- **Layout Split en 2 Columnas**:
  - **Columna Izquierda (Texto & CTA Directo)**:
    - **Tag de Entrada**: Píldora sutil `inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 mb-4`.
    - **Título (H1)**: `text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.08] max-w-2xl`:
      > "El ERP y Facturación SRI más rápido del Ecuador"
    - **Subtítulo**: `text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mt-4 mb-8`:
      > "Emite comprobantes electrónicos autorizados en 1 segundo, gestiona tu punto de venta en mostrador y controla inventario y bancos sin hojas de cálculo."
    - **Acciones CTA**:
      - Botón principal: `px-7 py-3.5 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-base transition-transform hover:scale-[1.02] flex items-center gap-2`.
      - Botón secundario: `px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-300 transition-colors`.
    - **Micro Confianza**: `Sin tarjeta de crédito • Firma .p12 integrada • SRI ilimitado` con iconos de check verde esmeralda.
  - **Columna Derecha (Maqueta Viva con Parallax Dinámico)**:
    - Composición de capas de la interfaz real de WebFix:
      1. Ventana principal del ERP (Dashboard con balance, ventas del día y estado SRI Activo).
      2. Tarjeta flotante con factura autorizada en tiempo real (`$320.00 • Autorizado SRI 1.1s`) desplazándose con factor parallax `speed={-0.15}`.
      3. Tarjeta flotante de cobro rápido POS (`Ticket #142 • Cobro con F12`) con factor parallax `speed={0.12}`.

### 3.3. Barra de Confianza & Ecosistema
- Tira limpia debajo del Hero con fondo blanco: `Más de 500 comercios y empresas ecuatorianas gestionan su facturación y finanzas con WebFix`.
- Logos limpios en escala de grises de entidades y métodos soportados: SRI Ecuador, Transferencias Bancarias, Visa/Mastercard, RUC/RIMPE.

### 3.4. Bondades en Cards Planas (Inspirado en SiteGround Imagen 3 y Brevo Imagen 4)
- **Título de Sección**:
  - Centrado, tipografía nítida en negro pizarra: `Todo lo que tu negocio necesita para operar sin fricción`.
  - Subtítulo breve de una línea: `Herramientas construidas para la realidad comercial y tributaria del Ecuador`.
  - Cero dots o insignias con animaciones parpadeantes.
- **Grid de Tarjetas 3 Columnas al 90%**:
  - **Card 1: Facturación Electrónica SRI**:
    - Fondo blanco, borde fino `border-slate-200`, acento verde esmeralda.
    - Título: `Facturación SRI Ilimitada`.
    - Descripción: `Facturas, notas de crédito, retenciones y liquidaciones autorizadas al instante con firma .p12.`
    - Botón CTA: `COMIENZA AHORA ↗` (estilo SiteGround).
    - Previsualización gráfica de comprobante emitido.
  - **Card 2: Punto de Venta (POS Mostrador)**:
    - Fondo blanco o tinte celeste sólido suave.
    - Título: `Punto de Venta Ultrarrápido`.
    - Descripción: `Diseñado para atención ágil en mostrador con atajo F12, cobro combinado y ticket térmico.`
    - Botón CTA: `VER PUNTO DE VENTA ↗`.
    - Previsualización gráfica de pantalla POS y cobro múltiple.
  - **Card 3: Control Financiero & Bancos**:
    - Fondo blanco, acento azul eléctrico.
    - Título: `Flujo de Caja & Cartera Real`.
    - Descripción: `Cuentas por cobrar (CxC), cuentas por pagar (CxP), conciliación bancaria y saldos en vivo.`
    - Botón CTA: `EXPLORAR FINANZAS ↗`.
    - Previsualización gráfica de saldos bancarios y estado de cartera.
  - **Card 4: Inventario & Kardex Multibodega**:
    - Control de stock promedio ponderado, descargas automáticas por ventas y alertas de stock mínimo.
  - **Card 5: Captura Inteligente OCR con IA**:
    - Sube facturas de compras en PDF/XML; lectura y registro automático de compras y retenciones.
  - **Card 6: Seguridad & Nube 24/7**:
    - Firma digital protegida, copias de seguridad continuas y acceso seguro desde cualquier dispositivo.

### 3.5. Sección de Pestañas Interactivas por Segmento (Inspirado en Brevo Imagen 5)
- **Título**: `Pensado para todo tipo de negocio: de locales comerciales a grandes empresas`.
- **Selector de Pestañas Central**:
  - `[Comercios & Retail]` • `[Servicios & Profesionales]` • `[Empresas & Distribuidoras]`.
  - Pestaña activa: fondo negro sólido `#0F172A` con texto blanco redondeado en píldora.
  - Pestañas inactivas: fondo neutro con texto oscuro y hover limpio.
- **Contenido Dinámico Split (50% / 50%)**:
  - **Lado Izquierdo**:
    - Tag verde/azul de segmento (ej. `Para locales comerciales y mostradores`).
    - Encabezado: `Ventas en segundos, caja cuadrada y stock en tiempo real`.
    - 4 viñetas concretas con checkmarks sólidos.
    - Botón de acción: `Probar gratis en mostrador`.
  - **Lado Derecho**:
    - Tarjeta limpia con métrica de impacto (ej. `-80% de tiempo en cuadre de caja al cierre del día`) + testimonio y vista de interfaz relevante.

### 3.6. Tabla de Precios Transparentes
- Contenedor amplio al 90%, selector de facturación `Mensual` / `Anual (-20%)`.
- 3 tarjetas de planes limpios (Emprendedor, Negocio Pro, Empresarial) con tipografía monospace/Inter en números, lista de bondades y botón de prueba gratuita.
- Cero degradados; tarjeta recomendada resaltada con marco sólido en Azul Eléctrico y badge minimalista.

### 3.7. Preguntas Frecuentes (FAQ) & Llamado Final a la Acción
- Acordeón de preguntas frecuentes de ancho generoso, sin bordes pesados ni cards anidadas.
- Banner final al 90% con fondo sólido oscuro `#0F172A` o blanco con borde azul, tipografía de alto impacto y botones directos `Crear Cuenta Gratis` y `Hablar con un Asesor`.

---

## 4. Estrategia de Animaciones & Parallax

1. **`useParallaxScroll(ref, { speed, min, max })`**:
   - Escucha eventos de scroll con `requestAnimationFrame` pasivo (`passive: true`).
   - Calcula el desplazamiento relativo `translateY` en píxeles basado en la distancia del elemento respecto al centro de la ventana.
   - Aplica `transform: translate3d(0, ${offset}px, 0)` con aceleración GPU para asegurar 60fps fluidos.
2. **`<ScrollReveal delay={number} direction={'up'|'down'|'fade'}>`**:
   - Usa `IntersectionObserver` con umbral configurable (`threshold: 0.15`).
   - Alterna clases de animación CSS limpias (sin paquetes pesados) que manejan la entrada y salida armónica de las tarjetas al hacer scroll hacia abajo y hacia arriba.

---

## 5. Criterios de Aceptación y Pruebas

- [ ] **Header Glassmorphism**: El header se mantiene fijado con `backdrop-blur` real, el logo y el menú de navegación están alineados a la izquierda, y los botones de usuario/conversión a la derecha.
- [ ] **Ancho 90%**: La página ocupa el 90% del ancho del viewport (`w-[90%] max-w-[1720px] mx-auto`) de forma balanceada en todas las resoluciones.
- [ ] **Cero Gradientes**: Ninguna sección o botón utiliza `linear-gradient` o `radial-gradient` tipo IA. Colores 100% sólidos, limpios y de alto contraste.
- [ ] **Cero Cards Anidadas**: No existen tarjetas dentro de otras tarjetas.
- [ ] **Títulos Limpios**: Títulos directos sin dots parpadeantes ni insignias superfluas.
- [ ] **Pestañas Interactivas**: El selector de segmentos (Comercios, Servicios, Distribuidoras) conmuta el contenido fluidamente.
- [ ] **Efectos Parallax & Reveal**: Los elementos responden al scroll con traslaciones suaves y revelados limpios.
- [ ] **Compatibilidad & Build**: `npm run build` compila con éxito sin errores de lint ni dependencias rotas; las pruebas unitarias existentes se ejecutan y aprueban al 100%.
