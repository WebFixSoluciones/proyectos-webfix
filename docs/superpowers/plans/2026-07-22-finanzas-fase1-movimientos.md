# Fase 1: Movimientos Financieros — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el corazón del módulo financiero: registro central de ingresos y egresos con partidas múltiples, abonos parciales, filtros avanzados, exportación y auditoría completa.

**Architecture:** Firebase Firestore `fin_movimientos` como colección maestra. Servicio `movimientoService.js` para CRUD con validación y auditoría. Componente `MovimientosView.jsx` con tabla, filtros, totales, y modales para crear/editar/abonar/detalle.

**Tech Stack:** React 19, Firebase Firestore, Tailwind CSS 4 (token-first), lucide-react icons.

## Global Constraints

- Zero shadows (Flat Modern Design)
- No dark mode — solo modo claro
- Token-first: usar clases del `@theme` block (`text-primary`, `bg-surface-card`, `border-border-default`, etc.)
- Radius: `rounded-card` (6px), `rounded-btn` (6px), `rounded-badge` (4px)
- No hardcoded hex (`bg-[#...]`, `text-[#...]`) — usar tokens
- No `text-[Npx]` — usar `text-xs` (11px), `text-sm` (12px), `text-base` (13px), `text-md` (14px), `text-lg` (16px), `text-xl` (18px)
- No `backdrop-blur`
- Estados UI obligatorios: skeleton (carga), empty state, error con retry, toast de éxito
- Soft delete: anular, nunca borrar físicamente
- Toda operación registra auditoría en `fin_auditoria`

---

## File Structure

```
Create:   src/services/movimientoService.js        (CRUD + validación + auditoría)
Create:   src/services/auditService.js              (registro de auditoría genérico)
Create:   src/components/finances/MovimientosView.jsx  (vista principal)
Create:   src/components/finances/MovimientoForm.jsx   (formulario crear/editar)
Create:   src/components/finances/MovimientoDetalle.jsx (modal detalle)
Create:   src/components/finances/MovimientoAbono.jsx   (modal abono parcial)
Modify:   src/components/finances/FinanceModule.jsx     (nuevo router con pestaña movimientos)
Delete:   None initially (fase 1 solo añade, no elimina archivos viejos aún)
```

---

### Task 1: Crear `auditService.js` (servicio de auditoría genérico)

**Files:**
- Create: `src/services/auditService.js`

**Produces:** `registrarAuditoria()` usado por Tasks 2-5.

- [ ] **Step 1: Crear el archivo del servicio de auditoría**

```js
// src/services/auditService.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Registra una acción de auditoría en fin_auditoria.
 * @param {object} db - Instancia de Firestore
 * @param {object} params
 * @param {string} params.coleccion - Ej: 'fin_movimientos'
 * @param {string} params.documentoId - ID del documento afectado
 * @param {string} params.accion - 'crear' | 'editar' | 'anular' | 'abonar' | 'eliminar'
 * @param {string} params.usuario - UID del usuario
 * @param {string} params.usuarioEmail - Email del usuario
 * @param {object} params.cambios - { antes: object|null, despues: object|null }
 * @param {string} params.modulo - 'ventas' | 'compras' | 'finanzas' | 'captura' | 'sri'
 */
export async function registrarAuditoria(db, params) {
  try {
    await addDoc(collection(db, 'fin_auditoria'), {
      coleccion: params.coleccion,
      documentoId: params.documentoId,
      accion: params.accion,
      usuario: params.usuario,
      usuarioEmail: params.usuarioEmail,
      fecha: serverTimestamp(),
      cambios: params.cambios || { antes: null, despues: null },
      modulo: params.modulo || 'finanzas',
      ip: null,
    });
  } catch (e) {
    console.error('[auditService] Error registrando auditoría:', e);
  }
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/services/auditService.js
git commit -m "feat: crear servicio de auditoria generico para modulo financiero"
```

---

### Task 2: Crear `movimientoService.js` (CRUD de movimientos)

**Files:**
- Create: `src/services/movimientoService.js`

**Consumes:** `registrarAuditoria` de Task 1
**Produces:** `crearMovimiento()`, `editarMovimiento()`, `anularMovimiento()`, `registrarAbono()`, `getMovimientos()`

- [ ] **Step 1: Crear el servicio de movimientos con funciones CRUD**

