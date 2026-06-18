# Rediseño de Super Admin con Sidebar y Detalle de Inquilinos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la interfaz de Super Administrador para utilizar un menú lateral (sidebar) colapsable e interactivo (idéntico al del ERP) con un cajón lateral (Drawer) que cargue dinámicamente el listado de usuarios de cada cliente, sus transacciones e inventario.

**Architecture:** Cambiar la estructura de `SuperAdminPage.jsx` de pestañas horizontales superiores a un diseño de dos columnas: una barra de navegación lateral colapsable y un panel de contenido dinámico. Al hacer clic en un tenant (empresa), se lee bajo demanda de Firestore su documento de usuarios y contadores de colecciones para mostrarlos en un panel Drawer interactivo deslizable.

**Tech Stack:** React, Tailwind CSS, Lucide Icons, Firestore SDK.

---

### Task 1: Reestructuración de Layout e Integración de Sidebar Colapsable

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Declarar el estado de colapso de la barra lateral**
  Agregar al inicio del componente `SuperAdminPage` el estado:
  ```javascript
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  ```

- [ ] **Step 2: Reestructurar el JSX de retorno para usar Grid de Sidebar y Contenido**
  Cambiar el contenedor principal para que use una estructura flex con la barra lateral izquierda y la columna de contenido a la derecha. El sidebar contendrá el Logo de WebFix ERP, los accesos del administrador (Dashboard, Empresas, Aprobaciones, Planes) y controles de configuración en el pie de página (Modo Oscuro, Volver al ERP, Cerrar Sesión).

- [ ] **Step 3: Agregar soporte responsivo para móviles en el Sidebar**
  Agregar el disparador de botón hamburguesa en la cabecera superior y el panel overlay translúcido para móviles.

- [ ] **Step 4: Compilar localmente para asegurar que no hay errores de sintaxis**
  Run: `npm run build`
  Expected: El build compila con éxito.

- [ ] **Step 5: Commit del layout de la barra lateral**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "style: agregar estructura de sidebar colapsable en superadmin"
  ```

---

### Task 2: Componentes del Sidebar y Enlaces de Navegación

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Diseñar los enlaces con estados activos en el Sidebar**
  Crear los botones del sidebar correspondientes a las secciones:
  * Dashboard (`LayoutDashboard`): Para ver métricas SaaS agregadas.
  * Empresas (`Building`): Para listar y editar clientes.
  * Aprobaciones (`CreditCard`): Para transferencias pendientes con burbuja roja indicadora de notificaciones.
  * Planes (`Sliders`): Para personalizar Starter, Profesional y Enterprise.

  Usar clases Tailwind de alto contraste alineadas con el tema:
  ```javascript
  const activeClass = "flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold rounded-lg bg-[#1C40F2] text-white shadow-sm transition-all";
  const inactiveClass = "flex items-center gap-3 w-full px-3 py-2.5 text-xs font-semibold rounded-lg hover:bg-slate-500/10 text-gray-500 dark:text-gray-400 transition-all";
  ```

- [ ] **Step 2: Integrar el Switcher de Modo Oscuro al pie del Sidebar**
  Colocar el botón para alternar el estado de dark mode en la sección inferior de la barra de navegación lateral.

- [ ] **Step 3: Commit de los componentes de navegación**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: implementar enlaces interactivos del sidebar y switcher de tema"
  ```

---

