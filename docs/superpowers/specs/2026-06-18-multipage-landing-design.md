# Especificación de Diseño: Landing Page Multimódulo (SaaS Multipage Website)

**Fecha**: 2026-06-18  
**Autor**: Antigravity  
**Tema**: Reestructuración del sitio web de presentación del ERP WebFix a un esquema multipágina para mejorar la legibilidad, indexación y la experiencia de usuario corporativa.

---

## 1. Estructura de Rutas y Navegación

El sitio web de presentación se dividirá en 5 rutas independientes controladas por `HashRouter` en `src/App.jsx`. Para evitar la duplicación de código, todas estas rutas estarán envueltas en un componente de diseño unificado llamado `LandingLayout`:

* **Rutas Públicas**:
  * `/` -> `LandingHome.jsx` (Inicio y propuesta de valor general).
  * `/soluciones` -> `LandingFeatures.jsx` (Módulos interactivos: POS, Facturación SRI, Inventarios, Gastos).
  * `/precios` -> `LandingPricing.jsx` (Planes Starter, Profesional y Enterprise, tabla comparativa de límites, FAQs).
  * `/nosotros` -> `LandingAbout.jsx` (Información institucional, seguridad de servidores y enfoque local en Ecuador).
  * `/contacto` -> `LandingContact.jsx` (Formulario de contacto con validación y datos de asesores).

---

## 2. Arquitectura de Archivos y Responsabilidad Única

Crearemos un nuevo directorio `src/pages/landing/` con la siguiente estructura de componentes modulares:

```
src/pages/landing/
├── LandingLayout.jsx   # Layout compartido (Navbar + Footer unificados)
├── LandingHome.jsx     # Sección Hero, beneficios de negocio y accesos rápidos
├── LandingFeatures.jsx # Tabulación y simulación CSS de los 4 módulos ERP
├── LandingPricing.jsx  # Grilla de precios, comparativa y FAQs colapsables
├── LandingAbout.jsx    # Misión de la empresa, respaldo tecnológico y contacto
└── LandingContact.jsx  # Formulario interactivo de contacto y canales de soporte
```

---

## 3. Comportamiento de Diseño (Estricto Light Mode / Flat-Modern)

* **Tema Fijo**: El sitio web de presentación solo admitirá la paleta de modo claro (`#F2F4FF`, fondo `#ffffff`, bordes `#CAD1F4`, botones principales `#1C40F2`, textos negros de alto contraste). No se mostrará ningún selector de modo oscuro.
* **Scroll Independiente**: Cada página de presentación heredará la clase `h-screen overflow-y-auto w-screen scroll-smooth custom-scrollbar light-scrollbar` en su contenedor raíz, asegurando que la barra de navegación se mantenga fija en la parte superior y el scroll funcione de forma correcta en dispositivos móviles y de escritorio.
* **Componentes de Simulación CSS**: Las simulaciones interactivas del POS, Factura Autorizada SRI, Stock de Inventario y Distribución de Gastos se trasladarán a `LandingFeatures.jsx`.

---

## 4. Control de Navegación y Flujo de Usuarios

* **Redirecciones Seguras**:
  * Al hacer clic en "Registrarse" o "Comenzar Prueba Gratis", se redirigirá al usuario a `/register?plan={planId}&period={billingPeriod}`.
  * Al hacer clic en "Entrar", se redirigirá a `/login`.
* **Navegación del Menú (Active State)**: El Navbar detectará la ruta actual del navegador para resaltar con estilo de color primario `#1C40F2` el enlace de la página activa.
