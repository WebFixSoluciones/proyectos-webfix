# Mejora General de Visibilidad de Iconos Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un nuevo diseño dinámico para todos los botones de iconos (`.btn-icon`) del sistema con un fondo de opacidad ligera del 12%, color de icono de alto contraste, y 10px de radio de borde.

**Architecture:** Modificación de estilos globales en `src/index.css` agregando la nueva definición de la clase `.btn-icon` y mapeando inteligentemente las clases de Tailwind (`bg-primary`, `bg-red-600`, etc.) a variantes de opacidad sutil mediante `color-mix()` de CSS nativo.

**Tech Stack:** CSS vanilla / CSS variables (con soporte para `color-mix` en Tailwind v4).

---

### Task 1: Modificación de Estilos Globales en index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Localizar y reemplazar la regla .btn-icon en index.css**

Modificar [src/index.css](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS WEBFIX/proyectos-webfix/src/index.css#L694-L715) reemplazando la regla `.btn-icon` y agregando los mapeos inteligentes de color.

**Code to write:**
```css
/* BOTÓN ICONO CON ESTILOS GENERALES Y DINÁMICOS */
.btn-icon {
  width: 32px !important;
  height: 32px !important;
  border-radius: 10px !important; /* 10px border radius solicitado */
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
  border: none;
  cursor: pointer !important;
  padding: 0 !important;
  transition: all 150ms ease !important;
  
  /* Valores base por defecto usando variables dinámicas del sistema */
  --btn-base-color: var(--color-primary);
  background-color: var(--color-primary-light) !important;
  color: var(--color-primary) !important;
}

.btn-icon:hover {
  background-color: color-mix(in srgb, var(--btn-base-color) 20%, transparent) !important;
}

/* MAPEO INTELIGENTE DE COLORES DE TAILWIND */
/* Mantiene la coherencia visual con los nombres de clase actuales */

/* Si tiene bg-primary */
.btn-icon.bg-primary {
  --btn-base-color: var(--color-primary);
  background-color: var(--color-primary-light) !important;
  color: var(--color-primary) !important;
}

/* Si tiene bg-red-600 o bg-red-500 (para PDF o Eliminar) */
.btn-icon.bg-red-600,
.btn-icon.bg-red-500,
.btn-icon.text-red-500 {
  --btn-base-color: #ef4444;
  background-color: color-mix(in srgb, #ef4444 12%, transparent) !important;
  color: #ef4444 !important;
}
.btn-icon.bg-red-600:hover,
.btn-icon.bg-red-500:hover {
  background-color: color-mix(in srgb, #ef4444 20%, transparent) !important;
}

/* Si tiene bg-amber-600 o bg-amber-500 (para RIDE) */
.btn-icon.bg-amber-600,
.btn-icon.bg-amber-500 {
  --btn-base-color: #d97706;
  background-color: color-mix(in srgb, #d97706 12%, transparent) !important;
  color: #d97706 !important;
}
.btn-icon.bg-amber-600:hover,
.btn-icon.bg-amber-500:hover {
  background-color: color-mix(in srgb, #d97706 20%, transparent) !important;
}

/* Si tiene bg-blue-600 o bg-blue-505 (para Reenviar Correo) */
.btn-icon.bg-blue-600,
.btn-icon.bg-blue-505,
.btn-icon.bg-blue-500 {
  --btn-base-color: #2563eb;
  background-color: color-mix(in srgb, #2563eb 12%, transparent) !important;
  color: #2563eb !important;
}
.btn-icon.bg-blue-600:hover,
.btn-icon.bg-blue-505:hover,
.btn-icon.bg-blue-500:hover {
  background-color: color-mix(in srgb, #2563eb 20%, transparent) !important;
}

/* Si el archivo está deshabilitado / gris (ej. XML no disponible) */
.btn-icon.bg-gray-200 {
  background-color: rgba(148, 163, 184, 0.12) !important;
  color: #94a3b8 !important;
  opacity: 0.6;
  cursor: not-allowed !important;
}

/* Preservar botones de tipo cerrar (X) o navegación que no llevan fondo */
.btn-icon.text-gray-400,
.btn-icon.text-gray-500,
.btn-icon.text-gray-450 {
  background-color: transparent !important;
  color: inherit !important;
  opacity: 0.7;
}
.btn-icon.text-gray-400:hover,
.btn-icon.text-gray-500:hover,
.btn-icon.text-gray-450:hover {
  background-color: rgba(0, 0, 0, 0.05) !important;
  opacity: 1;
}
```

- [ ] **Step 2: Ejecutar el build de Vite para verificar que compile correctamente sin errores de sintaxis**

Run: `npm run build`
Expected: Compilación exitosa (`vite build` finaliza correctamente sin errores).

- [ ] **Step 3: Guardar y comprometer cambios**

Run:
```bash
git add src/index.css
git commit -m "style: implement system-wide professional dynamic icon buttons with 10px radius"
```
Expected: Commit realizado exitosamente.
