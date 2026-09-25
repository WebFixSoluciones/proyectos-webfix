# Rediseño Integral de Landing Page WebFix ERP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar por completo la landing page de WebFix ERP (`LandingLayout.jsx` y `LandingHome.jsx`) con ancho al 90%, header glassmorphism con menú a la izquierda, efectos parallax y scroll-reveal de entrada/salida, paleta sólida de 3 colores sin gradientes, títulos limpios sin ruido ni burbujas, y cero tarjetas anidadas inspirado en Brevo y SiteGround.

**Architecture:** Módulo de presentación desacoplado con hook nativo reactivo `useParallaxScroll` y wrapper `<ScrollReveal>` para animaciones fluidas a 60fps sin dependencias externas pesadas en React 19; Header persistente glassmorphism (`LandingLayout.jsx`) con navegación agrupada a la izquierda; Secciones modulares de alto impacto en `LandingHome.jsx` organizadas al 90% del viewport con componentes planos de alta legibilidad.

**Tech Stack:** React 19, Tailwind CSS 4, `@radix-ui/themes`, Lucide React, Vite 8, Node.js Test Runner.

---

### Task 1: Motor Ligero de Parallax y Revelado Reactivo

**Files:**
- Create: `src/hooks/useParallaxScroll.js`
- Create: `src/components/landing/ScrollReveal.jsx`
- Create: `tests/landing-animation.test.mjs`

- [ ] **Step 1: Escribir prueba unitaria para la lógica matemática de parallax**

Crear `tests/landing-animation.test.mjs`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

// Helper de cálculo de offset de parallax
export function calculateParallaxOffset({ scrollY, elementTop, viewportHeight, speed = 0.1, min = -100, max = 100 }) {
  const elementCenter = elementTop + 100; // altura estándar estimada
  const viewportCenter = scrollY + viewportHeight / 2;
  const distanceFromCenter = viewportCenter - elementCenter;
  const rawOffset = distanceFromCenter * speed;
  return Math.min(Math.max(rawOffset, min), max);
}

test('calculateParallaxOffset calcula el desplazamiento proporcional y respeta límites min/max', () => {
  const offsetNormal = calculateParallaxOffset({
    scrollY: 500,
    elementTop: 600,
    viewportHeight: 800,
    speed: 0.1
  });
  // viewportCenter = 500 + 400 = 900. elementCenter = 700. distance = 200. rawOffset = 20.
  assert.equal(offsetNormal, 20);

  const offsetClamped = calculateParallaxOffset({
    scrollY: 3000,
    elementTop: 200,
    viewportHeight: 800,
    speed: 0.2,
    max: 50
  });
  assert.equal(offsetClamped, 50);
});
```

- [ ] **Step 2: Ejecutar prueba unitaria para verificar que pasa**

Run: `node --test tests/landing-animation.test.mjs`  
Expected: PASS

- [ ] **Step 3: Implementar `useParallaxScroll.js` y `ScrollReveal.jsx`**

Crear `src/hooks/useParallaxScroll.js`:
```javascript
import { useEffect, useState } from 'react';

/**
 * Hook reactivo para efectos parallax con requestAnimationFrame pasivo.
 * @param {React.RefObject} elementRef - Referencia al elemento a desplazar.
 * @param {Object} options - Opciones de velocidad y límites.
 */
export function useParallaxScroll(elementRef, { speed = 0.15, min = -80, max = 80, disabled = false } = {}) {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            // Centro de la pantalla vs centro del elemento
            const elementCenter = rect.top + rect.height / 2;
            const screenCenter = viewportHeight / 2;
            const diff = screenCenter - elementCenter;
            const calculated = Math.min(Math.max(diff * speed, min), max);
            setOffsetY(calculated);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [elementRef, speed, min, max, disabled]);

  return offsetY;
}
```

Crear `src/components/landing/ScrollReveal.jsx`:
```jsx
import { useEffect, useRef, useState } from 'react';

/**
 * Wrapper liviano con IntersectionObserver para entrada y salida suave de cards y secciones.
 */
