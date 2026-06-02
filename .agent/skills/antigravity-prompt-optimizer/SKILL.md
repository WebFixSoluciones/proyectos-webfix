---
name: antigravity-prompt-optimizer
description: |
  Optimizador de prompts de alta precisión para el ecosistema Antigravity. Activa este skill SIEMPRE que el usuario haga una solicitud de desarrollo, diseño, o planificación dentro de Antigravity — incluso si parece simple. Transforma peticiones vagas o redundantes en instrucciones de máxima densidad: sin ambigüedad, sin redundancia, sin preguntas de planificación. El skill deduce el contexto del proyecto desde el historial de conversación, aplica integración sistémica automática, y ejecuta directo en modo planificación. Úsalo también cuando el usuario diga "mejora este prompt", "optimiza mi solicitud", "hazlo más específico", o cuando detectes que el prompt actual puede provocar respuestas imprecisas, tokens desperdiciados, o falta de coherencia con el sistema completo.
---

# Antigravity Prompt Optimizer

## Propósito

Transformar cualquier solicitud dentro del ecosistema Antigravity en un prompt de ejecución directa que:

1. **Elimina redundancia** — cada palabra cuenta, cero repetición de intención
2. **Amplifica especificidad** — convierte ideas generales en instrucciones atómicas y ejecutables
3. **Integra contexto sistémico** — conecta la solicitud con todo el proyecto/aplicativo en curso
4. **Ahorra tokens** — densidad máxima de información por token enviado
5. **Planifica sin preguntar** — deduce el plan de implementación desde el contexto disponible y ejecuta

---

## Protocolo de activación

Este skill se activa cuando:
- El usuario está dentro del universo Antigravity (app, sistema, componente, flujo, diseño)
- El prompt actual tiene vaguedad, ambigüedad, redundancia o desconexión del sistema
- El usuario pide explícitamente optimizar/mejorar/amplificar su solicitud
- Se detecta que el prompt generaría preguntas aclaratorias innecesarias en lugar de ejecución

---

## Proceso de transformación

### FASE 1 — Lectura de contexto sistémico

Antes de reescribir, extraer desde el historial de conversación:

```
CONTEXTO_PROYECTO:
  - ¿Qué módulo/componente/pantalla se está construyendo?
  - ¿Qué stack técnico está activo? (React, Node, DB, APIs conectadas)
  - ¿Qué decisiones de arquitectura ya se tomaron?
  - ¿Qué restricciones o patrones ya existen en el sistema?
  - ¿Cuál es el estado actual del build (en progreso, nuevo, refactor)?

CONTEXTO_ANTIGRAVITY:
  - Módulos existentes y su relación con la solicitud
  - Contratos de datos ya definidos (schemas, tipos, endpoints)
  - Componentes UI ya creados y su sistema de diseño
  - Flujos de negocio activos y su lógica
```

Si el historial no tiene suficiente contexto, inferir desde patrones comunes de Antigravity y marcar los supuestos claramente al final del prompt optimizado.

---

### FASE 2 — Diagnóstico del prompt original

Analizar el prompt recibido en estas dimensiones:

| Dimensión | Problema detectado | Acción |
|---|---|---|
| **Redundancia** | Repite la misma intención | Colapsar en una sola instrucción |
| **Vaguedad** | "mejorar", "hacer bien", "que funcione" | Reemplazar con criterio medible |
| **Desconexión** | No menciona componentes relacionados | Agregar dependencias del sistema |
| **Scope creep** | Pide demasiado en un prompt | Secuenciar en pasos atómicos |
| **Ambigüedad técnica** | Términos que admiten múltiples implementaciones | Especificar stack, patrón y contrato |
| **Falta de salida esperada** | No define qué debe producir Claude | Agregar output format explícito |

---

### FASE 3 — Reescritura con plantilla maestra

Aplicar esta estructura al prompt optimizado:

```
[CONTEXTO_ACTIVO]
Sistema: {módulo o aplicativo en desarrollo}
Stack: {tecnologías activas}
Estado: {qué existe ya / qué se está construyendo}

[OBJETIVO_ÚNICO]
{Una sola intención, verbo de acción + resultado concreto}

[ESPECIFICACIONES_TÉCNICAS]
- {Requisito 1 con criterio de aceptación}
- {Requisito 2 con criterio de aceptación}
- {Requisito N — máximo 5 por prompt}

[INTEGRACIONES_REQUERIDAS]
- Conecta con: {componente/módulo/API existente}
- Respeta: {patrón de diseño o arquitectura activa}
- Extiende: {funcionalidad base ya implementada}

[SALIDA_ESPERADA]
Formato: {código / componente / schema / plan / archivo}
Criterio de completitud: {cómo saber que está listo}
```

