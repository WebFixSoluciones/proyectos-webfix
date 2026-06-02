
name: flat-modern-design
description: |
  Sistema de diseño Flat Modern para crear componentes, artefactos y objetos UI con máxima calidad visual. Activa este skill SIEMPRE que el usuario pida crear, diseñar, rediseñar, mejorar o estilizar cualquier componente, pantalla, artefacto, objeto UI, dashboard, formulario, tarjeta, botón, tabla, modal, o cualquier elemento visual — incluso si la petición parece simple. Aplica principios de Flat Modern Design en modo light: alto contraste, espacios compactos, minimalismo funcional, tipografía nítida e inspiración en Stripe, Envato, Dropbox, Apple y sistemas administrativos de última generación. Garantiza diseño responsive mobile-first, protección de componentes existentes ante cambios, y optimización de tokens en cada implementación.


# Flat Modern Design System

## Filosofía de diseño

Inspiración canónica: **Stripe · Dropbox · Envato · Apple · Linear · Notion**

Principios irrenunciables:
- **Flat pero con profundidad sutil** — sombras suaves (no brutalismo plano), bordes precisos
- **Alto contraste siempre** — texto sobre fondo siempre pasa WCAG AA (ratio mínimo 4.5:1)
- **Compacto y denso de información** — sin espacio desperdiciado, sin padding excesivo
- **Minimalismo funcional** — cada elemento tiene razón de existir, nada decorativo vacío
- **Light mode como estándar** — blancos puros, grises fríos, acentos vibrantes


## Protocolo de ejecución (sin preguntas)

### FASE 0 — Protección de componentes existentes

**ANTES de escribir cualquier línea de código:**


CHECKLIST DE PROTECCIÓN:
□ Identificar todos los componentes existentes en el contexto
□ Mapear qué CSS variables / tokens están en uso
□ Listar clases compartidas que NO deben modificarse
□ Identificar el scope exacto del cambio
□ Usar CSS scoping o nombres únicos para el nuevo componente
□ Nunca modificar estilos globales sin declararlo explícitamente


**Regla de aislamiento:**
- Cada nuevo componente tiene su propio scope de clases (prefijo único o CSS modules)
- Nunca usar `*`, `body`, `html` con estilos que puedan afectar componentes existentes
- Cambios en variables CSS globales → declarar impacto explícitamente
- Si se rediseña un componente existente → preservar su API (props/clases públicas)


### FASE 1 — Tokens de diseño (aplicar siempre)

Cargar el design token system desde `references/tokens.md` para aplicar valores exactos.

Resumen de tokens clave:

```css
/* COLORES BASE */
--color-bg: #FFFFFF;
--color-bg-subtle: #F8F9FA;
--color-bg-muted: #F1F3F5;
--color-border: #E5E7EB;
--color-border-strong: #D1D5DB;

/* TEXTO — alto contraste garantizado */
--color-text-primary: #0F172A;    /* ratio 18.1:1 sobre blanco */
--color-text-secondary: #475569;  /* ratio 5.9:1 sobre blanco */
--color-text-tertiary: #94A3B8;   /* ratio 3.0:1 — solo decorativo */
--color-text-inverse: #FFFFFF;

/* ACENTOS */
--color-accent: #2563EB;          /* Azul Stripe-like */
--color-accent-hover: #1D4ED8;
--color-accent-light: #EFF6FF;
--color-success: #059669;
--color-warning: #D97706;
--color-danger: #DC2626;

/* TIPOGRAFÍA */
--font-sans: 'Inter var', 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* ESCALA TIPOGRÁFICA */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* ESPACIADO — sistema 4pt */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */

/* BORDES */
--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.5rem;   /* 8px */
--radius-lg: 0.75rem;  /* 12px */
--radius-xl: 1rem;     /* 16px */
--radius-full: 9999px;

/* SOMBRAS */
--shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);

/* TRANSICIONES */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;

### FASE 2 — Responsive mobile-first

**Breakpoints estándar:**

```css
/* Mobile first — diseñar desde 375px */
/* sm  */ @media (min-width: 640px)  { }
/* md  */ @media (min-width: 768px)  { }
/* lg  */ @media (min-width: 1024px) { }
/* xl  */ @media (min-width: 1280px) { }