export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up', // 'up' | 'down' | 'fade'
  threshold = 0.12,
  triggerOnce = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce && domRef.current) {
              observer.unobserve(domRef.current);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    const currentEl = domRef.current;
    if (currentEl) observer.observe(currentEl);

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [threshold, triggerOnce]);

  const getTransformClasses = () => {
    if (direction === 'up') {
      return isVisible
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 translate-y-6 scale-[0.98]';
    }
    if (direction === 'down') {
      return isVisible
        ? 'opacity-100 translate-y-0 scale-100'
        : 'opacity-0 -translate-y-6 scale-[0.98]';
    }
    return isVisible ? 'opacity-100' : 'opacity-0';
  };

  return (
    <div
      ref={domRef}
      style={{
        transitionDuration: '500ms',
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={`transition-all ${getTransformClasses()} ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar prueba y verificar compilación**

Run: `node --test tests/landing-animation.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit de Task 1**

```bash
git add src/hooks/useParallaxScroll.js src/components/landing/ScrollReveal.jsx tests/landing-animation.test.mjs
git commit -m "feat(landing): agregar hook useParallaxScroll y componente ScrollReveal para animaciones fluidas"
```

---

### Task 2: Rediseño del Header Flotante Glassmorphism y Layout Global al 90% (`LandingLayout.jsx`)

**Files:**
- Modify: `src/pages/landing/LandingLayout.jsx`

- [ ] **Step 1: Reestructurar `LandingLayout.jsx`**
  - Implementar contenedor fijo `sticky top-0 z-50 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80`.
  - Agrupar Logo y menú de enlaces a la izquierda en un solo bloque flex continuo (`flex items-center gap-8 md:gap-10`).
  - Ubicar botones de sesión (`Iniciar Sesión`) y conversión (`Comenzar Gratis` píldora negra sólida `#0F172A`) en el extremo derecho.
  - Asegurar que el ancho del header, del contenido `<main>` y del `<footer>` utilicen estrictamente `w-[90%] max-w-[1720px] mx-auto`.
  - Rediseñar el footer con enlaces organizados, tipografía negra de alto contraste y cero degradados.

- [ ] **Step 2: Probar el build de Vite**

Run: `npm run build`  
Expected: SUCCESS

- [ ] **Step 3: Commit de Task 2**

```bash
git add src/pages/landing/LandingLayout.jsx
git commit -m "feat(landing): rediseñar header flotante glassmorphism con menu a la izquierda y layout al 90%"
```

---

### Task 3: Rediseño del Hero Section de Alto Contraste con Parallax Layered Mockup (`LandingHome.jsx`)

**Files:**
- Modify: `src/pages/landing/LandingHome.jsx`

- [ ] **Step 1: Implementar bloque Hero inspirado en Brevo y SiteGround**
  - Fondo superior sólido fresco `bg-[#F0FDF4]` con esquinas inferiores redondeadas `rounded-b-[40px] md:rounded-b-[56px]`.
  - Columna izquierda al 90%:
    - Badge píldora sutil `WebFix ERP 2.0 • Facturación SRI 2026`.
    - H1 de alto impacto: `El ERP y Facturación SRI más rápido del Ecuador.`
    - Subtítulo de 2 líneas directo a las bondades: emisión en 1 segundo, POS mostrador, inventario y bancos sin hojas de cálculo.
    - Botón píldora negro sólido `#0F172A` `Probar 14 días gratis` + botón secundario blanco `Ver demostración`.
    - Micro badges con iconos de check verdes: Sin tarjeta, firma .p12 integrada, comprobantes ilimitados.
  - Columna derecha con capas interactivas y efecto parallax con `useParallaxScroll`:
    - Panel principal de dashboard.
    - Tarjeta flotante de factura SRI autorizada (desplazamiento suave hacia arriba).
    - Tarjeta flotante de cobro rápido POS con F12 (desplazamiento sincronizado).
  - Tira de social proof monocromática debajo del bloque con entidades ecuatorianas (SRI, Banco Pichincha, Guayaquil, Visa/Mastercard).

- [ ] **Step 2: Probar el build**

Run: `npm run build`  
Expected: SUCCESS

- [ ] **Step 3: Commit de Task 3**

```bash
git add src/pages/landing/LandingHome.jsx
git commit -m "feat(landing): implementar hero section de alto contraste con maqueta interactiva y parallax"
```

---

### Task 4: Bondades en Tarjetas Planas con Acentos de Color Sólido (Cero cards anidadas, cero dots)

**Files:**
- Modify: `src/pages/landing/LandingHome.jsx`

- [ ] **Step 1: Implementar sección de Bondades en Grid al 90%**
  - Título centrado limpio y sin dots ni burbujas: `Todo lo que tu negocio necesita para operar sin fricción`.
  - Subtítulo nítido en negro pizarra: `Módulos modulares conectados en tiempo real para eliminar tareas manuales.`
  - Grid de 3 columnas de tarjetas individuales planas (sin anidar cards dentro de cards):
    1. **Facturación SRI en 1 Clic**: Acento verde esmeralda sólido (`#16A34A`), descripción concisa, botón `EMITIR AHORA ↗` y mockup de factura autorizada.
    2. **Punto de Venta POS Mostrador**: Acento azul eléctrico (`#2563EB`), cobro rápido con F12, ticket térmico y botón `VER POS ↗`.
    3. **Control Financiero & Bancos**: Acento azul cobalto, conciliación inteligente, CxC/CxP y botón `EXPLORAR FINANZAS ↗`.
    4. **Inventario & Kardex Multibodega**: Control de stock promedio ponderado, botón `VER KARDEX ↗`.
    5. **Captura Inteligente OCR con IA**: Carga de compras en PDF/XML con lectura inmediata de impuestos.
    6. **Seguridad Nube & Firma Digital**: Respaldo continuo en Firebase y certificados .p12 protegidos.
  - Envolver cada tarjeta en `<ScrollReveal delay={index * 80}>` para revelado escalonado suave.

- [ ] **Step 2: Probar el build**

Run: `npm run build`  
Expected: SUCCESS

- [ ] **Step 3: Commit de Task 4**

```bash
git add src/pages/landing/LandingHome.jsx
git commit -m "feat(landing): implementar grid de bondades en cards planas de color solido sin anidaciones"
```

---

### Task 5: Sección de Pestañas Interactivas por Segmento Comercial (Estilo Brevo)

**Files:**
- Modify: `src/pages/landing/LandingHome.jsx`

- [ ] **Step 1: Implementar módulo de Pestañas Segmentadas**
  - Título centrado: `Pensado para todo tipo de negocio: de locales comerciales a grandes empresas`.
  - Selector de pestañas píldora centrado: `[Comercios & Retail]`, `[Servicios & Profesionales]`, `[Empresas & Distribuidoras]`.
  - Pestaña activa en fondo negro sólido `#0F172A` con texto blanco; inactivas en gris perla con texto negro.
  - Distribución Split 50/50:
    - **Lado Izquierdo**: Tag de segmento en color sólido, título fuerte, 4 viñetas con checkmarks sólidos y botón de acción.
    - **Lado Derecho**: Tarjeta limpia de alto contraste con métrica tangible de ahorro de tiempo y testimonio de cliente real.

- [ ] **Step 2: Probar el build**

Run: `npm run build`  
Expected: SUCCESS

- [ ] **Step 3: Commit de Task 5**

```bash
git add src/pages/landing/LandingHome.jsx
git commit -m "feat(landing): agregar seccion de pestanas interactivas por segmento comercial estilo Brevo"
```

---

### Task 6: Precios Transparentes, FAQ Acordeón y CTA Final al 90%

**Files:**
- Modify: `src/pages/landing/LandingHome.jsx`

- [ ] **Step 1: Rediseñar Precios, FAQ y Banner Final**
  - **Precios**: Selector Mensual / Anual (-20%), 3 planes directos (Emprendedor, Negocio Pro, Empresarial) en tarjetas planas al 90% ancho, tipografía monospace para números, botón píldora. Plan pro resaltado con borde sólido en Azul Eléctrico.
  - **FAQ**: Acordeón directo y limpio sin cards anidadas, preguntas en negrita y respuestas claras.
  - **CTA Final**: Banner de ancho amplio al 90% con fondo negro pizarra `#0F172A` o blanco con borde azul, título de alta conversión y botones píldora para registro inmediato y asesor comercial.

- [ ] **Step 2: Probar el build**

Run: `npm run build`  
Expected: SUCCESS

- [ ] **Step 3: Commit de Task 6**

```bash
git add src/pages/landing/LandingHome.jsx
git commit -m "feat(landing): finalizar precios transparentes, acordeon FAQ y banner final de conversion al 90%"
```

---

### Task 7: Verificación Global, Pruebas y Auditoría de Diseño

**Files:**
- Test: `tests/commerce.test.mjs`
- Test: `tests/landing-animation.test.mjs`
- Test: `src/pages/landing/LandingLayout.jsx`
- Test: `src/pages/landing/LandingHome.jsx`

- [ ] **Step 1: Ejecutar suite completa de tests unitarios**

Run: `npm test`  
Expected: PASS (todos los tests aprobados)

- [ ] **Step 2: Ejecutar build de producción de Vite**

Run: `npm run build`  
Expected: SUCCESS (cero errores de compilación)

- [ ] **Step 3: Verificar lista de comprobación de diseño del usuario**
  - [ ] ¿El header es glassmorphism flotante con logo + menú a la izquierda? Sí.
  - [ ] ¿El ancho de página está al 90% (`w-[90%] max-w-[1720px] mx-auto`)? Sí.
  - [ ] ¿Se eliminaron los degradados tipo IA en favor de colores sólidos? Sí.
  - [ ] ¿Se eliminaron los dots/burbujas y cards anidadas dentro de otras cards? Sí.
  - [ ] ¿Están presentes las animaciones parallax y scroll-reveal de entrada/salida? Sí.
  - [ ] ¿Se añadieron las pestañas interactivas de beneficios estilo Brevo? Sí.

- [ ] **Step 4: Actualizar AGENTS.md y commit final**

```bash
git add AGENTS.md
git commit -m "docs: registrar rediseño integral de landing page estilo Brevo y SiteGround en AGENTS.md"
```