```js
// src/services/movimientoService.js
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query,
  where, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION = 'fin_movimientos';

/** Validar estructura mínima de un movimiento */
function validarMovimiento(data) {
  const errores = [];
  if (!data.tipo || !['ingreso', 'egreso'].includes(data.tipo)) errores.push('tipo inválido');
  if (!data.monto || data.monto <= 0) errores.push('monto debe ser > 0');
  if (!data.documento?.tipo) errores.push('tipo de documento requerido');
  if (!data.tercero?.nombre) errores.push('tercero requerido');
  if (!data.partidas?.length) errores.push('al menos una partida requerida');
  return errores;
}

/** Sanitiza el objeto antes de guardar (remueve undefined, asegura tipos) */
function sanitizar(data) {
  return {
    tipo: data.tipo,
    fecha: data.fecha || serverTimestamp(),
    fechaVencimiento: data.fechaVencimiento || null,
    monto: Number(data.monto),
    saldoPendiente: Number(data.monto),  // inicia igual al monto
    metodoPago: data.metodoPago || 'efectivo',
    documento: {
      tipo: data.documento?.tipo || 'gasto',
      numero: data.documento?.numero || '',
      claveAcceso: data.documento?.claveAcceso || null,
      urlXml: data.documento?.urlXml || null,
      urlPdf: data.documento?.urlPdf || null,
    },
    tercero: {
      id: data.tercero?.id || '',
      nombre: data.tercero?.nombre || 'CONSUMIDOR FINAL',
      ruc: data.tercero?.ruc || '9999999999999',
    },
    partidas: (data.partidas || []).map(p => ({
      cuenta: p.cuenta || '',
      centroCosto: p.centroCosto || null,
      proyecto: p.proyecto || null,
      categoria: p.categoria || 'gastos_administrativos',
      descripcion: p.descripcion || '',
      baseImponible: Number(p.baseImponible) || 0,
      iva: Number(p.iva) || 0,
      ice: Number(p.ice) || 0,
      irbpnr: Number(p.irbpnr) || 0,
      retencionFuente: Number(p.retencionFuente) || 0,
      retencionIva: Number(p.retencionIva) || 0,
      total: Number(p.total) || Number(p.baseImponible || 0) + Number(p.iva || 0),
      deducible: Boolean(p.deducible),
    })),
    pagos: data.pagos || [],
    estado: data.estado || 'pendiente',
    sriStatus: data.sriStatus || 'no_aplica',
    origen: data.origen || 'finanzas',
    origenId: data.origenId || null,
    archivos: data.archivos || [],
    notas: data.notas || '',
    creadoPor: data.creadoPor || '',
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    auditLog: [{
      accion: 'crear',
      usuario: data.creadoPor || '',
      fecha: new Date().toISOString(),
      cambios: null,
    }],
  };
}

/** Crear un nuevo movimiento */
export async function crearMovimiento(db, data, usuario) {
  const errores = validarMovimiento(data);
  if (errores.length) throw new Error('Validación: ' + errores.join(', '));
  
  const docData = sanitizar({ ...data, creadoPor: usuario.uid });
  const docRef = await addDoc(collection(db, COLLECTION), docData);
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: docRef.id,
    accion: 'crear',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    cambios: { antes: null, despues: docData },
    modulo: data.origen || 'finanzas',
  });
  
  return { id: docRef.id, ...docData };
}

/** Editar un movimiento existente (solo si origen = finanzas) */
export async function editarMovimiento(db, id, data, usuario) {
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado');
  
  const anterior = snap.data();
  if (anterior.origen !== 'finanzas') throw new Error('Solo se pueden editar movimientos creados desde Finanzas');
  
  const cambios = {
    ...data,
    actualizadoEn: serverTimestamp(),
    auditLog: [...(anterior.auditLog || []), {
      accion: 'editar',
      usuario: usuario.uid,
      fecha: new Date().toISOString(),
      cambios: { anterior: anterior, nuevo: data },
    }],
  };
  
  await updateDoc(docRef, cambios);
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: id,
    accion: 'editar',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    cambios: { antes: anterior, despues: cambios },
    modulo: 'finanzas',
  });
  
  return { id, ...cambios };
}

/** Anular un movimiento (soft delete) */
export async function anularMovimiento(db, id, usuario) {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    estado: 'anulado',
    actualizadoEn: serverTimestamp(),
    auditLog: [...(await getDoc(docRef)).data().auditLog || [], {
      accion: 'anular',
      usuario: usuario.uid,
      fecha: new Date().toISOString(),
    }],
  });
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: id,
    accion: 'anular',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    modulo: 'finanzas',
  });
}

/** Registrar un abono parcial a un movimiento */
export async function registrarAbono(db, movimientoId, abono, usuario) {
  const docRef = doc(db, COLLECTION, movimientoId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado');
  
  const mov = snap.data();
  const nuevoAbono = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    fecha: abono.fecha || new Date().toISOString(),
    monto: Number(abono.monto),
    metodoPago: abono.metodoPago || 'efectivo',
    referencia: abono.referencia || '',
    registradoPor: usuario.uid,
  };
  
  const totalAbonado = [...(mov.pagos || []), nuevoAbono].reduce((s, p) => s + Number(p.monto), 0);
  const nuevoSaldo = Math.max(0, Number(mov.monto) - totalAbonado);
  const nuevoEstado = nuevoSaldo <= 0.01 ? 'pagado' : 'parcial';
  
  await updateDoc(docRef, {
    pagos: [...(mov.pagos || []), nuevoAbono],
    saldoPendiente: nuevoSaldo,
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
    auditLog: [...(mov.auditLog || []), {
      accion: 'abonar',
      usuario: usuario.uid,
      fecha: new Date().toISOString(),
      cambios: { abono: nuevoAbono, saldoAnterior: mov.saldoPendiente, saldoNuevo: nuevoSaldo },
    }],
  });
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: movimientoId,
    accion: 'abonar',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    cambios: { abono: nuevoAbono },
    modulo: 'finanzas',
  });
  
  return { ...mov, saldoPendiente: nuevoSaldo, estado: nuevoEstado, pagos: [...(mov.pagos || []), nuevoAbono] };
}

/** Obtener movimientos con filtros */
export async function getMovimientos(db, filtros = {}) {
  const constraints = [orderBy('fecha', 'desc')];
  
  if (filtros.tipo && filtros.tipo !== 'all') constraints.push(where('tipo', '==', filtros.tipo));
  if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
  
  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  
  let movimientos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Filtros en cliente (Firestore no soporta múltiples where en campos diferentes sin índice compuesto)
  if (filtros.search) {
    const s = filtros.search.toLowerCase();
    movimientos = movimientos.filter(m =>
      m.documento?.numero?.toLowerCase().includes(s) ||
      m.tercero?.nombre?.toLowerCase().includes(s) ||
      m.tercero?.ruc?.includes(s) ||
      m.partidas?.some(p => p.descripcion?.toLowerCase().includes(s))
    );
  }
  
  if (filtros.metodoPago && filtros.metodoPago !== 'all') {
    movimientos = movimientos.filter(m => m.metodoPago === filtros.metodoPago);
  }
  
  if (filtros.categoria && filtros.categoria !== 'all') {
    movimientos = movimientos.filter(m =>
      m.partidas?.some(p => p.categoria === filtros.categoria)
    );
  }
  
  if (filtros.fechaDesde) {
    movimientos = movimientos.filter(m => {
      const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
      return f >= new Date(filtros.fechaDesde);
    });
  }
  
  if (filtros.fechaHasta) {
    movimientos = movimientos.filter(m => {
      const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
      return f <= new Date(filtros.fechaHasta + 'T23:59:59');
    });
  }
  
  return movimientos;
}

/** Obtener resumen para KPI cards */
export function getResumen(movimientos) {
  const ingresos = movimientos
    .filter(m => m.tipo === 'ingreso' && m.estado !== 'anulado')
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = movimientos
    .filter(m => m.tipo === 'egreso' && m.estado !== 'anulado')
    .reduce((s, m) => s + Number(m.monto), 0);
  
  return {
    totalIngresos: ingresos,
    totalEgresos: egresos,
    saldoNeto: ingresos - egresos,
    conteo: movimientos.filter(m => m.estado !== 'anulado').length,
  };
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/services/movimientoService.js
git commit -m "feat: crear servicio CRUD de movimientos financieros con validacion y auditoria"
```

