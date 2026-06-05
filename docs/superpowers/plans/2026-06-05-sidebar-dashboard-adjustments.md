# Sidebar & Dashboard Layout Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the sidebar hover and active styles, fix the sidebar height so it touches the footer by correcting the root viewport height, and prevent horizontal overflow on the dashboard.

**Architecture:** 
- Convert the sidebar list item buttons to Tailwind groups, styling active and hover states for both light and dark modes. Unify all module icons to use the primary color scheme when hovered or active.
- Change the root viewport configuration in [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx) from `min-h-screen` to `h-screen overflow-hidden` to avoid viewport extension and body scrollbars.
- Apply container padding and max-width boundaries to the Editor Area in [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx), and adjust the grid layout in [ErpDashboard.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/dashboard/ErpDashboard.jsx) to collapse into a single column on medium screens (`lg` and below) and expand to two columns on extra-large screens (`xl` and above).

**Tech Stack:** React (Vite), Tailwind CSS, Lucide Icons.

---

### Task 1: Viewport and Editor Area Layout Styles
**Files:**
- Modify: [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx)

- [ ] **Step 1: Modify root viewport div**
  Change the wrapper div in the main return statement of [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx) from `flex min-h-screen w-full font-sans overflow-hidden relative ...` to `flex h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 ...`.

- [ ] **Step 2: Add padding and max-width boundaries to the Editor Area**
  Change the Editor Area container in [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx) (around line 1980) from:
  ```jsx
  {/* Editor Area */}
  <div className={`flex-1 overflow-y-auto pb-12 pt-4 scroll-smooth custom-scrollbar`}>
    <div className="mx-auto">
  ```
  to:
  ```jsx
  {/* Editor Area */}
  <div className={`flex-1 overflow-y-auto pb-12 pt-4 scroll-smooth custom-scrollbar px-6 md:px-8`}>
    <div className="max-w-[1600px] w-full mx-auto">
  ```

- [ ] **Step 3: Verify syntax compilation**
  Run: `npm run build`
  Expected: Success with no syntax errors.

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add src/App.jsx
  git commit -m "style: adjust root viewport height and add padding/max-width to page editor wrapper"
  ```

---

### Task 2: Unify Sidebar Button Hover and Active States
**Files:**
- Modify: [App.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/App.jsx)

- [ ] **Step 1: Replace styles of active and inactive sidebar navigation buttons**
  For the main buttons (Mi espacio, Ventas, Compras, Finanzas, Inventarios, Contabilidad, Personas, Proyectos, Ajustes):
  - Add `group` class to the button element.
  - Implement active background: `bg-[#eef2f6] text-gray-900` (light) / `bg-white/10 text-white` (dark).
  - Implement hover background: `hover:bg-[#eef2f6] hover:text-gray-900` (light) / `hover:bg-white/10 hover:text-white` (dark).
  - Implement icon active color: `text-[#0066cc]` (light) / `text-blue-400` (dark).
  - Implement icon hover/inactive color: `text-gray-500 group-hover:text-[#0066cc]` (light) / `text-gray-500 group-hover:text-blue-400` (dark).

  *Code Example (Ventas button):*
  ```jsx
  <button 
    onClick={() => { setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
    className={`group flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
      activePageId === 'ventas'
        ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-[#eef2f6] text-gray-900')
        : (isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-700 hover:bg-[#eef2f6] hover:text-gray-900')
    }`}
  >
    <ShoppingCart 
      size={18} 
      className={`transition-colors ${
        activePageId === 'ventas' 
          ? (isDarkMode ? 'text-blue-400' : 'text-[#0066cc]') 
          : (isDarkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-500 group-hover:text-[#0066cc]')
      }`} 
    />
    {isSidebarOpen && <span>Ventas</span>}
  </button>
  ```

- [ ] **Step 2: Apply styles to all other 8 buttons**
  Apply the exact class scheme to:
  - Mi espacio (icon: `LayoutDashboard`)
  - Compras (icon: `ShoppingBag`)
  - Finanzas (icon: `CreditCard`)
  - Inventarios (icon: `Package`)
  - Contabilidad (icon: `DollarSign`)
  - Personas (icon: `Users`, active condition: `activePageId === 'personas' || activePageId === 'team'`)
  - Proyectos (icon: `Briefcase`, active condition: `isProyectosActive`)
  - Ajustes (icon: `Settings`, active condition: `activePageId === 'general_settings'`)

- [ ] **Step 3: Verify syntax compilation**
  Run: `npm run build`
  Expected: Success with no syntax errors.

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add src/App.jsx
  git commit -m "style: unify sidebar active/hover styles and icon colors"
  ```

---

### Task 3: Adjust Dashboard Layout to Avoid Grid Overflow
**Files:**
- Modify: [ErpDashboard.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/dashboard/ErpDashboard.jsx)

- [ ] **Step 1: Modify double panel grid layout col-span breakpoints**
  In [ErpDashboard.jsx](file:///e:/CLOUD%20WEBFIX/WEBFIX/SISTEMAS/PROYECTOS%20WEBFIX/proyectos-webfix/src/components/dashboard/ErpDashboard.jsx), change the main layout container of the double panel from:
  ```jsx
  {/* DOBLE PANEL: PROYECTOS / SRI */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    
    {/* PANEL IZQUIERDO: PROYECTOS Y TAREAS (Col Span 7) */}
    <div className={`${currentGlassPanel} lg:col-span-7 p-6 rounded-2xl`}>
  ```
  and
  ```jsx
    {/* PANEL DERECHO: FACTURACIÓN Y TRIBUTACIÓN SRI (Col Span 5) */}
    <div className={`${currentGlassPanel} lg:col-span-5 p-6 rounded-2xl flex flex-col justify-between`}>
  ```
  to:
  ```jsx
  {/* DOBLE PANEL: PROYECTOS / SRI */}
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
    
    {/* PANEL IZQUIERDO: PROYECTOS Y TAREAS (Col Span 7) */}
    <div className={`${currentGlassPanel} xl:col-span-7 p-6 rounded-2xl`}>
  ```
  and
  ```jsx
    {/* PANEL DERECHO: FACTURACIÓN Y TRIBUTACIÓN SRI (Col Span 5) */}
    <div className={`${currentGlassPanel} xl:col-span-5 p-6 rounded-2xl flex flex-col justify-between`}>
  ```

- [ ] **Step 2: Verify syntax compilation**
  Run: `npm run build`
  Expected: Success with no syntax errors.

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add src/components/dashboard/ErpDashboard.jsx
  git commit -m "style: improve dashboard grid responsiveness collapsing on lg screens to avoid overflow"
  ```