**Reglas de responsive para cada componente:**
1. Diseñar base en 375px — si funciona aquí, funciona en todo
2. Toques táctiles mínimo 44x44px (botones, links, controles)
3. Tipografía fluida — nunca menor a 14px en mobile
4. Tablas → convertir a cards en mobile
5. Grids → colapsar a 1 columna en mobile
6. Modales → full-screen en mobile
7. Padding horizontal mínimo en mobile: 16px (space-4)
8. Evitar hovers como única interacción — mobile no tiene hover

**Test mental de responsive antes de entregar:**

□ 375px (iPhone SE) — funciona?
□ 390px (iPhone 14) — funciona?
□ 768px (iPad) — funciona?
□ 1280px (Desktop) — funciona?
□ Touch targets ≥ 44px?
□ No overflow horizontal?
□ Texto legible sin zoom?


### FASE 3 — Patrones de componentes

Ver `references/components.md` para implementaciones completas de:
- Buttons (primary, secondary, ghost, danger, icon)
- Inputs, selects, checkboxes, radios, toggles
- Cards (simple, con acción, con media, estadísticas)
- Tables (básica, con filtros, con acciones)
- Modals y Drawers
- Navigation (sidebar, topbar, tabs)
- Badges, Tags, Pills
- Alerts y Toasts
- Forms completos
- Avatars y Listas

### FASE 4 — Reglas de espaciado compacto

El espaciado COMPACTO de Stripe/Linear sigue esta lógica:

| Elemento | Padding interno | Referencia |
|---|---|---|
| Button pequeño | 6px 12px | space-1.5 space-3 |
| Button base | 8px 16px | space-2 space-4 |
| Button grande | 10px 20px | space-2.5 space-5 |
| Input | 8px 12px | space-2 space-3 |
| Card | 16px | space-4 |
| Card amplia | 24px | space-6 |
| Modal | 24px | space-6 |
| Section padding | 32px | space-8 |

**Anti-patrones prohibidos:**
- ❌ Padding > 48px en componentes (solo layouts)
- ❌ Margin-bottom > 32px entre elementos relacionados
- ❌ Line-height > 1.6 para texto de UI
- ❌ Font-size < 12px en cualquier texto visible
- ❌ Espacios en blanco decorativos sin función



### FASE 5 — Anti-patrones visuales prohibidos


❌ Gradientes llamativos o arcoíris
❌ Sombras agresivas (box-shadow > 20px blur)
❌ Bordes > 2px en componentes normales
❌ Más de 3 colores primarios en un componente
❌ Texto en color terciario (#94A3B8) para información importante
❌ Iconos > 24px en UI compacta (usar 16px o 20px)
❌ Animaciones > 400ms (se siente lento)
❌ Fondos de imagen en componentes de datos
❌ Centrar texto en formularios o tablas
❌ Usar px absolutos sin sistema (usar tokens)




## Modo de respuesta (optimizado para tokens)

Responder en este orden, sin introducción verbal:

[SCOPE_DEL_CAMBIO]
Componentes tocados: {lista exacta}
Componentes protegidos: {lista de los que NO se tocan}
Nuevas clases/variables: {lista — confirma que no colisionan}

[IMPLEMENTACIÓN]
{Código completo, limpio, con tokens aplicados}

[RESPONSIVE_CHECK]
✓ 375px: {qué cambia}
✓ 768px: {qué cambia}
✓ 1280px: {base design}

[NOTAS_DE_INTEGRACIÓN]
{Solo si hay algo crítico — máximo 3 bullets}


## Reglas de oro (no negociables)

1. **Protección primero** — identificar scope antes de escribir código
2. **Tokens siempre** — ningún valor hardcodeado de color, espacio o tipografía
3. **Mobile-first real** — diseñar en 375px y escalar, no al revés
4. **Alto contraste siempre** — verificar ratio antes de usar cualquier color de texto
5. **Compacto por defecto** — si cabe en menos espacio manteniendo legibilidad, compactar
6. **Inspiración canon** — ante duda: ¿cómo lo haría Stripe?
7. **Un componente, un scope** — aislamiento total, sin side effects
8. **0 preguntas de planificación** — inferir y ejecutar con el contexto disponible


## Referencias

- `references/tokens.md` — Sistema de tokens completo con dark mode y extended palette
- `references/components.md` — Biblioteca de componentes con código listo para usar