---

### Task 3: Crear `MovimientoForm.jsx` (formulario crear/editar)

**Files:**
- Create: `src/components/finances/MovimientoForm.jsx`

**Consumes:** `crearMovimiento`, `editarMovimiento` de Task 2
**Produces:** Componente `<MovimientoForm>` usado por Tasks 4 y 5

- [ ] **Step 1: Crear el componente del formulario modal**

```jsx
// src/components/finances/MovimientoForm.jsx
import { useState, useEffect } from 'react';
import { X, Plus, Minus, Save } from 'lucide-react';
import { crearMovimiento, editarMovimiento } from '../../services/movimientoService';

const TIPOS_DOCUMENTO = [
  { id: 'factura', label: 'Factura' },
  { id: 'nota_venta', label: 'Nota de Venta' },
  { id: 'nota_credito', label: 'Nota de Crédito' },
  { id: 'nota_debito', label: 'Nota de Débito' },
  { id: 'retencion', label: 'Retención' },
  { id: 'liquidacion', label: 'Liquidación de Compra' },
  { id: 'gasto', label: 'Gasto' },
  { id: 'ingreso_vario', label: 'Ingreso Varios' },
  { id: 'gasto_hormiga', label: 'Gasto Hormiga' },
];

const CATEGORIAS = [
  'gastos_administrativos', 'costos', 'marketing', 'activos',
  'impuestos', 'nomina', 'servicios_basicos', 'transporte',
  'alimentacion', 'suministros', 'mantenimiento', 'otro',
];

const METODOS_PAGO = [
  'efectivo', 'transferencia', 'tarjeta_credito',
  'tarjeta_debito', 'cheque', 'cruce_cuentas', 'otro',
];

const PARTIDA_VACIA = {
  cuenta: '',
  centroCosto: '',
  proyecto: '',
  categoria: 'gastos_administrativos',
  descripcion: '',
  baseImponible: 0,
  iva: 0,
  ice: 0,
  irbpnr: 0,
  retencionFuente: 0,
  retencionIva: 0,
  total: 0,
  deducible: true,
};

export default function MovimientoForm({ onClose, onSave, movimiento, db, usuario, showToast }) {
  const esEdicion = !!movimiento?.id;
  
  const [formData, setFormData] = useState({
    tipo: movimiento?.tipo || 'egreso',
    fecha: movimiento?.fecha ? new Date(movimiento.fecha.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    fechaVencimiento: movimiento?.fechaVencimiento?.toDate ? new Date(movimiento.fechaVencimiento.toDate()).toISOString().split('T')[0] : '',
    monto: movimiento?.monto || 0,
    metodoPago: movimiento?.metodoPago || 'efectivo',
    documento: movimiento?.documento || { tipo: 'gasto', numero: '', claveAcceso: '' },
    tercero: movimiento?.tercero || { id: '', nombre: '', ruc: '' },
    partidas: movimiento?.partidas?.length ? movimiento.partidas : [{ ...PARTIDA_VACIA }],
    notas: movimiento?.notas || '',
    archivos: movimiento?.archivos || [],
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleDocumentoChange = (field, value) => {
    setFormData(prev => ({ ...prev, documento: { ...prev.documento, [field]: value } }));
  };

  const handleTerceroChange = (field, value) => {
    setFormData(prev => ({ ...prev, tercero: { ...prev.tercero, [field]: value } }));
  };

  const handlePartidaChange = (index, field, value) => {
    const partidas = [...formData.partidas];
    partidas[index] = { ...partidas[index], [field]: value };
    
    // Recalcular total de la partida
    if (['baseImponible', 'iva', 'ice', 'irbpnr', 'retencionFuente', 'retencionIva'].includes(field)) {
      const p = partidas[index];
      p.total = (Number(p.baseImponible) || 0) + (Number(p.iva) || 0) + (Number(p.ice) || 0)
        - (Number(p.retencionFuente) || 0) - (Number(p.retencionIva) || 0) - (Number(p.irbpnr) || 0);
    }
    
    setFormData(prev => ({ ...prev, partidas }));
  };

  const addPartida = () => {
    setFormData(prev => ({ ...prev, partidas: [...prev.partidas, { ...PARTIDA_VACIA }] }));
  };

  const removePartida = (index) => {
    if (formData.partidas.length <= 1) return;
    setFormData(prev => ({ ...prev, partidas: prev.partidas.filter((_, i) => i !== index) }));
  };

  // Recalcular monto total desde partidas
  useEffect(() => {
    const total = formData.partidas.reduce((s, p) => s + (Number(p.total) || 0), 0);
    setFormData(prev => ({ ...prev, monto: total }));
  }, [formData.partidas]);

  const validate = () => {
    const errs = {};
    if (!formData.tercero.nombre && formData.tipo !== 'ingreso_vario') errs.tercero = 'Requerido';
    if (formData.partidas.some(p => !p.descripcion)) errs.partidas = 'Todas las partidas necesitan descripción';
    if (formData.monto <= 0) errs.monto = 'El total debe ser mayor a 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    
    try {
      if (esEdicion) {
        await editarMovimiento(db, movimiento.id, formData, usuario);
      } else {
        await crearMovimiento(db, formData, usuario);
      }
      showToast(esEdicion ? 'Movimiento actualizado' : 'Movimiento creado', 'success');
      onSave();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      <div className="bg-surface-card border border-border-default rounded-card w-full max-w-2xl mx-4 shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-lg font-semibold text-text-primary">
            {esEdicion ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h2>
          <button onClick={onClose} className="btn-icon text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Tipo (Ingreso/Egreso) */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Tipo</label>
            <div className="flex gap-2">
              {['ingreso', 'egreso'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChange('tipo', t)}
                  className={`flex-1 py-2 px-3 rounded-btn text-sm font-medium border transition-colors ${
                    formData.tipo === t
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-primary border-border-default hover:bg-primary-light'
                  }`}
                >
                  {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha + Vencimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Fecha</label>
              <input type="date" value={formData.fecha} onChange={e => handleChange('fecha', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/25" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Vencimiento (opcional)</label>
              <input type="date" value={formData.fechaVencimiento} onChange={e => handleChange('fechaVencimiento', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/25" />
            </div>
          </div>

          {/* Documento */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Tipo de Documento</label>
              <select value={formData.documento.tipo} onChange={e => handleDocumentoChange('tipo', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
                {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Número</label>
              <input type="text" value={formData.documento.numero} onChange={e => handleDocumentoChange('numero', e.target.value)}
                placeholder="001-001-0000001" className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Método de Pago</label>
              <select value={formData.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Tercero */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="text-xs font-medium text-text-secondary mb-1 block">RUC/CI</label>
              <input type="text" value={formData.tercero.ruc} onChange={e => handleTerceroChange('ruc', e.target.value)}
                placeholder="9999999999999" className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Nombre/Razón Social</label>
              <input type="text" value={formData.tercero.nombre} onChange={e => handleTerceroChange('nombre', e.target.value)}
                placeholder={formData.tipo === 'ingreso' ? 'Nombre del cliente' : 'Nombre del proveedor'} className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
              {errors.tercero && <span className="text-xs text-error mt-0.5">{errors.tercero}</span>}
            </div>
          </div>

          {/* Partidas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">Partidas</label>
              <button type="button" onClick={addPartida}
                className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                <Plus size={14} /> Agregar partida
              </button>
            </div>
            {errors.partidas && <span className="text-xs text-error block mb-2">{errors.partidas}</span>}
            
            <div className="space-y-3">
              {formData.partidas.map((partida, idx) => (
                <div key={idx} className="border border-border-default rounded-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-secondary">Partida {idx + 1}</span>
                    {formData.partidas.length > 1 && (
                      <button type="button" onClick={() => removePartida(idx)}
                        className="text-error hover:text-error/80">
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input type="text" value={partida.descripcion}
                        onChange={e => handlePartidaChange(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción de la partida"
                        className="w-full px-3 py-1.5 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <select value={partida.categoria}
                        onChange={e => handlePartidaChange(idx, 'categoria', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary">
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <input type="number" step="0.01" value={partida.baseImponible || ''}
                        onChange={e => handlePartidaChange(idx, 'baseImponible', e.target.value)}
                        placeholder="Base imponible"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <input type="number" step="0.01" value={partida.iva || ''}
                        onChange={e => handlePartidaChange(idx, 'iva', e.target.value)}
                        placeholder="IVA"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <input type="number" step="0.01" value={partida.retencionFuente || ''}
                        onChange={e => handlePartidaChange(idx, 'retencionFuente', e.target.value)}
                        placeholder="Ret. Fuente"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs text-text-secondary">
                        <input type="checkbox" checked={partida.deducible}
                          onChange={e => handlePartidaChange(idx, 'deducible', e.target.checked)} />
                        Deducible
                      </label>
                    </div>
                    <div>
                      <input type="text" value={partida.centroCosto || ''}
                        onChange={e => handlePartidaChange(idx, 'centroCosto', e.target.value)}
                        placeholder="Centro de costo"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-text-primary">
                    Total partida: ${(Number(partida.total) || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monto Total */}
          <div className="bg-primary-light rounded-card p-3 text-center">
            <span className="text-xs text-text-secondary">Total del movimiento</span>
            <div className="text-xl font-bold text-primary">
              ${(Number(formData.monto) || 0).toFixed(2)}
            </div>
            {errors.monto && <span className="text-xs text-error">{errors.monto}</span>}
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Notas (opcional)</label>
            <textarea value={formData.notas} onChange={e => handleChange('notas', e.target.value)}
              rows={2} placeholder="Observaciones del movimiento..."
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary resize-none" />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-btn hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save size={16} /> {saving ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear Movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/finances/MovimientoForm.jsx
git commit -m "feat: crear formulario modal para movimientos financieros"
```

