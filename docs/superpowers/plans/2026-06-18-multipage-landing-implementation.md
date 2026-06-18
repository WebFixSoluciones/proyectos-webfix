# Sitio Web Multiclases (Landing Multipage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la presentación one-page actual en un sitio multipágina (Home, Soluciones, Precios, Nosotros, Contacto) con layout compartido, navegación responsiva y tema claro unificado.

**Architecture:**
* Crear el directorio `src/pages/landing/`.
* Crear `LandingLayout.jsx` con el Navbar y Footer compartidos.
* Crear las 5 páginas (`LandingHome.jsx`, `LandingFeatures.jsx`, `LandingPricing.jsx`, `LandingAbout.jsx`, `LandingContact.jsx`).
* Configurar las rutas en `src/App.jsx` envolviendo las sub-rutas en `LandingLayout`.

**Tech Stack:** React, react-router-dom, Lucide Icons, Tailwind CSS.

---

### Task 1: Crear el Layout Compartido (LandingLayout)

**Files:**
- Create: `src/pages/landing/LandingLayout.jsx`

- [ ] **Step 1: Implementar `LandingLayout.jsx`**
  Escribir el código para el layout. Contiene la cabecera (Navbar) y el pie de página (Footer) en versión clara fija, importando `<Outlet />` de `react-router-dom` para renderizar el contenido dinámico. El Navbar debe detectar la ruta activa mediante `useLocation()` para aplicar estilos de enfoque.

- [ ] **Step 2: Commit del Layout**
  ```bash
  git add src/pages/landing/LandingLayout.jsx
  git commit -m "feat: crear componente LandingLayout para navegación compartida"
  ```

---

### Task 2: Crear Página de Inicio (LandingHome)

**Files:**
- Create: `src/pages/landing/LandingHome.jsx`

- [ ] **Step 1: Implementar `LandingHome.jsx`**
  Escribir la página principal. Debe contener la sección Hero con la propuesta de valor del ERP en Ecuador, el acceso a registro/login, y la simulación virtual CSS del Dashboard general. Todo en fondo claro `#F2F4FF`.

- [ ] **Step 2: Commit del Home**
  ```bash
  git add src/pages/landing/LandingHome.jsx
  git commit -m "feat: crear página de inicio LandingHome con Hero y Dashboard simulado"
  ```

---

### Task 3: Crear Página de Funciones y Módulos (LandingFeatures)

**Files:**
- Create: `src/pages/landing/LandingFeatures.jsx`

- [ ] **Step 1: Implementar `LandingFeatures.jsx`**
  Escribir la página de características. Debe alojar la interfaz de pestañas interactivas (activeTab: pos, facturación, inventario, gastos) con sus respectivas descripciones y simulaciones visuales interactivas en CSS nativo (ticket de venta, facturas autorizadas del SRI, barras de stock de productos y distribución de gastos).

- [ ] **Step 2: Commit de Características**
  ```bash
  git add src/pages/landing/LandingFeatures.jsx
  git commit -m "feat: crear página de soluciones LandingFeatures con simuladores CSS interactivos"
  ```

---

### Task 4: Crear Página de Planes y Preguntas Frecuentes (LandingPricing)

**Files:**
- Create: `src/pages/landing/LandingPricing.jsx`

- [ ] **Step 1: Implementar `LandingPricing.jsx`**
  Escribir la página de precios. Incluye el selector mensual/anual, la grilla comparativa de tarifas (Starter, Profesional, Enterprise) con redirecciones adecuadas a `/register`, y el acordeón interactivo de Preguntas Frecuentes (FAQs).

- [ ] **Step 2: Commit de Precios**
  ```bash
  git add src/pages/landing/LandingPricing.jsx
  git commit -m "feat: crear página de planes y precios LandingPricing con FAQs colapsables"
  ```

---

### Task 5: Crear Páginas de Nosotros (LandingAbout) y Contacto (LandingContact)

**Files:**
- Create: `src/pages/landing/LandingAbout.jsx`
- Create: `src/pages/landing/LandingContact.jsx`

- [ ] **Step 1: Implementar `LandingAbout.jsx`**
  Página de información corporativa, seguridad de servidores, base de datos en tiempo real y soporte local.

- [ ] **Step 2: Implementar `LandingContact.jsx`**
  Página con formulario de contacto (Nombre, Email, Teléfono, Mensaje), validación simple de campos y un simulador de envío de mensaje mediante Toasts.

- [ ] **Step 3: Commit de Nosotros y Contacto**
  ```bash
  git add src/pages/landing/LandingAbout.jsx src/pages/landing/LandingContact.jsx
  git commit -m "feat: crear páginas de nosotros y contacto con formulario interactivo"
  ```

---

### Task 6: Integrar Rutas en App.jsx y Eliminar Archivo Landing Antiguo

**Files:**
- Modify: `src/App.jsx`
- Delete: `src/pages/LandingPage.jsx`

- [ ] **Step 1: Configurar las sub-rutas en `src/App.jsx`**
  Importar los nuevos componentes. Reemplazar la ruta `/` por un grupo de rutas envueltas en `LandingLayout`:
  ```javascript
  import LandingLayout from './pages/landing/LandingLayout';
  import LandingHome from './pages/landing/LandingHome';
  import LandingFeatures from './pages/landing/LandingFeatures';
  import LandingPricing from './pages/landing/LandingPricing';
  import LandingAbout from './pages/landing/LandingAbout';
  import LandingContact from './pages/landing/LandingContact';
  ```
  Actualizar las rutas en el enrutador:
  ```javascript
  <Route element={<LandingLayout />}>
    <Route path="/" element={<LandingHome />} />
    <Route path="/soluciones" element={<LandingFeatures />} />
    <Route path="/precios" element={<LandingPricing />} />
    <Route path="/nosotros" element={<LandingAbout />} />
    <Route path="/contacto" element={<LandingContact />} />
  </Route>
  ```

- [ ] **Step 2: Eliminar el archivo antiguo `LandingPage.jsx`**
  Eliminar físicamente el archivo obsoleto.

- [ ] **Step 3: Ejecutar build de prueba**
  Run: `npm run build`
  Expected: La compilación termina exitosamente.

- [ ] **Step 4: Commit de la integración de rutas**
  ```bash
  git rm src/pages/LandingPage.jsx
  git add src/App.jsx
  git commit -m "feat: integrar enrutamiento multipágina y remover LandingPage antiguo"
  ```
