# Antigravity — Patrones de referencia del ecosistema

Este archivo es una guía de patrones comunes, vocabulario técnico y contratos estándar
del ecosistema Antigravity. Se carga cuando el prompt a optimizar requiere contexto
específico del sistema que no está en el historial de conversación.

---

## Módulos base reconocidos en Antigravity

| Módulo | Responsabilidad | Dependencias comunes |
|---|---|---|
| Auth | Autenticación, sesiones, roles | JWT, UserStore |
| Users | Perfil, preferencias, gestión | Auth, NotificationsService |
| Dashboard | Vista principal, métricas, accesos | Todos los módulos activos |
| Settings | Configuración de sistema y usuario | Users, Auth |
| Notifications | Alertas, emails, push | UserPreferences, EventBus |
| Navigation | Routing, permisos por ruta | Auth, RoleSystem |

---

## Stack técnico estándar de Antigravity

```
Frontend:       React + TypeScript
State:          Zustand (global) + React Query (server state)
Styling:        Tailwind CSS + sistema de diseño propio
Forms:          React Hook Form + Zod validation
API Client:     Axios con interceptores de auth
Testing:        Vitest + Testing Library

Backend:        Node.js + Express (o Next.js API routes)
ORM:            Prisma
DB:             PostgreSQL
Auth:           JWT + refresh tokens
Validation:     Zod (compartido frontend/backend)
```

---

## Contratos de datos estándar

### Respuesta API exitosa
```typescript
{
  success: true,
  data: T,
  meta?: { page, total, perPage }  // en listas paginadas
}
```

### Respuesta API con error
```typescript
{
  success: false,
  error: {
    code: string,        // e.g. "USER_NOT_FOUND"
    message: string,     // mensaje human-readable
    details?: unknown    // detalle técnico opcional
  }
}
```

### Entidad User base
```typescript
{
  id: string,
  email: string,
  name: string,
  role: 'admin' | 'user' | 'viewer',
  avatar?: string,
  preferences: UserPreferences,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Patrones de componentes UI recurrentes

### Componente de formulario estándar
```
FormContainer → FormField(label, input, error) → SubmitButton
```
- Siempre con manejo de loading state
- Siempre con feedback visual de éxito/error
- Siempre con validación en tiempo real

### Patrón de página con datos remotos
```
PageLayout → DataLoader(useQuery) → [LoadingSkeleton | ErrorState | ContentView]
```

### Patrón modal de confirmación
```
TriggerButton → ConfirmModal(title, description, onConfirm, onCancel)
```

---

## Secuencias de build más comunes

### Nueva funcionalidad end-to-end
1. Definir tipos TypeScript + Zod schema
2. Crear endpoints API (ruta → controller → service → repo)
3. Crear hooks de React Query
4. Crear componentes UI
5. Integrar en la página/módulo existente
6. Agregar manejo de errores y loading states

### Nuevo módulo desde cero
1. Estructura de carpetas siguiendo convención del proyecto
2. Tipos base del módulo
3. Store Zustand si necesita estado global
4. API layer completo
5. Componentes con design system
6. Integración con Navigation/routing

### Refactor de componente existente
1. Identificar props y contratos actuales
2. Mantener interfaz pública (no romper usos existentes)
3. Refactorizar internamente
4. Actualizar tipos si cambian
5. Validar en puntos de uso existentes

---

## Vocabulario técnico del ecosistema

| Término Antigravity | Significado técnico |
|---|---|
| "módulo" | Conjunto de componentes + lógica de un dominio |
| "servicio" | Clase/función que encapsula lógica de negocio |
| "store" | Estado global Zustand de un dominio |
| "hook compuesto" | Hook que combina múltiples hooks base |
| "contrato" | TypeScript interface o Zod schema compartido |
| "flujo" | Secuencia de pasos de usuario en la UI |
| "integración" | Conexión con módulo o API externa |

---

## Criterios de completitud por tipo de tarea

| Tipo | Criterio de completitud |
|---|---|
| Componente UI | Renderiza, maneja estados (loading/error/empty), es responsive |
| Endpoint API | Responde correctamente a casos happy/error, valida inputs |
| Hook | Devuelve datos tipados, maneja loading/error, no memory leaks |
| Módulo completo | Flujo end-to-end funcional sin errores de tipo en TS |
| Refactor | Tests pasan, comportamiento externo idéntico, tipos actualizados |

---

## Supuestos a aplicar cuando falta contexto

Si el historial no especifica el stack, asumir el estándar de la tabla de arriba.
Si no se menciona qué existe, asumir que los módulos base de la tabla superior existen.
Si no se especifica formato de respuesta API, usar los contratos estándar de arriba.
Siempre marcar los supuestos aplicados en la sección "Supuestos aplicados" del output.