---

### Task 4: Crear `MovimientoAbono.jsx` (modal de abono parcial)

**Files:**
- Create: `src/components/finances/MovimientoAbono.jsx`

**Consumes:** `registrarAbono` de Task 2
**Produces:** Componente `<MovimientoAbono>` usado por Task 5

- [ ] **Step 1: Crear modal de abono parcial**

```jsx
// src/components/finances/MovimientoAbono.jsx
import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { registrarAbono } from '../../services/movimientoService';

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'cruce_cuentas', 'otro'];

export default function MovimientoAbono({ movimiento, onClose, onSave, db, usuario, showToast }) {
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const saldoPendiente = Number(movimiento.saldoPendiente) || 0;
  const montoNumerico = Number(monto) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (montoNumerico <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (montoNumerico > saldoPendiente) { setError('El abono no puede superar el saldo pendiente'); return; }
    
    setSaving(true);
    try {
      await registrarAbono(db, movimiento.id, {
        monto: montoNumerico,
        metodoPago,
        referencia,
        fecha: new Date().toISOString(),
      }, usuario);
      
      showToast('Abono registrado correctamente', 'success');
      onSave();
    } catch (err) {
      showToast('Error al registrar abono: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center">
      <div className="bg-surface-card border border-border-default rounded-card w-full max-w-sm mx-4 shadow-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h3 className="text-md font-semibold text-text-primary">Registrar Abono</h3>
          <button onClick={onClose} className="btn-icon text-text-secondary"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Info del documento */}
          <div className="bg-surface-sidebar rounded-card p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Documento:</span>
              <span className="text-text-primary font-medium">{movimiento.documento?.tipo} #{movimiento.documento?.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tercero:</span>
              <span className="text-text-primary">{movimiento.tercero?.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Monto total:</span>
              <span className="text-text-primary font-semibold">${Number(movimiento.monto).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border-default pt-2 mt-2">
              <span className="text-text-secondary">Saldo pendiente:</span>
              <span className="text-warning font-bold">${saldoPendiente.toFixed(2)}</span>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Monto del abono</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="number" step="0.01" value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            {error && <span className="text-xs text-error mt-1">{error}</span>}
          </div>

          {/* Método de pago */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Método de pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Referencia */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Referencia</label>
            <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder="N° de comprobante, transferencia..."
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-white rounded-btn hover:bg-primary-hover transition-colors disabled:opacity-50">
              {saving ? 'Registrando...' : 'Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/finances/MovimientoAbono.jsx
git commit -m "feat: crear modal de abono parcial para movimientos financieros"
```