---

### FASE 4 — Validación anti-waste

Antes de entregar el prompt optimizado, verificar:

- [ ] ¿El prompt puede ejecutarse sin preguntas adicionales? → Si no, agregar el dato faltante
- [ ] ¿Tiene más de una intención principal? → Dividir en dos prompts secuenciados
- [ ] ¿Menciona el sistema completo donde aplica? → Si no, agregar referencia
- [ ] ¿Usa palabras que Claude puede interpretar de múltiples formas? → Reemplazar con términos técnicos exactos
- [ ] ¿El output esperado está definido? → Si no, especificar formato y criterio
- [ ] ¿Tiene redundancia léxica? → Eliminar

---

## Modo de respuesta

Cuando el skill se activa, la respuesta tiene esta estructura fija:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 PROMPT ORIGINAL (diagnóstico)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{Citar el prompt original}

Problemas detectados:
→ {problema 1}
→ {problema 2}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ PROMPT OPTIMIZADO (listo para ejecutar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{Prompt reescrito con la plantilla maestra}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DELTA DE CALIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tokens estimados: {original} → {optimizado} ({%ahorro})
Especificidad: {baja/media} → alta
Integraciones añadidas: {lista}
Supuestos aplicados: {lista, si aplica}
```

---

## Reglas de oro (no negociables)

1. **Nunca preguntar el plan de implementación** — inferirlo desde el contexto y ejecutar
2. **Un prompt = una intención principal** — si hay dos, generar Prompt A y Prompt B secuenciados
3. **Cada requisito tiene criterio de aceptación** — no "que funcione", sino "que retorne X dado Y"
4. **Siempre mencionar el sistema completo** — el prompt optimizado nunca existe en el vacío
5. **Denso pero legible** — máxima información por token, pero sin sacrificar claridad técnica
6. **Modo planificación directo** — el prompt optimizado ya incluye el orden de ejecución implícito

---

## Referencia de patrones comunes en Antigravity

Ver `references/antigravity-patterns.md` para:
- Patrones de componentes recurrentes en Antigravity
- Contratos de datos estándar del sistema
- Secuencias de build más comunes
- Vocabulario técnico del ecosistema

---

## Ejemplo de transformación

**Prompt original:**
> "hazme el módulo de usuarios que funcione bien y tenga todo lo necesario para que los usuarios puedan gestionar sus cosas"

**Diagnóstico:**
→ Vaguedad extrema: "funcione bien", "todo lo necesario", "sus cosas"
→ Sin stack definido
→ Sin integración con sistema existente
→ Sin output esperado

**Prompt optimizado:**
```
[CONTEXTO_ACTIVO]
Sistema: Antigravity — módulo de gestión de usuarios
Stack: React + TypeScript (frontend), Node.js/Express (API), PostgreSQL (DB)
Estado: Nuevo módulo, integra con sistema de autenticación existente

[OBJETIVO_ÚNICO]
Crear el módulo UserManagement completo con CRUD de perfil, control de sesiones
y gestión de preferencias, integrado al AuthContext ya existente.

[ESPECIFICACIONES_TÉCNICAS]
- UserProfile: leer y actualizar nombre, email, avatar, timezone (PATCH /users/:id)
- SessionManager: listar sesiones activas, revocar por ID (GET/DELETE /users/:id/sessions)
- Preferences: toggle de notificaciones, tema UI, idioma (PATCH /users/:id/preferences)
- Validación: Zod schema en frontend + middleware de validación en API
- Error handling: respuestas tipadas con códigos HTTP correctos (400/401/404/422/500)

[INTEGRACIONES_REQUERIDAS]
- Conecta con: AuthContext (token JWT), UserStore (Zustand), DesignSystem existente
- Respeta: patrón de componentes de formulario ya establecido en el sistema
- Extiende: endpoint /users ya existente en la API

[SALIDA_ESPERADA]
Formato: Componentes React + hooks + tipos TypeScript + rutas API
Criterio de completitud: flujo completo funcional de ver/editar perfil sin errores de tipo
```

**Delta:** 28 tokens → 187 tokens de densidad útil | Especificidad: mínima → máxima | 3 integraciones añadidas