### Task 3: Obtención de Datos de Inquilinos, Cuentas de Usuarios y Recursos

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Implementar función asíncrona para cargar usuarios y consumos de un Tenant**
  Definir la función `handleSelectTenant` para obtener bajo demanda de Firestore los usuarios y consumos de transacciones y productos:
  ```javascript
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [tenantStats, setTenantStats] = useState({ transactionsCount: 0, productsCount: 0 });
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);

  const handleSelectTenant = async (tenant) => {
    setSelectedTenantDetails(tenant);
    setLoadingTenantDetails(true);
    setTenantUsers([]);
    setTenantStats({ transactionsCount: 0, productsCount: 0 });
    
    try {
      // 1. Obtener lista de usuarios
      const metaDocRef = doc(db, 'artifacts', tenant.id, 'public', 'data', 'meta', 'info');
      const metaSnap = await getDoc(metaDocRef);
      if (metaSnap.exists()) {
        setTenantUsers(metaSnap.data().users || []);
      }
      
      // 2. Obtener conteo de transacciones financieras
      const txColRef = collection(db, 'artifacts', tenant.id, 'public', 'data', 'finances_transactions');
      const txSnap = await getDocs(txColRef);
      
      // 3. Obtener conteo de productos
      const prodColRef = collection(db, 'artifacts', tenant.id, 'public', 'data', 'inventory_products');
      const prodSnap = await getDocs(prodColRef);
      
      setTenantStats({
        transactionsCount: txSnap.size,
        productsCount: prodSnap.size
      });
    } catch (error) {
      console.error("Error cargando detalles del inquilino:", error);
      showToast("Error al cargar detalles de uso del cliente", "error");
    } finally {
      setLoadingTenantDetails(false);
    }
  };
  ```

- [ ] **Step 2: Commit del cargador de datos dinámicos**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: implementar consulta dinámica de usuarios y métricas de consumo de inquilinos"
  ```

---

### Task 4: Implementación del Cajón Lateral de Detalle del Cliente (Drawer)

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Diseñar la estructura del Drawer**
  Crear un cajón interactivo que se deslice desde la derecha cuando `selectedTenantDetails` no sea nulo.
  * Encabezado: Nombre de empresa, ID, botón para cerrar Drawer.
  * Límites y Consumos: Barras de progreso de usuarios (Usuarios actuales vs Límite del plan) y productos (Productos actuales vs Límite del plan), y el total de transacciones.
  * Lista de Usuarios ("Cuentas del Cliente"): Tabla con columnas Nombre, Correo y Rol.

- [ ] **Step 2: Agregar Formulario de Configuración de Suscripción**
  Incluir campos para cambiar:
  * El plan asociado (`starter` | `professional` | `enterprise`).
  * El estado de la suscripción (`active` | `trial` | `suspended`).
  * La fecha de expiración (`expiresAt`).

- [ ] **Step 3: Guardar cambios de suscripción desde el Drawer**
  Utilizar la función de actualización en Firebase:
  ```javascript
  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'tenants', selectedTenantDetails.id), {
        planId: selectedTenantDetails.planId,
        planStatus: selectedTenantDetails.planStatus,
        expiresAt: new Date(selectedTenantDetails.expiresAt).toISOString()
      });
      showToast("Suscripción de inquilino actualizada correctamente", "success");
      setSelectedTenantDetails(null);
    } catch (err) {
      showToast("Error al actualizar la suscripción", "error");
    }
  };
  ```

- [ ] **Step 4: Commit del Drawer de Inquilinos**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: cajón lateral de detalles del inquilino con cuentas de usuarios y gestión de plan"
  ```

---

### Task 5: Dashboard de Resumen del Sistema y Métricas Generales

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Crear la Sección Dashboard del Administrador**
  Cuando `activeTab === 'dashboard'`, mostrar una grilla interactiva que despliegue las siguientes estadísticas globales consolidadas:
  * Gráfico plano/tablas de distribución de planes de clientes.
  * Listado rápido de las últimas 5 empresas registradas y su estado.
  * Listado rápido de transferencias pendientes que requieran atención.

- [ ] **Step 2: Commit del Dashboard de Superadmin**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: panel principal de dashboard general para el Super Admin"
  ```

---

### Task 6: Pruebas de Compilación y Verificación de Estilo

**Files:**
- Verify compilation of all modified components.

- [ ] **Step 1: Ejecutar build de producción**
  Run: `npm run build`
  Expected: Compilación exitosa sin lints ni advertencias críticas.

- [ ] **Step 2: Commit final de optimización y limpieza**
  ```bash
  git add .
  git commit -m "chore: verificación de compilación y limpieza de imports en SuperAdminPage"
  ```
