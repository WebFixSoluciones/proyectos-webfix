# Gestión Inline de Inquilinos y Creación Manual de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modificar el administrador master para que la edición de empresas sea inline (reemplazando la tabla por una pantalla completa de detalle/edición, sin modales ni drawers) y agregar un formulario de creación manual de tenants (empresas) que cree el inquilino, configure su ERP, inicialice el usuario y envíe un correo de recuperación de contraseña para mayor seguridad.

**Architecture:**
1. Crear el estado `viewMode` ('list' | 'edit' | 'create') en `SuperAdminPage.jsx` para controlar la pantalla principal del módulo de Empresas.
2. Diseñar la pantalla `'edit'` inline con el detalle de consumos, la tabla de usuarios de la empresa ("cuentas de cada cliente") y el formulario de suscripción.
3. Diseñar la pantalla `'create'` inline para agregar manualmente una empresa.
4. Integrar una inicialización de Firebase App temporal (`initializeApp(firebaseConfig, "TempApp")`) para dar de alta al usuario administrador en Auth de forma segura en cliente, y luego gatillar `sendPasswordResetEmail` para enviar el enlace de recuperación.

**Tech Stack:** React, Firebase Auth/Firestore, Lucide Icons.

---

### Task 1: Cambiar Flujo a Edición/Detalle Inline (Sin Drawer ni Popups)

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Crear e inicializar el estado `viewMode`**
  Declarar el estado:
  ```javascript
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'edit' | 'create'
  ```

- [ ] **Step 2: Modificar `handleSelectTenant` para cambiar a vista 'edit'**
  Actualizar `handleSelectTenant` para que al finalizar la carga ponga `setViewMode('edit')` en lugar de abrir un drawer.

- [ ] **Step 3: Diseñar el panel de Edición Inline**
  Cuando `activeTab === 'tenants' && viewMode === 'edit'`, renderizar el contenido completo del detalle inline. Esto incluirá un botón superior "← Volver al Listado de Empresas" que regrese el estado a `viewMode = 'list'`.

- [ ] **Step 4: Commit del flujo inline**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: implementar flujo inline para visualización y edición de inquilinos"
  ```

---

### Task 2: Formulario de Creación Manual de Tenants

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Agregar el botón de "Agregar Empresa"**
  En la cabecera de la sección de empresas, colocar un botón para cambiar a `viewMode = 'create'`.

- [ ] **Step 2: Diseñar el formulario de creación inline**
  Campos a ingresar:
  * Razón Social / Nombre de Empresa
  * Inquilino ID / RUC (ej: `org_12345`)
  * Correo Electrónico del Administrador
  * Plan inicial (`starter` | `professional` | `enterprise`)
  * Estado inicial (`trial` | `active` | `suspended`)
  * Período de facturación (`monthly` | `yearly`)
  * Contraseña inicial (con opción de autogenerar y enviar correo de recuperación)
  * Enviar link de recuperación inmediatamente por correo (Checkbox)

- [ ] **Step 3: Commit del formulario de creación**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: diseñar formulario de creación manual de empresas"
  ```

---

### Task 3: Integración de Creación de Usuarios de Auth con App Temporal

**Files:**
- Modify: `src/pages/SuperAdminPage.jsx`

- [ ] **Step 1: Importar dependencias de Firebase App y Auth**
  Importar `initializeApp` de `firebase/app`, `getAuth` y `createUserWithEmailAndPassword` / `sendPasswordResetEmail` de `firebase/auth`, y `firebaseConfig` de `../firebase`.

- [ ] **Step 2: Implementar la función de Guardar Nueva Empresa (`handleCreateTenant`)**
  Escribir la función asíncrona para:
  1. Validar campos.
  2. Inicializar la app temporal de Firebase:
     ```javascript
     const tempApp = initializeApp(firebaseConfig, "TempApp");
     const tempAuth = getAuth(tempApp);
     ```
  3. Crear el usuario en Auth con contraseña temporal:
     ```javascript
     const userCred = await createUserWithEmailAndPassword(tempAuth, email, tempPassword);
     const uid = userCred.user.uid;
     ```
  4. Borrar la instancia temporal:
     ```javascript
     await tempApp.delete();
     ```
  5. Escribir el documento de Tenant en Firestore: `/tenants/{tenantId}`.
  6. Escribir el documento de Usuario en Firestore: `/users/{uid}` con `role: 'admin'`.
  7. Inicializar configuraciones base de facturación y metadatos (`/artifacts/{tenantId}/public/data/finances_settings/config` y `/artifacts/{tenantId}/public/data/meta/info`).
  8. Si se marcó el checkbox, enviar el link de recuperación de contraseña:
     ```javascript
     await sendPasswordResetEmail(auth, email);
     ```
  9. Regresar a la vista `'list'`.

- [ ] **Step 3: Commit de la lógica de guardado y creación de Auth**
  ```bash
  git add src/pages/SuperAdminPage.jsx
  git commit -m "feat: implementar creación manual de inquilinos con Firebase App temporal y recuperación de contraseña"
  ```

---

### Task 4: Pruebas y Compilación

**Files:**
- Verify building of the project.

- [ ] **Step 1: Ejecutar build de producción**
  Run: `npm run build`
  Expected: Compilación exitosa sin errores de importación de Firebase o sintaxis.