---

### Task 5: Crear `MovimientoDetalle.jsx` (modal de detalle completo)

**Files:**
- Create: `src/components/finances/MovimientoDetalle.jsx`

**Produces:** Componente `<MovimientoDetalle>` usado por Task 6

- [ ] **Step 1: Crear modal de detalle**

```jsx
// src/components/finances/MovimientoDetalle.jsx
import { X, Calendar, User, FileText, CreditCard, Banknote, Clock, History } from 'lucide-react';

const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  anulado: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
};

const TIPO_BADGES = {
  ingreso: 'bg-status-authorized-bg text-status-authorized-text',
  egreso: 'bg-status-rejected-bg text-status-rejected-text',
};

export default function MovimientoDetalle({ movimiento, onClose }) {
  const m = movimiento;
  const totalAbonado = (m.pagos || []).reduce((s, p) => s + Number(p.monto), 0);

  const formatDate = (d) => {
    if (!d) return '-';
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-[105] bg-black/50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      <div className="bg-surface-card border border-border-default rounded-card w-full max-w-2xl mx-4 shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Detalle del Movimiento</h2>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-badge ${TIPO_BADGES[m.tipo]}`}>
              {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
            </span>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[m.estado]}`}>
              {m.estado}
            </span>
          </div>
          <button onClick={onClose} className="btn-icon text-text-secondary"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2"><Calendar size={14} className="text-text-muted" /><span className="text-text-secondary">Fecha:</span><span className="text-text-primary font-medium">{formatDate(m.fecha)}</span></div>
            <div className="flex items-center gap-2"><Calendar size={14} className="text-text-muted" /><span className="text-text-secondary">Vencimiento:</span><span className="text-text-primary">{formatDate(m.fechaVencimiento)}</span></div>
            <div className="flex items-center gap-2"><FileText size={14} className="text-text-muted" /><span className="text-text-secondary">Documento:</span><span className="text-text-primary font-medium">{m.documento?.tipo} #{m.documento?.numero}</span></div>
            <div className="flex items-center gap-2"><CreditCard size={14} className="text-text-muted" /><span className="text-text-secondary">Método:</span><span className="text-text-primary capitalize">{m.metodoPago?.replace('_', ' ')}</span></div>
            <div className="flex items-center gap-2"><User size={14} className="text-text-muted" /><span className="text-text-secondary">Tercero:</span><span className="text-text-primary font-medium">{m.tercero?.nombre}</span></div>
            <div className="flex items-center gap-2"><Banknote size={14} className="text-text-muted" /><span className="text-text-secondary">RUC:</span><span className="text-text-primary">{m.tercero?.ruc}</span></div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-sidebar rounded-card p-3 text-center">
              <div className="text-xs text-text-secondary">Monto Total</div>
              <div className="text-lg font-bold text-text-primary">{formatCurrency(m.monto)}</div>
            </div>
            <div className="bg-status-authorized-bg rounded-card p-3 text-center">
              <div className="text-xs text-text-secondary">Abonado</div>
              <div className="text-lg font-bold text-success">{formatCurrency(totalAbonado)}</div>
            </div>
            <div className={`rounded-card p-3 text-center ${Number(m.saldoPendiente) > 0 ? 'bg-warning-light' : 'bg-status-authorized-bg'}`}>
              <div className="text-xs text-text-secondary">Saldo Pendiente</div>
              <div className={`text-lg font-bold ${Number(m.saldoPendiente) > 0 ? 'text-warning' : 'text-success'}`}>
                {formatCurrency(m.saldoPendiente)}
              </div>
            </div>
          </div>

          {/* Partidas */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Partidas</h3>
            <div className="border border-border-default rounded-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-sidebar border-b border-border-default">
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Categoría</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Base</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">IVA</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Ret.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(m.partidas || []).map((p, i) => (
                    <tr key={i} className="border-b border-border-default last:border-0">
                      <td className="px-3 py-2 text-text-primary">{p.descripcion}</td>
                      <td className="px-3 py-2 text-text-secondary text-xs">{p.categoria?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{formatCurrency(p.baseImponible)}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{formatCurrency(p.iva)}</td>
                      <td className="px-3 py-2 text-right text-error">{formatCurrency(p.retencionFuente + p.retencionIva)}</td>
                      <td className="px-3 py-2 text-right font-medium text-text-primary">{formatCurrency(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historial de abonos */}
          {(m.pagos || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1"><History size={14} /> Historial de Abonos</h3>
              <div className="border border-border-default rounded-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-sidebar border-b border-border-default">
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Método</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Referencia</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(m.pagos || []).map((p, i) => (
                      <tr key={i} className="border-b border-border-default last:border-0">
                        <td className="px-3 py-2 text-text-primary">{formatDate(p.fecha)}</td>
                        <td className="px-3 py-2 text-text-secondary text-xs capitalize">{p.metodoPago?.replace('_', ' ')}</td>
                        <td className="px-3 py-2 text-text-primary">{p.referencia || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium text-success">{formatCurrency(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notas */}
          {m.notas && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Notas</h3>
              <p className="text-sm text-text-secondary bg-surface-sidebar rounded-card p-3">{m.notas}</p>
            </div>
          )}

          {/* Auditoría */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1"><Clock size={14} /> Auditoría</h3>
            <div className="space-y-1">
              {(m.auditLog || []).slice(-5).reverse().map((log, i) => (
                <div key={i} className="text-xs text-text-secondary flex justify-between bg-surface-sidebar rounded-card px-3 py-1.5">
                  <span><span className="font-medium text-text-primary">{log.accion}</span> por {log.usuario}</span>
                  <span>{formatDate(log.fecha)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-border-default">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/finances/MovimientoDetalle.jsx
git commit -m "feat: crear modal de detalle completo para movimientos financieros"
```

---

### Task 6: Crear `MovimientosView.jsx` (vista principal con tabla, filtros, KPIs)

**Files:**
- Create: `src/components/finances/MovimientosView.jsx`

**Consumes:** `getMovimientos`, `getResumen`, `anularMovimiento` de Task 2. `<MovimientoForm>` de Task 3, `<MovimientoAbono>` de Task 4, `<MovimientoDetalle>` de Task 5.
**Produces:** Componente principal usado por Task 7

- [ ] **Step 1: Crear la vista principal de movimientos**

```jsx
// src/components/finances/MovimientosView.jsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, FileText, Eye, Edit2, Trash2, Wallet, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { getMovimientos, getResumen, anularMovimiento } from '../../services/movimientoService';
import MovimientoForm from './MovimientoForm';
import MovimientoAbono from './MovimientoAbono';
import MovimientoDetalle from './MovimientoDetalle';

const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  anulado: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
};

const FILTROS_DEFAULT = {
  search: '',
  tipo: 'all',
  estado: 'all',
  metodoPago: 'all',
  categoria: 'all',
  fechaDesde: '',
  fechaHasta: '',
  mes: '',
  año: '',
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function MovimientosView({ db, usuario, showToast }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_DEFAULT);
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [showAbono, setShowAbono] = useState(null);
  const [showDetalle, setShowDetalle] = useState(null);

  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovimientos(db, filtros);
      setMovimientos(data);
    } catch (err) {
      setError('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [db, filtros]);

  useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

  const handleSave = () => {
    setShowForm(false);
    setEditingMov(null);
    cargarMovimientos();
  };

  const handleAbonoSave = () => {
    setShowAbono(null);
    cargarMovimientos();
  };

  const handleAnular = async (id) => {
    if (!window.confirm('¿Anular este movimiento? Esta acción no se puede deshacer.')) return;
    try {
      await anularMovimiento(db, id, usuario);
      showToast('Movimiento anulado', 'success');
      cargarMovimientos();
    } catch (err) {
      showToast('Error al anular: ' + err.message, 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Fecha','Tipo','Documento','Número','Tercero','RUC','Monto','Abonado','Saldo','Estado','Método','Categoría'];
    const rows = movimientos.map(m => [
      new Date(m.fecha?.toDate?.() || m.fecha).toLocaleDateString('es-EC'),
      m.tipo,
      m.documento?.tipo,
      m.documento?.numero,
      m.tercero?.nombre,
      m.tercero?.ruc,
      Number(m.monto).toFixed(2),
      (m.pagos || []).reduce((s, p) => s + Number(p.monto), 0).toFixed(2),
      Number(m.saldoPendiente).toFixed(2),
      m.estado,
      m.metodoPago,
      m.partidas?.[0]?.categoria || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const resumen = getResumen(movimientos);
  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : new Date(d).toLocaleDateString('es-EC');

  // Estados de la vista
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}
        </div>
        {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-sidebar rounded-card" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error text-lg mb-2">Error al cargar los movimientos</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargarMovimientos} className="px-4 py-2 bg-primary text-white rounded-btn text-sm font-medium">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <TrendingUp size={14} className="text-success" /> Ingresos del período
          </div>
          <div className="text-xl font-bold text-success">{formatCurrency(resumen.totalIngresos)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <TrendingDown size={14} className="text-error" /> Egresos del período
          </div>
          <div className="text-xl font-bold text-error">{formatCurrency(resumen.totalEgresos)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <DollarSign size={14} className="text-primary" /> Saldo neto
          </div>
          <div className={`text-xl font-bold ${resumen.saldoNeto >= 0 ? 'text-primary' : 'text-error'}`}>
            {formatCurrency(resumen.saldoNeto)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por documento, tercero, RUC..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>

          {/* Tipo */}
          <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
            <option value="all">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>

          {/* Estado */}
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </select>

          {/* Fecha desde/hasta */}
          <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />

          {/* Acciones */}
          <button onClick={handleExportCsv}
            className="px-3 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors flex items-center gap-1">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { setEditingMov(null); setShowForm(true); }}
            className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-btn hover:bg-primary-hover transition-colors flex items-center gap-1">
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        {movimientos.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary mb-1">No hay movimientos registrados</p>
            <p className="text-text-muted text-sm mb-4">Crea el primer ingreso o gasto para empezar</p>
            <button onClick={() => { setEditingMov(null); setShowForm(true); }}
              className="px-4 py-2 bg-primary text-white rounded-btn text-sm font-medium flex items-center gap-1 mx-auto">
              <Plus size={14} /> Nuevo Movimiento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sidebar border-b border-border-default">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Documento</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Tercero</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Categoría</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary hidden md:table-cell">Saldo</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(mov => {
                  const abonado = (mov.pagos || []).reduce((s, p) => s + Number(p.monto), 0);
                  return (
                    <tr key={mov.id} className="border-b border-border-default hover:bg-primary-light/30 transition-colors">
                      <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{formatDate(mov.fecha)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-badge ${mov.tipo === 'ingreso' ? 'bg-status-authorized-bg text-status-authorized-text' : 'bg-status-rejected-bg text-status-rejected-text'}`}>
                          {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-primary text-xs">{mov.documento?.tipo}<br /><span className="text-text-muted">{mov.documento?.numero}</span></td>
                      <td className="px-3 py-2.5 text-text-primary text-xs">{mov.tercero?.nombre}<br /><span className="text-text-muted">{mov.tercero?.ruc}</span></td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="inline-flex px-1.5 py-0.5 text-xs rounded-badge bg-surface-sidebar text-text-secondary">
                          {mov.partidas?.[0]?.categoria?.replace(/_/g, ' ') || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-primary">{formatCurrency(mov.monto)}</td>
                      <td className="px-3 py-2.5 text-right hidden md:table-cell">
                        <span className={Number(mov.saldoPendiente) > 0 ? 'text-warning font-medium' : 'text-text-muted'}>
                          {formatCurrency(mov.saldoPendiente)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[mov.estado]}`}>
                          {mov.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowDetalle(mov)} title="Ver detalle" className="btn-icon w-7 h-7"><Eye size={14} /></button>
                          {mov.origen === 'finanzas' && mov.estado !== 'anulado' && (
                            <button onClick={() => { setEditingMov(mov); setShowForm(true); }} title="Editar" className="btn-icon w-7 h-7"><Edit2 size={14} /></button>
                          )}
                          {(mov.estado === 'pendiente' || mov.estado === 'parcial') && (
                            <button onClick={() => setShowAbono(mov)} title="Abonar" className="btn-icon w-7 h-7"><Wallet size={14} /></button>
                          )}
                          {mov.estado !== 'anulado' && (
                            <button onClick={() => handleAnular(mov.id)} title="Anular" className="btn-icon w-7 h-7 text-error"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {showForm && (
        <MovimientoForm
          movimiento={editingMov}
          onClose={() => { setShowForm(false); setEditingMov(null); }}
          onSave={handleSave}
          db={db}
          usuario={usuario}
          showToast={showToast}
        />
      )}

      {showAbono && (
        <MovimientoAbono
          movimiento={showAbono}
          onClose={() => setShowAbono(null)}
          onSave={handleAbonoSave}
          db={db}
          usuario={usuario}
          showToast={showToast}
        />
      )}

      {showDetalle && (
        <MovimientoDetalle
          movimiento={showDetalle}
          onClose={() => setShowDetalle(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/finances/MovimientosView.jsx
git commit -m "feat: crear vista principal de movimientos financieros con tabla, filtros y KPIs"
```

---

### Task 7: Conectar en `FinanceModule.jsx` como nueva pestaña

**Files:**
- Modify: `src/components/finances/FinanceModule.jsx`

**Consumes:** `<MovimientosView>` de Task 6

- [ ] **Step 1: Agregar pestaña "Movimientos" al FinanceModule**

Leer el archivo `src/components/finances/FinanceModule.jsx`. Encontrar el array de pestañas (la función que retorna tabs según el `mode`). Agregar una nueva tab `movimientos` al inicio que renderice `<MovimientosView>`.

```diff
+ import MovimientosView from './MovimientosView';
```

En la sección donde se renderizan los tabs, agregar:

```jsx
{activeTab === 'movimientos' && (
  <MovimientosView db={db} usuario={usuario} showToast={showToast} />
)}
```

En la definición de tabs (donde `mode === 'contabilidad'`), agregar al inicio:

```jsx
{ id: 'movimientos', label: 'Movimientos', icon: DollarSign },
```

La pestaña por defecto al entrar a Finanzas debe ser `movimientos`.

- [ ] **Step 2: Verificar build + lint**

```bash
npm run lint
npm run build
```
Expected: Sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/finances/FinanceModule.jsx
git commit -m "feat: conectar vista de movimientos financieros como pestaña principal"
```

---

### Task 8: Build final y verificación completa

- [ ] **Step 1: Ejecutar lint y build final**

```bash
npm run lint
npm run build
```
Expected: Ambos sin errores.

- [ ] **Step 2: Verificar archivos creados**

```bash
ls -la src/services/auditService.js src/services/movimientoService.js src/components/finances/MovimientosView.jsx src/components/finances/MovimientoForm.jsx src/components/finances/MovimientoDetalle.jsx src/components/finances/MovimientoAbono.jsx
```
Expected: Los 6 archivos existen.

- [ ] **Step 3: Commit final de la fase**

```bash
git add -A
git commit -m "feat: completar Fase 1 - modulo de movimientos financieros con CRUD, abonos, filtros y auditoria"
```
